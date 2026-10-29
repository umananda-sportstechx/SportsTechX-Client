'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuthSession } from '@/hooks/use-auth-session';
import { AtlasLogo } from '@/components/atlas/brand/atlas-logo';
import '@/components/atlas/styles/tokens.css';

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
			const target = `/login?redirectTo=${encodeURIComponent(pathname ?? '/home')}`;
			router.replace(target);
		}
	}, [loading, sessionValid, router, pathname]);

	if (loading || !sessionValid) return <AuthPlaceholder label={loading ? 'Loading…' : 'Redirecting…'} />;

	return <>{children}</>;
}

/**
 * The full-height loading screen (logo + spinner). Also the Suspense fallback of the
 * protected layouts, so a statically built page's first paint is the same
 * screen the session check shows next — no flash between the two.
 */
export function AuthPlaceholder({ label = 'Loading…' }: { label?: string }) {
	return (
		<div className="atlas auth-placeholder" role="status" aria-live="polite">
			<AtlasLogo height={30} />
			<Loader2 className="animate-spin" size={18} aria-hidden="true" />
			<span>{label}</span>
		</div>
	);
}
