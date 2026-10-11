import '@/components/atlas/styles/tokens.css';
import { ProtectedRoute } from '@/components/auth/protected-route';

// Onboarding is auth-gated (you must be signed in) but intentionally renders
// WITHOUT the AppShell chrome (rail / topbar / ticker) so the flow is focused.
// force-dynamic for the same reason (app)/layout uses it — per-user, no SSG.
export const dynamic = 'force-dynamic';

/**
 * `.atlas` scopes the `--a-*` tokens that every screen in this group uses.
 *
 * Each screen paints its own page surface, because not rendering AppShell means
 * nothing above them does: the persona picker via `.onb-screen`
 * (`components/onboarding/onboarding.css`), the Explore flow via `.explore-onb`,
 * and the Scout thesis wizard inline in `components/scout/onboarding.tsx`.
 *
 * This used to carry `bg-background` as well, on the stated grounds that the
 * tier-specific flows here were "still on the legacy palette". They were not —
 * `components/scout/scout.css` has been Atlas-tokenised throughout — so the one
 * genuine legacy class on these routes was that `bg-background` itself.
 */
export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
	return (
		<ProtectedRoute>
			<div className="atlas min-h-screen">{children}</div>
		</ProtectedRoute>
	);
}
