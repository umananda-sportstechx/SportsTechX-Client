'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseBrowser } from '@/lib/supabase/client';
import { logoutState } from '@/lib/logout-state';
import { enableQueryPolling } from '@/lib/query-client';
import { Button } from '@/components/atlas';
import { AuthQuotes } from '@/components/auth/auth-quotes';
import { OAuthButtons } from '@/components/auth/oauth-buttons';
import { AuthNotice, AuthOr, AuthSplit, AuthSpinner, AuthThemeToggle } from '@/components/auth/auth-shell';

/**
 * Log in.
 *
 * Presentation only was changed here: this used to carry its own palette
 * (`--atlas-*`, the superseded Raise prototype's tokens), its own field CSS in a
 * `<style jsx global>` block, and its own copy of the OAuth buttons. All three
 * are gone — the frame is `AuthSplit`, the tokens are `--a-*` from the route
 * layout, and the providers come from the shared `OAuthButtons`.
 *
 * There is no Atlas mockup for login (the Scout v2 prototype only has signup, and
 * its "Log in" link jumps straight into the app), so the copy below is the
 * approved wording from the Raise wireframe and the layout mirrors signup.
 */
export default function LoginPage() {
	const router = useRouter();
	const params = useSearchParams();
	const redirectTo = params.get('redirectTo') ?? '/app';
	const reason = params.get('reason');
	const notice = params.get('message');

	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState('');
	const [message, setMessage] = useState('');
	const [loading, setLoading] = useState(false);
	// True when the URL hash carries a Supabase OTP-expired error — we show
	// an inline "Resend confirmation email" CTA next to the error banner.
	const [showResend, setShowResend] = useState(false);

	useEffect(() => {
		// Enable query polling on login page mount (recovery after logout)
		if (!logoutState.isLoggingOut()) enableQueryPolling();
		if (reason === 'session_expired') setError('Your session expired. Please sign in again.');
		// reset-password sends us here with ?message=password_updated. Nothing read
		// it before, so a successful reset landed on a silent login screen.
		if (notice === 'password_updated') setMessage('Password updated. Sign in with your new password.');

		// Supabase's verify endpoint encodes errors in the URL HASH fragment
		// (e.g. #error=access_denied&error_code=otp_expired&error_description=…).
		// Most commonly this fires because the single-use OTP was consumed by
		// an email link-preview (Gmail/Slack/antivirus all prefetch URLs in
		// mails), so by the time the user actually clicks the link, it's gone.
		// Parse the fragment, show a useful message, and offer a one-click
		// resend instead of leaving them staring at "auth_callback_failed".
		if (typeof window !== 'undefined' && window.location.hash) {
			const h = new URLSearchParams(window.location.hash.replace(/^#/, ''));
			const code = h.get('error_code');
			const desc = h.get('error_description');
			if (code === 'otp_expired') {
				setError('Your confirmation link expired or was already used. Enter your email below and resend it.');
				setShowResend(true);
				// Strip the hash so a reload doesn't keep showing the same message.
				const u = new URL(window.location.href);
				u.hash = '';
				window.history.replaceState({}, '', u.toString());
			} else if (code) {
				setError(desc?.replace(/\+/g, ' ') ?? 'Authentication failed. Please try again.');
				const u = new URL(window.location.href);
				u.hash = '';
				window.history.replaceState({}, '', u.toString());
			}
		}
	}, [reason, notice]);

	const supabase = getSupabaseBrowser();

	const callPostLogin = async (token: string) => {
		try {
			await fetch('/api/auth/post-login', {
				method: 'POST',
				headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
			});
		} catch { /* non-blocking */ }
	};

	const handleLogin = async (e: React.FormEvent) => {
		e.preventDefault();
		setError('');
		setLoading(true);
		try {
			const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
			if (err) { setError(err.message); return; }
			if (data.session) {
				await callPostLogin(data.session.access_token);
				router.push(redirectTo);
			}
		} finally {
			setLoading(false);
		}
	};

	const handleForgotPassword = async () => {
		if (!email) { setError('Enter your email address first.'); return; }
		setLoading(true);
		const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
			redirectTo: `${window.location.origin}/reset-password`,
		});
		if (err) setError(err.message);
		else setMessage('Password reset email sent!');
		setLoading(false);
	};

	const handleResendConfirmation = async () => {
		if (!email) { setError('Enter the email you signed up with first.'); return; }
		setLoading(true);
		setError('');
		setMessage('');
		const { error: err } = await supabase.auth.resend({
			type: 'signup',
			email,
			options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
		});
		if (err) {
			setError(err.message);
		} else {
			setMessage('New confirmation email sent. Check your inbox.');
			setShowResend(false);
		}
		setLoading(false);
	};

	return (
		<>
			<AuthThemeToggle />
			<AuthSplit panel={<AuthQuotes />}>
				<div>
					<h1 className="auth-form__title">Log in to your account</h1>
					<p className="auth-form__sub">Welcome back. Enter your details to continue.</p>
				</div>

				{error && (
					<AuthNotice
						tone="error"
						action={showResend ? (
							<Button variant="outline" size="sm" type="button" onClick={handleResendConfirmation} disabled={loading}>
								{loading && <AuthSpinner />}
								Resend confirmation email
							</Button>
						) : undefined}
					>
						{error}
					</AuthNotice>
				)}
				{message && <AuthNotice tone="ok">{message}</AuthNotice>}

				<OAuthButtons redirectTo={redirectTo} onError={setError} disabled={loading} />
				<AuthOr />

				<form onSubmit={handleLogin} className="auth-fields">
					<div>
						<label htmlFor="login-email" className="atlas-label">Email</label>
						<input
							id="login-email"
							type="email"
							placeholder="name@company.com"
							value={email}
							onChange={e => setEmail(e.target.value)}
							required
							className="atlas-input"
						/>
					</div>
					<div>
						<div className="auth-field__row">
							<label htmlFor="login-password" className="atlas-label">Password</label>
							<button type="button" className="auth-link-btn" onClick={handleForgotPassword} disabled={loading}>
								Forgot password?
							</button>
						</div>
						<input
							id="login-password"
							type="password"
							placeholder="Enter your password"
							value={password}
							onChange={e => setPassword(e.target.value)}
							required
							className="atlas-input"
						/>
					</div>

					<Button type="submit" className="auth-btn" disabled={loading}>
						{loading && <AuthSpinner />}
						Log in
					</Button>
				</form>

				<p className="auth-form__alt">
					Don&apos;t have an account? <Link href="/signup">Sign up</Link>
				</p>
			</AuthSplit>
		</>
	);
}
