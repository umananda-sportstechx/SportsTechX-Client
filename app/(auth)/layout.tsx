// Auth pages read URL state (`?redirectTo=...`, `?reason=session_expired`)
// via `useSearchParams`, which Next 16 won't statically prerender without an
// explicit Suspense boundary. Marking the shell dynamic skips that pass.
export const dynamic = 'force-dynamic';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
