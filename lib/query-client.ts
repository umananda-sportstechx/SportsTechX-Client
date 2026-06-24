'use client';

import useSWR, { mutate as globalMutate, type SWRConfiguration, type Key } from 'swr';
import { getSupabaseBrowser } from './supabase/client';
import { sessionRefreshLock } from './session-refresh-lock';
import { logoutState } from './logout-state';
import { openCreditExhausted, InsufficientCreditsError } from './credit-events';

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
 *  - we're already there, OR
 *  - we're in the middle of confirming/resetting a session (so the SWR layer
 *    hasn't lost the cookie yet but the backend isn't honouring it).
 *
 * If the user lands on any of these with an unauthenticated 401, we let the
 * page handle the failure inline (show an error) instead of redirecting.
 * Otherwise: stale cookies → SWR fires → 401 → hard nav → page mounts →
 * SWR fires → 401 → hard nav → … (state-wiping infinite loop every ~1.5s).
 */
const AUTH_PATHS = new Set([
  '/login', '/signup', '/forgot-password', '/reset-password',
  '/auth/callback', '/confirm',
]);

function onAuthPath(): boolean {
  if (typeof window === 'undefined') return false;
  return AUTH_PATHS.has(window.location.pathname);
}

async function handleResponse(res: Response, _context?: string): Promise<void> {
  if (res.ok) return;

  const text = await res.text().catch(() => res.statusText);

  if ((res.status === 401 || res.status === 403) && !logoutState.isLoggingOut()) {
    if (logoutState.hasValidSession() && !onAuthPath()) {
      setTimeout(() => {
        window.location.href = '/login?reason=session_expired';
      }, 1500);
    }
  }

  // Out of credits — pop the global "get more credits" modal and throw a typed
  // error so callers can skip their own toast (the modal carries the message).
  if (res.status === 402) {
    let detail: { required?: number; available?: number } = {};
    let message = "You're out of credits.";
    try {
      const body = JSON.parse(text) as { error?: { code?: string; message?: string; details?: { required?: number; available?: number } } };
      if (body.error?.details) detail = { required: body.error.details.required, available: body.error.details.available };
      if (body.error?.message) message = body.error.message;
      if (body.error?.code === 'INSUFFICIENT_CREDITS') {
        openCreditExhausted(detail);
        throw new InsufficientCreditsError(message, detail);
      }
    } catch (e) {
      if (e instanceof InsufficientCreditsError) throw e;
      // not JSON / not a credits error — fall through to the generic throw
    }
  }

  throw new Error(`${res.status}: ${text}`);
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
          return (await retryRes.json()) as T;
        }
      }
    }
    // Still unauthenticated — a logged-out viewer on a public route. Return
    // null rather than throw so a hook in suspense doesn't render an error.
    return null;
  }

  await handleResponse(res, `swr ${url}`);
  return (await res.json()) as T;
}

// Re-exported for any internal use; consumers should import from 'swr'.
export { useSWR };

// ─── SWR global config ───────────────────────────────────────────────────────

export const swrConfig: SWRConfiguration = {
  fetcher,
  dedupingInterval: 5 * 60_000,
  revalidateOnFocus: false,
  // Refetch when the network comes back so a request that failed/returned
  // stale while offline recovers on its own instead of needing a reload.
  revalidateOnReconnect: true,
  errorRetryCount: 2,
  shouldRetryOnError: (err: unknown) => {
    if (err instanceof Error && err.message.startsWith('404')) return false;
    return true;
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
