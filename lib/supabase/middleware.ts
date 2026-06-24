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

/** Base64 decode that survives UTF-8 (names with accents etc.) on the Edge runtime. */
function decodeBase64Utf8(b64: string): string {
  const bin = atob(b64);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/**
 * Whether the session cookie is present AND its access token has not expired.
 *
 * `hasAuthCookie` only proves a cookie exists — a long-idle tab keeps an
 * expired one, and treating that as "logged in" used to bounce the user off
 * /signup → /dashboard → (client clears it) → /login, wiping the form they
 * were typing. We reassemble the (possibly chunked, possibly base64-) cookie,
 * read `expires_at`, and return:
 *   true  → live session
 *   false → present but expired
 *   null  → no cookie, or we couldn't parse it (caller should not assume live)
 */
function authCookieLive(request: NextRequest): boolean | null {
  const chunks: Record<number, string> = {};
  let whole: string | null = null;
  for (const cookie of request.cookies.getAll()) {
    if (!cookie.name.startsWith(AUTH_COOKIE_PREFIX) || !cookie.name.includes(AUTH_COOKIE_SUFFIX)) continue;
    const m = cookie.name.match(/\.(\d+)$/);
    if (m) chunks[Number(m[1])] = cookie.value;
    else whole = cookie.value;
  }
  const ordered = Object.keys(chunks).map(Number).sort((a, b) => a - b);
  let raw = ordered.length ? ordered.map((i) => chunks[i]).join('') : whole;
  if (!raw) return null;
  try {
    if (raw.startsWith('base64-')) raw = decodeBase64Utf8(raw.slice('base64-'.length));
    else { try { raw = decodeURIComponent(raw); } catch { /* already plain JSON */ } }
    const session = JSON.parse(raw) as { expires_at?: number };
    if (typeof session.expires_at !== 'number') return null;
    return session.expires_at * 1000 > Date.now();
  } catch {
    return null;
  }
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

  // Only bounce a signed-in user OFF an auth page when the cookie is genuinely
  // live. A present-but-expired cookie must NOT trigger this redirect, or the
  // user gets thrown /signup → /dashboard → /login and loses their form input.
  if (authed && isAuthPage && authCookieLive(request) === true) {
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
