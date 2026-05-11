import { AppShell } from '@/components/shell/app-shell';

// Every page under (app) requires auth and reads per-user data, so static
// pre-rendering doesn't apply. Marking the shell `force-dynamic` skips
// Next.js's pre-render pass which would otherwise fail on `useSearchParams`
// in nested client components without each one needing its own Suspense.
export const dynamic = 'force-dynamic';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
