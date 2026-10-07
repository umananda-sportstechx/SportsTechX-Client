import '@/components/atlas/styles/tokens.css';

// Auth pages read URL state (`?redirectTo=...`, `?reason=session_expired`)
// via `useSearchParams`, which Next 16 won't statically prerender without an
// explicit Suspense boundary. Marking the shell dynamic skips that pass.
//
// This export is load-bearing: there is no <Suspense> on login or signup, so
// removing it fails the production build on those two routes.
export const dynamic = 'force-dynamic';

/**
 * Chrome for the pre-login screens.
 *
 * It used to be a bare fragment, so each page invented its own frame and
 * palette — login on a retired token set, signup on the legacy kit, forgot and
 * reset on nothing at all. The `.atlas` class is what scopes the `--a-*`
 * variables (see `components/atlas/styles/tokens.css`), so putting it here is
 * what lets all four pages share one design system.
 *
 * Only the tokens are imported, not the whole Atlas barrel: these pages use a
 * handful of primitives and don't need the chart or shell stylesheets. Any page
 * importing from `@/components/atlas` pulls the rest in itself.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
	return <div className="atlas">{children}</div>;
}
