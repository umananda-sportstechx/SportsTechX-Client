import { ProtectedRoute } from '@/components/auth/protected-route';

// Onboarding is auth-gated (you must be signed in) but intentionally renders
// WITHOUT the AppShell chrome (rail / topbar / ticker) so the flow is focused.
// force-dynamic for the same reason (app)/layout uses it — per-user, no SSG.
export const dynamic = 'force-dynamic';

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">{children}</div>
    </ProtectedRoute>
  );
}
