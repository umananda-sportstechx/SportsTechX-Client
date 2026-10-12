'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseBrowser } from '@/lib/supabase/client';
import { safeRedirect } from '@/lib/safe-redirect';
import { callPostLogin } from '@/lib/post-login';
import { Button } from '@/components/atlas';
import { OAuthButtons } from '@/components/auth/oauth-buttons';
import { AuthNotice, AuthOr, AuthSplit, AuthSpinner, AuthThemeToggle, PasswordField } from '@/components/auth/auth-shell';
import { AuthSidePanel } from '@/components/auth/auth-quotes';

/**
 * Create an account.
 *
 * The one pre-login screen with an approved Atlas-token design (the Scout v2
 * prototype), so the structure, field order, labels, placeholders and legal line
 * come from it. Two deliberate departures: the mockup is the *Scout* signup
 * ("Create your Atlas Scout account", "For investors, funds and corporate
 * venture teams"), while this form serves every tier — so the heading and the
 * value props are generalised; and it keeps the full-name and confirm-password
 * fields this form has always had, which the mockup omits.
 *
 * Replaces a 40/60 split on the legacy shadcn kit.
 */
export default function SignupPage() {
	const router = useRouter();
	const params = useSearchParams();
	const redirectTo = safeRedirect(params.get('redirectTo'));

	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [fullName, setFullName] = useState('');
	const [error, setError] = useState('');
	const [message, setMessage] = useState('');
	const [loading, setLoading] = useState(false);

	const supabase = getSupabaseBrowser();

	const handleSignup = async (e: React.FormEvent) => {
		e.preventDefault();
		setError('');
		if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
		if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
		setLoading(true);
		try {
			const { data, error: err } = await supabase.auth.signUp({
				email,
				password,
				options: {
					// Only full_name is persisted (the handle_new_user trigger copies it
					// to profiles). Persona, company/role verification and other details
					// are captured by the onboarding + claim ("verify") flow afterwards.
					data: {
						full_name: fullName,
					},
					// The custom auth-hook (server/src/modules/auth-hooks) treats this
					// origin's path as the post-verify `next`, so point it straight at
					// onboarding. New email-confirmed users land in the (skippable)
					// onboarding flow, same as the password/OAuth paths below.
					emailRedirectTo: `${window.location.origin}/onboarding`,
				},
			});
			if (err) { setError(err.message); return; }
			if (data.user && !data.session) {
				setMessage('Check your email for a confirmation link!');
			} else if (data.session) {
				await callPostLogin(data.session.access_token);
				// Onboarding always runs for a new account, so this deliberately
				// ignores `redirectTo` — that param only steers the OAuth path, where
				// the callback resumes wherever the user was headed.
				router.push('/onboarding');
			}
		} finally {
			setLoading(false);
		}
	};

	return (
		<>
			<AuthThemeToggle />
			<AuthSplit panel={<AuthSidePanel />}>
				<div>
					<h1 className="auth-form__title">Create your Atlas account</h1>
					<p className="auth-form__sub">Free to start. No card required.</p>
				</div>

				{error && <AuthNotice tone="error">{error}</AuthNotice>}
				{message && <AuthNotice tone="ok">{message}</AuthNotice>}

				<OAuthButtons redirectTo={redirectTo} onError={setError} disabled={loading} />
				<AuthOr />

				<form onSubmit={handleSignup} className="auth-fields">
					<div>
						<label htmlFor="signup-name" className="atlas-label">Full name</label>
						<input
							id="signup-name"
							type="text"
							placeholder="First and last name"
							value={fullName}
							onChange={e => setFullName(e.target.value)}
							required
							className="atlas-input"
						/>
					</div>
					<div>
						<label htmlFor="signup-email" className="atlas-label">Work email</label>
						<input
							id="signup-email"
							type="email"
							placeholder="name@company.com"
							value={email}
							onChange={e => setEmail(e.target.value)}
							required
							autoComplete="email"
							className="atlas-input"
						/>
					</div>
					<PasswordField
						id="signup-password"
						label="Password"
						placeholder="At least 8 characters"
						value={password}
						onChange={setPassword}
						autoComplete="new-password"
					/>
					<PasswordField
						id="signup-confirm"
						label="Confirm password"
						placeholder="Re-enter your password"
						value={confirmPassword}
						onChange={setConfirmPassword}
						autoComplete="new-password"
					/>

					<Button type="submit" className="auth-btn" disabled={loading}>
						{loading && <AuthSpinner />}
						Create account
					</Button>
				</form>

				<p className="auth-form__legal">
					By continuing you agree to the SportsTechX{' '}
					<Link href="/terms-of-service">Terms</Link> and{' '}
					<Link href="/privacy-policy">Privacy Policy</Link>.
				</p>

				<p className="auth-form__alt">
					Already have an account? <Link href="/login">Log in</Link>
				</p>
			</AuthSplit>
		</>
	);
}
