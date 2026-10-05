import type { Metadata } from 'next';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { ExploreShell } from '@/components/explore/explore-shell';

export const metadata: Metadata = { title: 'Explore' };

// Per-user pages — skip static pre-rendering (same as the (app) and (scout) groups).
export const dynamic = 'force-dynamic';

/**
 * Atlas Explore — the base product (a lighter Raise). Own `(explore)` route
 * group on the shared Atlas design system via ExploreShell. Any signed-in user.
 * Auth: proxy.ts gates /explore by cookie; ProtectedRoute adds the session check.
 */
export default function ExploreLayout({ children }: { children: React.ReactNode }) {
	return (
		<ProtectedRoute>
			<ExploreShell>{children}</ExploreShell>
		</ProtectedRoute>
	);
}
