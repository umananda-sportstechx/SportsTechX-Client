import '@/components/atlas/styles/tokens.css';
import { ProtectedRoute } from '@/components/auth/protected-route';

// Onboarding is auth-gated (you must be signed in) but intentionally renders
// WITHOUT the AppShell chrome (rail / topbar / ticker) so the flow is focused.
// force-dynamic for the same reason (app)/layout uses it — per-user, no SSG.
export const dynamic = 'force-dynamic';

/**
 * `.atlas` scopes the `--a-*` tokens, which the persona picker now uses.
 *
 * `bg-background` stays: the two tier-specific flows in this group
 * (`/onboarding/explore`, `/onboarding/scout`) are still on the legacy palette
 * and would lose their page colour without it. It goes when they are migrated.
 */
export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
	return (
		<ProtectedRoute>
			<div className="atlas min-h-screen bg-background">{children}</div>
		</ProtectedRoute>
	);
}
