'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthSession } from '@/hooks/use-auth-session';

/**
 * Client-side auth gate.
 *
 * The edge proxy (`proxy.ts` → `lib/supabase/middleware.ts`) only checks for
 * the *presence* of an `sb-*-auth-token` cookie. That's enough to keep
 * anonymous visitors out, but a cookie can still be expired or tampered. This
 * component runs once the session has been resolved against Supabase
 * (`AuthSessionProvider` does the actual `getSession` / refresh) and:
 *
 *  - while `loading` is true, renders a minimal placeholder so children don't
 *    flash empty
 *  - if `sessionValid` is false after loading, sends the user to /login with
 *    a `redirectTo` so we can return them to the page they wanted after auth
 *  - otherwise renders `children`
 *
 * Wrap any layout (or page) that requires a logged-in user. Doing it at the
 * (app) layout level covers every protected route in one place.
 */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
	const { loading, sessionValid } = useAuthSession();
	const router = useRouter();
	const pathname = usePathname();

	useEffect(() => {
		if (loading) return;
		if (!sessionValid) {
			const target = `/login?redirectTo=${encodeURIComponent(pathname ?? '/dashboard')}`;
			router.replace(target);
		}
	}, [loading, sessionValid, router, pathname]);

	if (loading || !sessionValid) {
		return (
			<div
				style={{
					display: 'grid',
					placeItems: 'center',
					minHeight: '100vh',
					fontFamily: 'var(--font-mono)',
					color: 'var(--fg-muted)',
					fontSize: 11,
					textTransform: 'uppercase',
					letterSpacing: '0.12em',
				}}
			>
				{loading ? 'Authenticating…' : 'Redirecting…'}
			</div>
		);
	}

	return <>{children}</>;
}
