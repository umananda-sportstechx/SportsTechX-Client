'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useUserProfile, getUserType } from '@/hooks/use-user-profile';
import { PaywallGate } from '@/components/paywall/paywall-gate';
import { RaiseShell } from './raise-shell';

/**
 * Shell for the `(app)` route group, which holds exactly three things:
 * `/raise/*`, `/billing/*` and `/coming-soon`.
 *
 * It used to carry a second, legacy layout as well — rail + topbar + ticker +
 * AI panel + command palette, ported from ui_design. That branch was only
 * reachable for paths outside the three above, and no such path exists in this
 * group, so it rendered for nobody while still pulling six components, four
 * pieces of state and three window listeners into every page here. Removed;
 * the components themselves go when the route consolidation lands.
 *
 * The plan gate below is also temporary. It is a path sniff against a single
 * hardcoded tier, which cannot express "Raise and Scout are siblings" — an
 * Explore user should see an upsell and a Scout user a 404, and this sends
 * both to /coming-soon. The route manifest replaces it.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
	const pathname = usePathname();
	const isRaiseWorkspace = pathname === '/raise' || pathname.startsWith('/raise/');

	// The Raise workspace is gated to the `raise` plan (admins bypass). Everyone
	// else (explore / scout) is sent to the shared coming-soon page.
	const router = useRouter();
	const { data: profile } = useUserProfile();
	const isAdmin = profile?.user_role === 'admin';
	const raiseAllowed = isAdmin || getUserType(profile) === 'raise';
	useEffect(() => {
		if (isRaiseWorkspace && profile && !raiseAllowed) router.replace('/coming-soon');
	}, [isRaiseWorkspace, profile, raiseAllowed, router]);

	// Plan-agnostic surfaces (coming-soon placeholder + billing/subscriptions) —
	// rendered on the Atlas palette with no legacy chrome, reachable by any plan.
	if (pathname === '/coming-soon' || pathname.startsWith('/billing')) {
		return <div className="atlas" style={{ minHeight: '100dvh', background: 'var(--a-page)' }}>{children}<PaywallGate /></div>;
	}

	// Gate to the raise plan: show a loader while the profile loads or while a
	// non-raise user is being redirected to /coming-soon.
	if (!profile || !raiseAllowed) {
		return <div className="atlas" style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', background: 'var(--a-page)' }}><Loader2 className="animate-spin" size={22} /></div>;
	}

	return (
		<>
			<RaiseShell>{children}</RaiseShell>
			<PaywallGate />
		</>
	);
}
