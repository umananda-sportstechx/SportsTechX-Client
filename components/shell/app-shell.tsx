'use client';

import { usePathname } from 'next/navigation';
import { PaywallGate } from '@/components/paywall/paywall-gate';
import { RaiseShell } from './raise-shell';

/**
 * Shell for the `(app)` route group, which holds exactly three things:
 * `/raise/*`, `/billing/*` and `/coming-soon`.
 *
 * It used to carry the app's only tier check: a path sniff for `/raise/*` that
 * tested `getUserType(profile) === 'raise'` and `router.replace('/coming-soon')`
 * for everyone else. That rule could not express the one that matters — Raise
 * and Scout are siblings, so an Explore user should see an upsell and a Scout
 * user a 404, and it sent both to a page whose only action is sign-out.
 * `RouteGate` inside the shell now answers that from the route manifest.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
	const pathname = usePathname();

	// Plan-agnostic surfaces (coming-soon placeholder + billing/subscriptions) —
	// rendered on the Atlas palette with no chrome, reachable by any plan.
	if (pathname === '/coming-soon' || pathname.startsWith('/billing')) {
		return <div className="atlas" style={{ minHeight: '100dvh', background: 'var(--a-page)' }}>{children}<PaywallGate /></div>;
	}

	return (
		<>
			<RaiseShell>{children}</RaiseShell>
			<PaywallGate />
		</>
	);
}
