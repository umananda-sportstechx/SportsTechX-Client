'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { getSupabaseBrowser } from '@/lib/supabase/client';
import { Button, Card } from '@/components/atlas';
import { AuthBrand } from '@/components/auth/auth-shell';

/**
 * Email confirmation landing — UNAUTHENTICATED route.
 *
 * Supabase's email links go here with `?token_hash=…&type=signup|recovery|
 * magiclink|email_change`. We call `supabase.auth.verifyOtp` to swap the
 * token for a session, then redirect to the dashboard.
 *
 * IMPORTANT: this route must stay OUT of `/app` *and* listed in `PUBLIC_PATHS`
 * (lib/public-paths.ts). The visitor arrives with no session by definition, so
 * anything that demands one — the `ProtectedRoute` wrapper, or the edge
 * middleware's cookie check — bounces them to /login before `verifyOtp` can mint
 * the session. The flow has to be: anonymous → verifyOtp → session → redirect.
 * Being absent from PUBLIC_PATHS is exactly how this broke once already.
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
	const next = params.get('next') ?? '/app';

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
		<div className="auth-centred">
			<Card glow="blue" className="auth-centred__card" style={{ alignItems: 'center', textAlign: 'center' }}>
				<AuthBrand />
				{status === 'verifying' && (
					<p className="auth-form__sub" style={{ margin: 0 }}>Confirming your email…</p>
				)}
				{status === 'ok' && (
					<>
						<span className="confirm-medallion confirm-medallion--ok"><CheckCircle2 size={24} /></span>
						<h1 className="auth-form__title">You&apos;re in.</h1>
						<p className="auth-form__sub" style={{ margin: 0 }}>Email confirmed — redirecting…</p>
					</>
				)}
				{status === 'error' && (
					<>
						<span className="confirm-medallion confirm-medallion--bad"><AlertCircle size={24} /></span>
						<h1 className="auth-form__title">Couldn&apos;t confirm</h1>
						<p className="auth-form__sub" style={{ margin: 0 }}>{message}</p>
						<Button href="/login" variant="outline">Back to sign in</Button>
					</>
				)}
			</Card>
		</div>
	);
}
