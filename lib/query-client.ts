'use client';

import { useCallback, useState } from 'react';
import useSWR, { mutate as globalMutate, useSWRConfig, type SWRConfiguration, type Key } from 'swr';
import { getSupabaseBrowser } from './supabase/client';
import { sessionRefreshLock } from './session-refresh-lock';
import { logoutState } from './logout-state';

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

async function handleResponse(res: Response, _context?: string): Promise<void> {
  if (res.ok) return;

  const text = await res.text().catch(() => res.statusText);

  if ((res.status === 401 || res.status === 403) && !logoutState.isLoggingOut()) {
    if (logoutState.hasValidSession()) {
      setTimeout(() => {
        window.location.href = '/login?reason=session_expired';
      }, 1500);
    }
  }

  throw new Error(`${res.status}: ${text}`);
}

// ─── apiRequest (non-GET writes) ─────────────────────────────────────────────
//
// Untouched — this is the write path used by mutations. Not an SWR hook.

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
// Serializes a queryKey tuple `[path, paramsObj?, ...]` into a URL with query
// string. Arrays expand to repeated keys. null/undefined/'' skipped so callers
// can pass them through cleanly. SWR consumes the same `qk.*` tuple shape
// TanStack used; this fn is the bridge.

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
// itself. `disableQueryPolling()` sets this flag; the fetcher rejects when
// it's on. Used at logout to stop new requests before the auth state has
// fully unwound.

let pollingDisabled = false;

// ─── Fetcher ─────────────────────────────────────────────────────────────────

export async function fetcher<T = unknown>(key: Key): Promise<T | null> {
  if (pollingDisabled) {
    // Returning null is benign here — SWR caches it as the value for the key
    // but the next call after enableQueryPolling() revalidates from network.
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

  // 401 → refresh-and-retry once
  if (res.status === 401 && headers.Authorization) {
    const supabase = getSupabaseBrowser();
    const result = await sessionRefreshLock.acquireAndRefresh(() =>
      supabase.auth.refreshSession(),
    );
    const refreshed = (result as { data?: { session?: { access_token?: string } } })?.data?.session;
    if (refreshed?.access_token) {
      const retryRes = await fetch(url, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${refreshed.access_token}` },
      });
      await handleResponse(retryRes, `swr ${url} retry`);
      return (await retryRes.json()) as T;
    }
  }

  // Unauthenticated public routes — pre-auth fetches that arrive without a
  // bearer token end up here on first sign-in. Return null rather than throw
  // so a hook in suspense state doesn't render an error.
  if (res.status === 401) return null;

  await handleResponse(res, `swr ${url}`);
  return (await res.json()) as T;
}

// ─── SWR global config ───────────────────────────────────────────────────────
//
// Matches the previous TanStack defaults as closely as possible:
//   - `dedupingInterval`     ≈ TanStack's `staleTime` (no refetch within window)
//   - `revalidateOnFocus`    off (was disabled in TanStack too)
//   - `revalidateOnReconnect` off
//   - `errorRetryCount`      2 (skips on 404 to match the old rule)
//   - `keepPreviousData`     on (paginated lists shouldn't flash blank)
//
// Note: SWR's `isLoading` is true on FIRST load only; subsequent revalidations
// expose `isValidating`. If a page shows a spinner on `isLoading` mid-session
// it'll silently behave differently — spot-check during smoke testing.

export const swrConfig: SWRConfiguration = {
  fetcher,
  dedupingInterval: 5 * 60_000,
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  errorRetryCount: 2,
  shouldRetryOnError: (err: unknown) => {
    if (err instanceof Error && err.message.startsWith('404')) return false;
    return true;
  },
  keepPreviousData: true,
};

// ─── queryClient compat shim ─────────────────────────────────────────────────
//
// The old TanStack `queryClient` exposed `.clear()` and `.invalidateQueries()`
// — three callsites still use them (app-header, sidebar, auth-session-context).
// Rather than rewrite those, expose a tiny shim with the same shape, backed
// by SWR's global `mutate`.

export const queryClient = {
  /** Drop every cached entry. Used on hard logout. */
  clear(): void {
    void globalMutate(() => true, undefined, { revalidate: false });
  },
  /** Mark a key stale and revalidate next time it's read. */
  invalidateQueries(opts: { queryKey: readonly unknown[] }): void {
    void globalMutate(opts.queryKey);
  },
};

// ─── Polling toggles ─────────────────────────────────────────────────────────
//
// Same call signature as before so app-header, sidebar, login, auth-context
// don't need to change.

export function disableQueryPolling(): void {
  pollingDisabled = true;
  clearAuthCache();
  // Cancel + clear in-flight + cached. SWR's global mutate with `() => true`
  // matches every key in the cache.
  void globalMutate(() => true, undefined, { revalidate: false });
}

export function enableQueryPolling(): void {
  pollingDisabled = false;
  // Don't pre-warm — pages will fetch on mount as before.
}

// ─── TanStack-shaped compat hooks ────────────────────────────────────────────
//
// We migrated off `@tanstack/react-query` (security incident upstream). The
// package is gone but the call-site idioms across ~20 pages stay — these
// shims preserve the same option shape so the migration is one-line-per-file
// at the import level. Each hook is a thin wrapper over SWR primitives:
//
//   useQuery       → useSWR
//   useMutation    → useState + apiRequest (no caching needed on the write path)
//   useQueryClient → globalMutate-backed compat object
//
// If you're writing NEW code, prefer calling `useSWR` and `apiRequest` (and
// `mutate(key)` from `swr` for invalidation) directly — these shims exist for
// migration compatibility, not as the long-term API.

/** Mirrors TanStack's QueryFunctionContext (subset). */
export interface QueryFunctionContext {
  queryKey: readonly unknown[];
}

interface UseQueryOptions<T> {
  queryKey: readonly unknown[];
  /** When false, the fetch is skipped. */
  enabled?: boolean;
  /** Window (ms) within which repeat reads of the same key are deduped. */
  staleTime?: number;
  /** Garbage-collection time — unused; SWR's own cache handles this. */
  gcTime?: number;
  /** Number of retry attempts on error. Passed straight through to SWR. */
  retry?: number | boolean;
  refetchOnWindowFocus?: boolean;
  refetchOnMount?: boolean;
  refetchInterval?: number | false;
  /** Caller-supplied fetcher. Receives a `{ queryKey }` context, matching
   *  TanStack's signature so destructuring at the call site keeps working. */
  queryFn?: (ctx: QueryFunctionContext) => Promise<T>;
}

export interface UseQueryResult<T> {
  data: T | undefined;
  error: Error | undefined;
  isLoading: boolean;
  /** TanStack's `isFetching` ≈ SWR's `isValidating`. */
  isFetching: boolean;
  /** True once a successful response has populated `data`. */
  isSuccess: boolean;
  /** Trigger a manual revalidation. */
  refetch: () => Promise<T | undefined>;
}

/**
 * TanStack-shaped `useQuery` wrapper. Routes through SWR for the actual cache
 * and dedup. Passes `queryKey` to SWR verbatim — the `buildUrl` fetcher
 * understands the same tuple shape `qk.*` produces.
 */
export function useQuery<T>(opts: UseQueryOptions<T>): UseQueryResult<T> {
  const enabled = opts.enabled !== false;
  const swrConfig: SWRConfiguration<T> = {};
  if (opts.staleTime !== undefined) swrConfig.dedupingInterval = opts.staleTime;
  if (opts.refetchOnWindowFocus !== undefined) swrConfig.revalidateOnFocus = opts.refetchOnWindowFocus;
  if (opts.refetchOnMount !== undefined) swrConfig.revalidateOnMount = opts.refetchOnMount;
  if (opts.refetchInterval !== undefined && opts.refetchInterval !== false) {
    swrConfig.refreshInterval = opts.refetchInterval;
  }
  if (opts.retry !== undefined) {
    swrConfig.errorRetryCount = typeof opts.retry === 'number' ? opts.retry : opts.retry ? 3 : 0;
  }
  if (opts.queryFn) {
    swrConfig.fetcher = ((k: Key) => opts.queryFn!({ queryKey: Array.isArray(k) ? k : [k] })) as SWRConfiguration<T>['fetcher'];
  }

  const { data, error, isLoading, isValidating, mutate } = useSWR<T>(
    enabled ? opts.queryKey : null,
    swrConfig,
  );

  return {
    data,
    error,
    isLoading,
    isFetching: isValidating,
    isSuccess: data !== undefined && !error,
    refetch: async () => {
      const next = await mutate();
      return next;
    },
  };
}

interface UseMutationOptions<TArgs, TData> {
  mutationFn: (args: TArgs) => Promise<TData>;
  /** Return value is ignored — accepting `unknown` so callers can use
   *  expression-bodied arrow functions like `(d) => toast.success(...)` where
   *  the call returns a toast id. Matches TanStack's permissive shape. */
  onSuccess?: (data: TData, args: TArgs) => unknown;
  onError?: (err: Error, args: TArgs) => unknown;
  onSettled?: (data: TData | undefined, err: Error | undefined, args: TArgs) => unknown;
}

export interface UseMutationResult<TArgs, TData> {
  mutate: (args: TArgs) => void;
  mutateAsync: (args: TArgs) => Promise<TData>;
  isPending: boolean;
  /** Alias of `isPending` for backwards-compat with TanStack v4 call sites. */
  isLoading: boolean;
  data: TData | undefined;
  error: Error | undefined;
  reset: () => void;
}

/**
 * TanStack-shaped `useMutation` wrapper. No cache involvement — the write
 * goes through whatever `mutationFn` does (typically `apiRequest`), and the
 * caller invalidates relevant keys via `useQueryClient().invalidateQueries`.
 */
export function useMutation<TArgs = void, TData = unknown>(
  options: UseMutationOptions<TArgs, TData>,
): UseMutationResult<TArgs, TData> {
  const [isPending, setPending] = useState(false);
  const [data, setData] = useState<TData | undefined>(undefined);
  const [error, setError] = useState<Error | undefined>(undefined);

  const mutateAsync = useCallback(
    async (args: TArgs): Promise<TData> => {
      setPending(true);
      setError(undefined);
      let result: TData | undefined;
      let thrown: Error | undefined;
      try {
        result = await options.mutationFn(args);
        setData(result);
        if (options.onSuccess) await options.onSuccess(result, args);
        return result;
      } catch (err) {
        thrown = err as Error;
        setError(thrown);
        if (options.onError) await options.onError(thrown, args);
        throw thrown;
      } finally {
        setPending(false);
        if (options.onSettled) await options.onSettled(result, thrown, args);
      }
    },
    // mutationFn / onSuccess / onError are deliberately stable in current
    // call sites (created inline each render but referenced via closure).
    // Re-binding is fine — no dep array.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const mutate = useCallback(
    (args: TArgs) => {
      void mutateAsync(args).catch(() => { /* error already handled */ });
    },
    [mutateAsync],
  );

  const reset = useCallback(() => {
    setData(undefined);
    setError(undefined);
    setPending(false);
  }, []);

  return { mutate, mutateAsync, isPending, isLoading: isPending, data, error, reset };
}

/**
 * TanStack-shaped `useQueryClient` hook. Returns a small compat object whose
 * `invalidateQueries` triggers SWR revalidation for the matching key.
 *
 * Prefix matching (`{ queryKey: [path] }` invalidating `[path, params]`) is
 * supported by passing a key-filter function to SWR's `mutate`.
 */
export function useQueryClient(): {
  invalidateQueries: (opts: { queryKey: readonly unknown[] }) => Promise<void>;
  setQueryData: <T>(queryKey: readonly unknown[], data: T) => void;
  clear: () => void;
} {
  const { mutate } = useSWRConfig();
  return {
    invalidateQueries: async (opts) => {
      // Match every cached key whose first element matches the supplied
      // path. This mirrors TanStack's prefix-invalidation semantics.
      const prefix = opts.queryKey[0];
      await mutate(
        (key) => {
          if (Array.isArray(key)) return key[0] === prefix;
          return key === prefix;
        },
        undefined,
        { revalidate: true },
      );
    },
    setQueryData: <T,>(queryKey: readonly unknown[], data: T) => {
      void mutate(queryKey, data, { revalidate: false });
    },
    clear: () => {
      void mutate(() => true, undefined, { revalidate: false });
    },
  };
}
