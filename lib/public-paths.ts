/**
 * Routes that must work without a session.
 *
 * Two layers read this and they have to agree, which is why it lives in its own
 * module rather than inside either of them:
 *
 *  1. The Edge middleware (lib/supabase/middleware.ts) gates everything NOT
 *     listed here behind an auth cookie.
 *  2. The SWR layer (lib/query-client.ts) refuses to bounce a 401 to /login
 *     while the visitor is on one of these.
 *
 * (2) is the one that is easy to forget. The middleware already let `/` through,
 * but a logged-out visitor with a stale cookie still got thrown off the public
 * marketing page: the root providers call useUserProfile() on every route, the
 * expired JWT came back 401, and the global handler hard-navigated to /login.
 * A public page has to stay readable whatever is in the cookie jar.
 *
 * Entries match as an exact path or a path prefix (`/w` covers `/w/<token>`).
 *
 * Now that the signed-in product is all under `/app`, this could invert into
 * "gate `/app`, `/onboarding` and `/billing`" — shorter, and a new public page
 * could no longer be private by accident. It deliberately hasn't: the failure
 * directions are not symmetric. Forgetting to add a public page here makes that
 * page ask for a login, which someone notices immediately. Forgetting to list a
 * private prefix in the inverted version makes it readable without one, which
 * nobody notices.
 *
 * That reasoning stands, but an earlier version of this comment drew the wrong
 * conclusion from it — it observed that `/docs` and `/confirm` were private only
 * by being absent here, and treated that as acceptable. For `/confirm` it was a
 * broken signup: a user awaiting email confirmation has no session, so no auth
 * cookie, so the middleware bounced them to /login before `verifyOtp` could run.
 * Being absent from a list is not the same as being deliberately private.
 */
export const PUBLIC_PATHS = [
  '/', // public marketing landing page (app/page.tsx)
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/auth', // /auth/callback and any other supabase auth flow pages
  // The email-confirmation landing. It MUST be public: the whole point is that
  // the visitor has no session yet — they are carrying a token_hash that
  // `verifyOtp` is about to exchange for one.
  '/confirm',
  '/privacy-policy',
  '/terms-of-service',
  '/w', // /w/[token] — public read-only shared watchlist pages
] as const;

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
