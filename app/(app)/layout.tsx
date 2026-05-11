import { AppShell } from '@/components/shell/app-shell';
import { ProtectedRoute } from '@/components/auth/protected-route';

// Every page under (app) requires auth and reads per-user data, so static
// pre-rendering doesn't apply. Marking the shell `force-dynamic` skips
// Next.js's pre-render pass which would otherwise fail on `useSearchParams`
// in nested client components without each one needing its own Suspense.
export const dynamic = 'force-dynamic';

// Auth gate stack:
//   1. proxy.ts (edge)         — checks for the sb-*-auth-token cookie
//   2. <ProtectedRoute>        — validates the session against Supabase, sends
//                                cookie-but-invalid users to /login
//   3. <AppShell>              — actual UI
//
// Splitting it this way keeps the edge proxy hot path cheap (no Supabase
// round-trip) while still doing a real session check before any private page
// renders.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <AppShell>{children}</AppShell>
    </ProtectedRoute>
  );
}
