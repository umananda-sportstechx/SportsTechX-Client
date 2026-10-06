import type { Metadata } from 'next';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { AppShell } from '@/components/shell/app-shell';

export const metadata: Metadata = { title: 'Scout' };

// Every Scout page reads per-user data — skip static pre-rendering (same as the
// (app) group, so `useSearchParams` in nested client components is fine).
export const dynamic = 'force-dynamic';

/**
 * Atlas Scout investor workspace. Lives in its own `(scout)` route group, so it
 * It renders the same AppShell as every other product — the shell derives its
 * product name, colour and overlays from the viewer's tier.
 *
 * Auth: proxy.ts gates /scout by cookie; ProtectedRoute adds the real session check.
 */
export default function ScoutLayout({ children }: { children: React.ReactNode }) {
	return (
		<ProtectedRoute>
			<AppShell>{children}</AppShell>
		</ProtectedRoute>
	);
}
