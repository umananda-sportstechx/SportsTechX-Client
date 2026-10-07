import '@/components/atlas/styles/tokens.css';

// /confirm reads `?token_hash=…&type=…&next=…` via `useSearchParams`, which
// Next 16 won't statically prerender without an explicit Suspense boundary.
// Marking the route dynamic skips that pass.
export const dynamic = 'force-dynamic';

/**
 * `.atlas` scopes the `--a-*` tokens, the same two lines `app/(auth)/layout.tsx`
 * uses. This page sits between the restyled signup and onboarding screens, so it
 * needs to look like them.
 */
export default function ConfirmLayout({ children }: { children: React.ReactNode }) {
	return <div className="atlas">{children}</div>;
}
