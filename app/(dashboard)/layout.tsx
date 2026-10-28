import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthPlaceholder, ProtectedRoute } from '@/components/auth/protected-route';
import { AppShell } from '@/components/shell/app-shell';

export const metadata: Metadata = { title: 'Atlas' };

// Built statically, served from the CDN. Every page here is client-rendered
// behind the session check, so a per-request server render (the old
// `force-dynamic`) produced the same "Authenticating…" HTML every time — but
// paid a serverless cold start for it, slowest right after a deploy. The one
// <Suspense> below is what static rendering needs for the `useSearchParams`
// calls in the shell and pages; it covers every page under this layout.

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
		<Suspense fallback={<AuthPlaceholder />}>
			<ProtectedRoute>
				<AppShell>{children}</AppShell>
			</ProtectedRoute>
		</Suspense>
	);
}
