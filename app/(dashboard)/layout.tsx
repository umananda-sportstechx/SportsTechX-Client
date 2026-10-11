import type { Metadata } from 'next';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { AppShell } from '@/components/shell/app-shell';

export const metadata: Metadata = { title: 'Atlas' };

// Every page here reads per-user data, so static pre-rendering doesn't apply.
// This is also what lets nested client components call `useSearchParams` without
// each one needing its own Suspense boundary — there is not a single <Suspense>
// in the app, by design. Removing this breaks the build on the companies pages.
export const dynamic = 'force-dynamic';

/**
 * The signed-in product, at `/app`.
 *
 * One tree for all three tiers. The three per-tier trees it replaces
 * (`/raise`, `/explore`, `/scout`) encoded the idea that each tier is a separate
 * product; it isn't — Explore is a free base and Raise and Scout are sibling
 * products on top of it, which is a property of the *user*, not the URL. What
 * renders is decided by `RouteGate` + the route manifest, inside `AppShell`.
 *
 * `/app` rather than the root because `/` is the public marketing page. One
 * private prefix also lets the edge middleware gate a prefix instead of
 * maintaining a list of public paths, which fails safe.
 *
 * Auth: proxy.ts gates by cookie at the edge; ProtectedRoute adds the session
 * check; RouteGate (in AppShell) answers entitlement.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
	return (
		<ProtectedRoute>
			<AppShell>{children}</AppShell>
		</ProtectedRoute>
	);
}
