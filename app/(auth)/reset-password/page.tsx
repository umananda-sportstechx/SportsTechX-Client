'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowser } from '@/lib/supabase/client';
import { Button, Card } from '@/components/atlas';
import { AuthBrand, AuthNotice, AuthSpinner, AuthThemeToggle, PasswordField } from '@/components/auth/auth-shell';

/**
 * Set a new password, from the link the reset email carries.
 *
 * No mockup exists for this screen either — same centred-card shape as
 * forgot-password, so the two halves of the flow match. On success it hands off
 * to `/login?message=password_updated`, which login now actually reads.
 */
export default function ResetPasswordPage() {
	const router = useRouter();
	const [password, setPassword] = useState('');
	const [confirm, setConfirm] = useState('');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError('');
		if (password !== confirm) { setError('Passwords do not match.'); return; }
		if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
		setLoading(true);
		const supabase = getSupabaseBrowser();
		const { error: err } = await supabase.auth.updateUser({ password });
		setLoading(false);
		if (err) setError(err.message);
		else router.push('/login?message=password_updated');
	};

	return (
		<>
			<AuthThemeToggle />
			<div className="auth-centred">
				<Card glow="blue" className="auth-centred__card">
					<AuthBrand />
					<div>
						<h1 className="auth-form__title">Reset password</h1>
						<p className="auth-form__sub">Enter your new password below.</p>
					</div>

					<form onSubmit={handleSubmit} className="auth-fields">
						{error && <AuthNotice tone="error">{error}</AuthNotice>}
						<PasswordField
							id="password"
							label="New password"
							placeholder="At least 8 characters"
							value={password}
							onChange={setPassword}
							autoComplete="new-password"
						/>
						<PasswordField
							id="confirm"
							label="Confirm password"
							placeholder="Re-enter your password"
							value={confirm}
							onChange={setConfirm}
							autoComplete="new-password"
						/>
						<Button type="submit" className="auth-btn" disabled={loading}>
							{loading && <AuthSpinner />}
							Update password
						</Button>
					</form>
				</Card>
			</div>
		</>
	);
}
