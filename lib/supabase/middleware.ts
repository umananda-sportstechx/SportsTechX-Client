import { type NextRequest, NextResponse } from 'next/server';

/**
 * Public route allowlist — every other route requires an auth cookie.
 *
 * Patterns can be exact paths or path prefixes (matched as `path` or
 * `path/...`). Keep this list tight: anything not listed gets redirected to
 * /login when the user has no auth cookie.
 */
const PUBLIC_PATHS = [
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/auth',            // /auth/callback and any other supabase auth flow pages
  '/privacy-policy',
  '/terms-of-service',
  '/w',               // /w/[token] — public read-only shared watchlist pages
];

/**
 * Auth pages a *signed-in* user shouldn't see — visiting these redirects them
 * to the dashboard (or their original destination) so they don't have to
 * manually navigate away after returning to a logged-in tab.
 */
const AUTH_PAGES = ['/login', '/signup', '/forgot-password', '/reset-password'];

/**
 * Cookie names @supabase/ssr writes for the session. The auth-token cookie
 * may be chunked (`.0`, `.1`, ...) when the JWT is large, so we check by
 * prefix rather than exact name.
 */
const AUTH_COOKIE_PREFIX = 'sb-';
const AUTH_COOKIE_SUFFIX = '-auth-token';

function hasAuthCookie(request: NextRequest): boolean {
  for (const cookie of request.cookies.getAll()) {
    if (
      cookie.name.startsWith(AUTH_COOKIE_PREFIX) &&
      cookie.name.includes(AUTH_COOKIE_SUFFIX) &&
      cookie.value
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Edge proxy auth gate. This is intentionally *fast*: it only checks for the
 * presence of an `sb-*-auth-token` cookie — no Supabase round-trip, no JWT
 * verification. The actual session validation happens in the
 * `<ProtectedRoute>` client wrapper so we don't pay the latency on every
 * navigation. A cookie can still be expired/invalid here; the React layer
 * catches that case and signs the user out.
 *
 * Behaviour:
 *  - Has cookie + on an auth page (`/login` etc.) → redirect to dashboard
 *  - No cookie + on a private page              → redirect to /login
 *  - Otherwise                                   → pass through
 */
export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  const isAuthPage = AUTH_PAGES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  const authed = hasAuthCookie(request);

  if (authed && isAuthPage) {
    const redirectTo = request.nextUrl.searchParams.get('redirectTo') || '/dashboard';
    const url = request.nextUrl.clone();
    url.pathname = redirectTo;
    url.searchParams.delete('redirectTo');
    return NextResponse.redirect(url);
  }

  if (!authed && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next({ request });
}
