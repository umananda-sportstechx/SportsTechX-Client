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
 */
export const PUBLIC_PATHS = [
  '/', // public marketing landing page (app/page.tsx)
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/auth', // /auth/callback and any other supabase auth flow pages
  '/privacy-policy',
  '/terms-of-service',
  '/w', // /w/[token] — public read-only shared watchlist pages
] as const;

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
