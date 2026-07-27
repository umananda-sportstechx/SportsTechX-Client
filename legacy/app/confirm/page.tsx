'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { getSupabaseBrowser } from '@/lib/supabase/client';
import { Page } from '@/components/ui/atoms';

/**
 * Email confirmation landing — UNAUTHENTICATED route.
 *
 * Supabase's email links go here with `?token_hash=…&type=signup|recovery|
 * magiclink|email_change`. We call `supabase.auth.verifyOtp` to swap the
 * token for a session, then redirect to the dashboard.
 *
 * IMPORTANT: this page intentionally lives OUTSIDE the `(app)` route group
 * because `(app)/layout.tsx` wraps everything in `<ProtectedRoute>`, which
 * would boot the user back to `/login` before `verifyOtp` has had a chance
 * to mint the session. The flow needs to be: anonymous user → verifyOtp →
 * session → redirect to a protected page (which is now allowed).
 *
 * Compared to the old `/auth/v1/verify?token=…` link Supabase generates by
 * default, `token_hash` is NOT consumed by email link-previews (Gmail /
 * Slack / antivirus all prefetch URLs, which on the old endpoint burns the
 * single-use OTP before the user clicks). `verifyOtp` is an SDK call from
 * a real browser session, so previews can't accidentally consume it.
 */
export default function ConfirmPage() {
	const params = useSearchParams();
	const router = useRouter();
	const [status, setStatus] = useState<'verifying' | 'ok' | 'error'>('verifying');
	const [message, setMessage] = useState<string>('');

	const tokenHash = params.get('token_hash');
	const type = (params.get('type') ?? 'signup') as
		| 'signup' | 'invite' | 'recovery' | 'magiclink' | 'email_change';
	const next = params.get('next') ?? '/dashboard';

	useEffect(() => {
		if (!tokenHash) {
			setStatus('error');
			setMessage('Missing confirmation token. The link may be malformed or expired.');
			return;
		}
		void (async () => {
			try {
				const supabase = getSupabaseBrowser();
				const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
				if (error) throw error;
				setStatus('ok');
				// Brief pause so the success state is visible, then redirect.
				setTimeout(() => router.replace(next), 1200);
			} catch (e) {
				setStatus('error');
				setMessage((e as Error).message || 'Verification failed.');
			}
		})();
	}, [tokenHash, type, next, router]);

	return (
		<Page>
			<div style={{
				display: 'flex', flexDirection: 'column', alignItems: 'center',
				justifyContent: 'center', minHeight: '60vh', textAlign: 'center', gap: 16,
			}}>
				{status === 'verifying' && (
					<>
						<div style={{ fontSize: 14, color: 'var(--fg-muted)' }}>Confirming your email…</div>
					</>
				)}
				{status === 'ok' && (
					<>
						<CheckCircle2 size={48} color="var(--accent)" />
						<h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 800, margin: 0 }}>
							You're in.
						</h1>
						<p style={{ color: 'var(--fg-2)', margin: 0 }}>
							Email confirmed — redirecting…
						</p>
					</>
				)}
				{status === 'error' && (
					<>
						<AlertCircle size={48} color="#dc2626" />
						<h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, margin: 0 }}>
							Couldn't confirm
						</h1>
						<p style={{ color: 'var(--fg-2)', margin: 0, maxWidth: 480 }}>
							{message}
						</p>
						<Link href="/login"><button className="btn">Back to sign in</button></Link>
					</>
				)}
			</div>
		</Page>
	);
}
