'use client';

import { QueryClient, type QueryFunction } from '@tanstack/react-query';
import { getSupabaseBrowser } from './supabase/client';
import { sessionRefreshLock } from './session-refresh-lock';
import { logoutState } from './logout-state';

// Token cache: avoid an async Supabase call on every fetch
let cachedAuth: { token: string; expiresAt: number } | null = null;
const AUTH_CACHE_BUFFER_MS = 60_000;

export function clearAuthCache() {
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
    // proceed without auth header
  }

  return {};
}

async function handleResponse(res: Response, context?: string): Promise<void> {
  if (res.ok) return;

  const text = await res.text().catch(() => res.statusText);

  if ((res.status === 401 || res.status === 403) && !logoutState.isLoggingOut()) {
    if (logoutState.hasValidSession()) {
      // Redirect to login after short delay
      setTimeout(() => {
        window.location.href = '/login?reason=session_expired';
      }, 1500);
    }
  }

  throw new Error(`${res.status}: ${text}`);
}

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

function createQueryFn(): QueryFunction {
  return async ({ queryKey }) => {
    const url = queryKey[0] as string;
    const authHeaders = await getAuthHeaders();

    const res = await fetch(url, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
    });

    if (res.status === 401 && authHeaders.Authorization) {
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
        await handleResponse(retryRes, `query ${url} retry`);
        return retryRes.json();
      }
    }

    if (res.status === 401) return null;

    await handleResponse(res, `query ${url}`);
    return res.json();
  };
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: createQueryFn(),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60_000,
      gcTime: 10 * 60_000,
      retry: (count, err) => {
        if (err instanceof Error && err.message.startsWith('404')) return false;
        return count < 2;
      },
    },
    mutations: { retry: 1 },
  },
});

export function disableQueryPolling() {
  clearAuthCache();
  queryClient.getQueryCache().getAll().forEach(q => q.cancel());
  queryClient.setDefaultOptions({
    queries: {
      refetchInterval: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      retry: false,
    },
    mutations: { retry: false },
  });
}

export function enableQueryPolling() {
  queryClient.setDefaultOptions({
    queries: {
      queryFn: createQueryFn(),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60_000,
      gcTime: 10 * 60_000,
      retry: (count, err) => {
        if (err instanceof Error && err.message.startsWith('404')) return false;
        return count < 2;
      },
    },
    mutations: { retry: 1 },
  });
}
