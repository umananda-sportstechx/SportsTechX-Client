'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getSupabaseBrowser } from '@/lib/supabase/client';
import { Action, Button, Card } from '@/components/atlas';
import { AuthBrand, AuthNotice, AuthSpinner, AuthThemeToggle } from '@/components/auth/auth-shell';

/**
 * Request a password reset link.
 *
 * No mockup exists for this screen, so it is composed from Atlas primitives on
 * the centred-card shape the billing landings already use. It previously had no
 * branding at all and sat on the legacy shadcn kit.
 */
export default function ForgotPasswordPage() {
	const [email, setEmail] = useState('');
	const [loading, setLoading] = useState(false);
	const [sent, setSent] = useState(false);
	const [error, setError] = useState('');

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError('');
		setLoading(true);
		const supabase = getSupabaseBrowser();
		const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
			redirectTo: `${window.location.origin}/reset-password`,
		});
		setLoading(false);
		if (err) setError(err.message);
		else setSent(true);
	};

	return (
		<>
			<AuthThemeToggle />
			<div className="auth-centred">
				<Card glow="blue" className="auth-centred__card">
					<AuthBrand />
					<div>
						<h1 className="auth-form__title">Forgot password</h1>
						<p className="auth-form__sub">
							{sent
								? 'Reset link sent. Check your inbox.'
								: 'Enter your email and we will send a reset link.'}
						</p>
					</div>

					{sent ? (
						<Action icon={<ArrowLeft />} href="/login">Back to sign in</Action>
					) : (
						<form onSubmit={handleSubmit} className="auth-fields">
							{error && <AuthNotice tone="error">{error}</AuthNotice>}
							<div>
								<label htmlFor="email" className="atlas-label">Email</label>
								<input
									id="email"
									type="email"
									placeholder="name@company.com"
									value={email}
									onChange={e => setEmail(e.target.value)}
									required
									className="atlas-input"
								/>
							</div>
							<Button type="submit" className="auth-btn" disabled={loading}>
								{loading && <AuthSpinner />}
								Send reset link
							</Button>
							<p className="auth-form__alt" style={{ textAlign: 'center' }}><Link href="/login">Back to sign in</Link></p>
						</form>
					)}
				</Card>
			</div>
		</>
	);
}
