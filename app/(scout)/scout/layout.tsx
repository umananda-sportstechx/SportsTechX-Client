import type { Metadata } from 'next';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { ScoutShell } from '@/components/scout/scout-shell';

export const metadata: Metadata = { title: 'Scout' };

// Every Scout page reads per-user data — skip static pre-rendering (same as the
// (app) group, so `useSearchParams` in nested client components is fine).
export const dynamic = 'force-dynamic';

/**
 * Atlas Scout investor workspace. Lives in its own `(scout)` route group, so it
 * doesn't inherit the (app) AppShell; it uses the shared Atlas design system
 * (same theme, components and fonts as Raise) via ScoutShell.
 *
 * Auth: proxy.ts gates /scout by cookie; ProtectedRoute adds the real session check.
 */
export default function ScoutLayout({ children }: { children: React.ReactNode }) {
	return (
		<ProtectedRoute>
			<ScoutShell>{children}</ScoutShell>
		</ProtectedRoute>
	);
}
