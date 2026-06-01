// /confirm reads `?token_hash=…&type=…&next=…` via `useSearchParams`, which
// Next 16 won't statically prerender without an explicit Suspense boundary.
// Marking the route dynamic skips that pass.
export const dynamic = 'force-dynamic';

export default function ConfirmLayout({ children }: { children: React.ReactNode }) {
	return <>{children}</>;
}
