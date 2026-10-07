'use client';

import useSWR, { mutate as globalMutate, type SWRConfiguration, type Key } from 'swr';
import { getSupabaseBrowser } from './supabase/client';
import { sessionRefreshLock } from './session-refresh-lock';
import { logoutState } from './logout-state';
import { openCreditExhausted, InsufficientCreditsError } from './credit-events';
import { openTierRequired, TierRequiredError } from './tier-events';
import { isPublicPath } from './public-paths';
import type { Tier } from './access';

// ─── Auth header cache ───────────────────────────────────────────────────────
//
// Avoid an async Supabase call on every fetch. Cache the token until 60s
// before its expiry; refresh through `sessionRefreshLock` so multiple in-flight
// requests share a single refresh round-trip.

let cachedAuth: { token: string; expiresAt: number } | null = null;
const AUTH_CACHE_BUFFER_MS = 60_000;

export function clearAuthCache(): void {
  cachedAuth = null;
}

export async function getAuthHeaders(): Promise<Record<string, string>> {
  if (logoutState.isLoggingOut()) return {};

  const now = Date.now();
  if (cachedAuth && now < cachedAuth.expiresAt - AUTH_CACHE_BUFFER_MS) {
    return { Authorization: `Bearer ${cachedAuth.token}` };
  }

  const supabase = getSupabaseBrowser();
  const { data: { session } } = await supabase.auth.getSession();

  if (session?.access_token) {
    cachedAuth = {
      token: session.access_token,
      expiresAt: session.expires_at ? session.expires_at * 1000 : now + 3_600_000,
    };
    return { Authorization: `Bearer ${session.access_token}` };
  }

  try {
    const result = await sessionRefreshLock.acquireAndRefresh(() =>
      supabase.auth.refreshSession(),
    );
    const refreshed = (result as { data?: { session?: { access_token?: string; expires_at?: number } } })?.data?.session;
    if (refreshed?.access_token) {
      cachedAuth = {
        token: refreshed.access_token,
        expiresAt: refreshed.expires_at ? refreshed.expires_at * 1000 : now + 3_600_000,
      };
      return { Authorization: `Bearer ${refreshed.access_token}` };
    }
  } catch {
    /* fall through */
  }

  return {};
}

// ─── 401 redirect-to-login ───────────────────────────────────────────────────

/**
 * Paths where a hard-navigation to `/login?reason=session_expired` would loop:
 * we're already there, or we're mid-way through confirming/resetting a session
 * (so the SWR layer still has the cookie but the backend isn't honouring it).
 *
 * Otherwise: stale cookies → SWR fires → 401 → hard nav → page mounts →
 * SWR fires → 401 → hard nav → … (state-wiping infinite loop every ~1.5s).
 */
const AUTH_PATHS = new Set([
  '/login', '/signup', '/forgot-password', '/reset-password',
  '/auth/callback', '/confirm',
]);

/**
 * Whether a 401 here should be handled inline rather than by leaving the page.
 *
 * Public routes are in this set as well as the auth ones. The root providers
 * call useUserProfile() on every route, so a visitor arriving at the marketing
 * page with an expired cookie got a 401 and was hard-navigated to /login — the
 * page is public and must not do that, whatever is in the cookie jar.
 */
function noRedirectHere(): boolean {
  if (typeof window === 'undefined') return false;
  const { pathname } = window.location;
  return AUTH_PATHS.has(pathname) || isPublicPath(pathname);
}

/** This app's error envelope, as the server's exceptions filter emits it. */
interface ApiErrorBody {
  message?: unknown;
  error?: {
    code?: string;
    message?: string;
    /** TIER_REQUIRED only — top level, not under `details`. */
    requiredTiers?: Tier[];
    currentTier?: Tier;
    details?: {
      required?: number;
      available?: number;
      credit_type?: 'ai' | 'integration';
      issues?: Array<{ path?: unknown[]; message?: string }>;
    };
  } | string;
}

/** This app's structured `{error:{code,...}}` envelope, or null if the body is
 *  not JSON or carries only a bare string error (NestJS's default shape). */
function parseApiError(text: string): Exclude<ApiErrorBody['error'], string | undefined> | null {
  try {
    const { error } = JSON.parse(text) as ApiErrorBody;
    return error && typeof error === 'object' ? error : null;
  } catch {
    return null;
  }
}

/**
 * Parse a JSON response that might legitimately have no body.
 *
 * `res.json()` throws "Unexpected end of JSON input" on an empty body, and a
 * 200-with-no-body is a normal NestJS outcome: a handler that returns `null`
 * (e.g. `GET /api/billing/subscription` → `getActiveSubscription() ?? null`)
 * serialises to zero bytes, as does any 204. Callers already treat these as
 * "nothing yet" — the billing page reads `sub.data?.subscription_status` — so
 * the absence of a body is data, not a parse failure.
 */
async function readJson<T>(res: Response): Promise<T | null> {
	const text = await res.text();
	if (!text) return null;
	return JSON.parse(text) as T;
}

async function handleResponse(res: Response, context?: string): Promise<void> {
  if (res.ok) return;

  const text = await res.text().catch(() => res.statusText);

  // **401 only.** 401 is authentication — the session is gone, so sending the
  // user to log in is the right answer. 403 is authorization: they are exactly
  // who they claim to be, they just cannot do this one thing. Logging them out
  // for it is never right, and here it was catastrophic.
  //
  // 403 used to be in this condition and it took production down for every
  // Scout without a `scout_profiles` row: `/api/scout/thesis` answers
  // 403 SCOUT_NOT_SET_UP, which bounced them to /login, which saw a perfectly
  // valid session and sent them back to /app, which re-fetched the thesis —
  // a reload every ~2s that no amount of retrying could escape.
  //
  // Every 403 this API returns carries a domain code (SCOUT_NOT_SET_UP,
  // TIER_LOCKED, NO_RAISE, NOT_ELIGIBLE, UPGRADE_REQUIRED, …) and not one of
  // them means "your session expired". Do not put 403 back.
  if (res.status === 401 && !logoutState.isLoggingOut()) {
    if (logoutState.hasValidSession() && !noRedirectHere()) {
      setTimeout(() => {
        window.location.href = '/login?reason=session_expired';
      }, 1500);
    }
  }

  // A 402 is one of two refusals: out of credits, or the plan doesn't include
  // this. Both pop a global modal and throw a typed error so callers can skip
  // their own toast — the modal carries the message.
  //
  // Matched on status *and* code. `api-key.guard.ts` throws the same
  // TIER_REQUIRED code at 403, which is a different situation; only a 402 is a
  // plan refusal. (403 no longer bounces to /login — see the note above.)
  if (res.status === 402) {
    const err = parseApiError(text);

    if (err?.code === 'INSUFFICIENT_CREDITS') {
      const detail = {
        required: err.details?.required,
        available: err.details?.available,
        creditType: err.details?.credit_type,
      };
      openCreditExhausted(detail);
      throw new InsufficientCreditsError(err.message ?? "You're out of credits.", detail);
    }

    if (err?.code === 'TIER_REQUIRED') {
      // Note the shape: TierGuard puts `requiredTiers`/`currentTier` at the top
      // level of `error`, NOT under `details` like the credits path. Reading
      // `details` here would silently find nothing.
      const detail = { requiredTiers: err.requiredTiers, currentTier: err.currentTier, message: err.message };
      openTierRequired(detail);
      throw new TierRequiredError(err.message ?? 'Your plan does not include this.', detail);
    }
    // Any other 402 falls through to the generic message below.
  }

  // Surface the server's human message (NestJS `{message}` / this app's
  // `{error:{message}}` / a validation array) instead of dumping raw JSON.
  let message = `Request failed (${res.status}).`;
  try {
    const body = JSON.parse(text) as { message?: unknown; error?: unknown };
    const err = body.error as { message?: unknown; details?: { issues?: Array<{ path?: unknown[]; message?: string }> } } | string | undefined;
    let cand =
      (typeof err === 'object' && err && typeof err.message === 'string' ? err.message : undefined)
      ?? (typeof body.message === 'string' ? body.message : undefined)
      ?? (Array.isArray(body.message) ? (body.message as string[]).join(', ') : undefined)
      ?? (typeof err === 'string' ? err : undefined);
    // Zod validation errors: append the offending field(s) so it's never a mystery.
    const issues = typeof err === 'object' && err ? err.details?.issues : undefined;
    if (issues?.length) {
      const fields = issues.map((i) => `${(i.path ?? []).join('.') || 'body'}${i.message ? ` (${i.message})` : ''}`).join('; ');
      cand = `${cand ?? 'Validation failed'} — ${fields}`;
    }
    if (cand && cand.trim()) message = cand;
  } catch {
    if (text && text.trim() && text.length < 300) message = text;
  }
  const e = new Error(message) as Error & { status?: number; context?: string; code?: string };
  e.status = res.status;
  // Carry the server's machine-readable code alongside the human message. The
  // message is for the user; the code is what callers and the global `onError`
  // can branch on without string-matching prose.
  const code = parseApiError(text)?.code;
  if (code) e.code = code;
  // The callers all pass `${method} ${url}`. Attaching it rather than dropping
  // it is what makes a logged failure identifiable; the message itself stays
  // user-facing and unchanged.
  if (context) e.context = context;
  throw e;
}

// ─── apiRequest (non-GET writes) ─────────────────────────────────────────────
//
// Write path used by mutations. Not an SWR hook — call it from any handler.

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown,
): Promise<Response> {
  const authHeaders = await getAuthHeaders();
  const headers: Record<string, string> = {
    ...(data ? { 'Content-Type': 'application/json' } : {}),
    ...authHeaders,
  };

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: 'include',
  });

  if (res.status === 401 && headers.Authorization) {
    const supabase = getSupabaseBrowser();
    const result = await sessionRefreshLock.acquireAndRefresh(() =>
      supabase.auth.refreshSession(),
    );
    const refreshed = (result as { data?: { session?: { access_token?: string } } })?.data?.session;
    if (refreshed?.access_token) {
      const retryRes = await fetch(url, {
        method,
        headers: { ...headers, Authorization: `Bearer ${refreshed.access_token}` },
        body: data ? JSON.stringify(data) : undefined,
        credentials: 'include',
      });
      await handleResponse(retryRes, `${method} ${url} retry`);
      return retryRes;
    }
  }

  await handleResponse(res, `${method} ${url}`);
  return res;
}

// ─── URL builder ─────────────────────────────────────────────────────────────
//
// Serializes a key tuple `[path, paramsObj?, ...]` into a URL with query
// string. Arrays expand to repeated keys. null/undefined/'' skipped so callers
// can pass them through cleanly. The `qk.*` helper produces tuples in this
// shape; the SWR fetcher consumes them directly.

export function buildUrl(queryKey: readonly unknown[]): string {
  const base = queryKey[0] as string;
  const params = new URLSearchParams();
  for (const part of queryKey.slice(1)) {
    if (!part || typeof part !== 'object' || Array.isArray(part)) continue;
    for (const [k, v] of Object.entries(part as Record<string, unknown>)) {
      if (v === undefined || v === null || v === '') continue;
      if (Array.isArray(v)) {
        for (const item of v) {
          if (item === undefined || item === null || item === '') continue;
          params.append(k, String(item));
        }
      } else if (typeof v === 'object') {
        params.set(k, JSON.stringify(v));
      } else {
        params.set(k, String(v));
      }
    }
  }
  const qs = params.toString();
  if (!qs) return base;
  return `${base}${base.includes('?') ? '&' : '?'}${qs}`;
}

// ─── Polling gate ────────────────────────────────────────────────────────────
//
// SWR doesn't expose runtime mutation of its config, so we gate the fetcher
// itself. `disableQueryPolling()` sets this flag; the fetcher returns null
// while it's on. Used at logout to stop new requests before the auth state has
// fully unwound.

let pollingDisabled = false;

// ─── Fetcher ─────────────────────────────────────────────────────────────────

export async function fetcher<T = unknown>(key: Key): Promise<T | null> {
  if (pollingDisabled) {
    return null;
  }

  const queryKey = Array.isArray(key) ? key : [key];
  const url = buildUrl(queryKey);

  const authHeaders = await getAuthHeaders();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...authHeaders,
  };

  const res = await fetch(url, { credentials: 'include', headers });

  // A 401 means either (a) a genuinely public/pre-auth viewer, or (b) our
  // token wasn't ready when the request fired (the auth-init race) or expired
  // mid-flight. Always try to (re)acquire a token and retry ONCE before giving
  // up — even when we sent no Authorization header. Previously the retry only
  // ran when a token was already attached, so a request that raced ahead of
  // auth got `null` cached forever (revalidateOnFocus/Reconnect are off),
  // which is exactly what made pages "stay stale until a manual refresh".
  if (res.status === 401) {
    if (!logoutState.isLoggingOut()) {
      const supabase = getSupabaseBrowser();
      const result = await sessionRefreshLock.acquireAndRefresh(() =>
        supabase.auth.refreshSession(),
      );
      const refreshed = (result as { data?: { session?: { access_token?: string } } })?.data?.session;
      if (refreshed?.access_token) {
        clearAuthCache();
        const retryRes = await fetch(url, {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${refreshed.access_token}` },
        });
        if (retryRes.status !== 401) {
          await handleResponse(retryRes, `swr ${url} retry`);
          return await readJson<T>(retryRes);
        }
      }
    }
    // Still unauthenticated — a logged-out viewer on a public route. Return
    // null rather than throw so a hook in suspense doesn't render an error.
    return null;
  }

  await handleResponse(res, `swr ${url}`);
  return await readJson<T>(res);
}

// Re-exported for any internal use; consumers should import from 'swr'.
export { useSWR };

// ─── SWR global config ───────────────────────────────────────────────────────

/**
 * Server error codes that represent an un-started flow rather than a fault, so
 * the global `onError` stays quiet for them. Keep this short and justified —
 * every entry is a failure someone has decided not to hear about.
 */
/** Domain refusals a screen handles itself — never worth a toast.
 *  Both are "you have not set this up yet", not failures. */
const EXPECTED_CODES = new Set(['NO_RAISE', 'SCOUT_NOT_SET_UP']);

export const swrConfig: SWRConfiguration = {
  fetcher,
  dedupingInterval: 5 * 60_000,
  revalidateOnFocus: false,
  // Refetch when the network comes back so a request that failed/returned
  // stale while offline recovers on its own instead of needing a reload.
  revalidateOnReconnect: true,
  errorRetryCount: 2,
  shouldRetryOnError: (err: unknown) => {
    if (!(err instanceof Error)) return true;
    // A 404 won't become a 200, and neither refusal a 402 carries — out of
    // credits, wrong plan — changes on retry. Retrying them just fires the
    // global modal's event three times for one user action.
    if ((err as Error & { status?: number }).status === 404) return false;
    if (err instanceof InsufficientCreditsError || err instanceof TierRequiredError) return false;
    return true;
  },
  /**
   * Last stop for a failed request.
   *
   * There was no `onError` at all, which meant any API failure a component
   * didn't explicitly render was absorbed in silence — and with no error
   * reporter in this client, the whole API failure rate was unobservable.
   * This at least puts it in the console with its key, so a failure is visible
   * to anyone with devtools open and to a session replay later.
   *
   * Deliberately quiet for the two cases that already have UI: both open a
   * modal of their own, and a 401 is the signed-out path, not a fault.
   */
  onError: (err: unknown, key: string) => {
    if (err instanceof InsufficientCreditsError || err instanceof TierRequiredError) return;
    const e = err instanceof Error ? (err as Error & { status?: number; code?: string; context?: string }) : undefined;
    if (e?.status === 401) return;
    // Domain states the server reports as errors but which are normal for a
    // user who hasn't finished a flow. Verified against the live API:
    // `GET /api/raise/pipeline` returns 404 `{error:{code:'NO_RAISE'}}` until
    // raise setup completes, and the Investors page fetches it unconditionally
    // to mark which investors are already tracked — so a correctly working page
    // shouted in the console. (`GET /api/raise` is fine: it answers 200 with
    // `{raise:null,criteria:null}`.) A console that cries wolf is worse than no
    // console, which is the whole reason this handler exists.
    if (e?.code && EXPECTED_CODES.has(e.code)) return;
    console.error('[swr]', key, e?.context ?? '', err);
  },
  keepPreviousData: true,
};

// ─── Polling toggles ─────────────────────────────────────────────────────────
//
// Called from AppInit on login/logout. Disable also drops every cached entry.

export function disableQueryPolling(): void {
  pollingDisabled = true;
  clearAuthCache();
  void globalMutate(() => true, undefined, { revalidate: false });
}

export function enableQueryPolling(): void {
  pollingDisabled = false;
}
