'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase/client';
import { queryClient, enableQueryPolling, clearAuthCache } from '@/lib/query-client';
import { sessionRefreshLock } from '@/lib/session-refresh-lock';
import { logoutState } from '@/lib/logout-state';
import type { User } from '@supabase/supabase-js';

interface AuthSessionState {
  user: User | null;
  loading: boolean;
  sessionValid: boolean;
}

export function useAuthSession(): AuthSessionState {
  const [state, setState] = useState<AuthSessionState>({
    user: null,
    loading: true,
    sessionValid: false,
  });

  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const monitorIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const visibilityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSessionExpired = useCallback(() => {
    if (logoutState.isLoggingOut()) return;

    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    if (monitorIntervalRef.current) clearInterval(monitorIntervalRef.current);

    const supabase = getSupabaseBrowser();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) return;
      queryClient.clear();
      supabase.auth.signOut().then(() => {
        setState({ user: null, loading: false, sessionValid: false });
        window.location.href = '/login?reason=session_expired';
      });
    });
  }, []);

  const scheduleRefresh = useCallback(
    (expiresAt: number) => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      const delay = expiresAt * 1000 - Date.now() - 5 * 60_000;
      if (delay <= 0) { handleSessionExpired(); return; }
      refreshTimerRef.current = setTimeout(async () => {
        if (logoutState.isLoggingOut()) return;
        const supabase = getSupabaseBrowser();
        const result = await sessionRefreshLock.acquireAndRefresh(() =>
          supabase.auth.refreshSession(),
        );
        const { data, error } = result as { data: { session: { expires_at?: number } | null }; error: Error | null };
        if (error || !data.session) { handleSessionExpired(); return; }
        if (data.session.expires_at) scheduleRefresh(data.session.expires_at);
        clearAuthCache();
      }, delay);
    },
    [handleSessionExpired],
  );

  const checkAndRefresh = useCallback(async () => {
    if (logoutState.isLoggingOut()) return;
    const supabase = getSupabaseBrowser();
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session) { handleSessionExpired(); return; }
    if (session.expires_at) {
      const expiresIn = session.expires_at * 1000 - Date.now();
      if (expiresIn < 10 * 60_000) {
        const result = await sessionRefreshLock.acquireAndRefresh(() =>
          supabase.auth.refreshSession(),
        );
        const { data, error: e } = result as { data: { session: { user: User; expires_at?: number } | null }; error: Error | null };
        if (e || !data.session) { handleSessionExpired(); return; }
        if (data.session.expires_at) scheduleRefresh(data.session.expires_at);
        setState({ user: data.session.user, loading: false, sessionValid: true });
        clearAuthCache();
      }
    }
  }, [handleSessionExpired, scheduleRefresh]);

  const startMonitoring = useCallback(() => {
    monitorIntervalRef.current = setInterval(() => checkAndRefresh(), 5 * 60_000);
  }, [checkAndRefresh]);

  useEffect(() => {
    let mounted = true;
    const supabase = getSupabaseBrowser();

    const init = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (!mounted) return;
      if (error || !session) {
        setState({ user: null, loading: false, sessionValid: false });
        return;
      }
      logoutState.setSessionValid(true);
      setState({ user: session.user, loading: false, sessionValid: true });
      if (session.expires_at) scheduleRefresh(session.expires_at);
      startMonitoring();
      queryClient.invalidateQueries({ queryKey: ['/api/profiles/me'] });
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === 'SIGNED_OUT' || (!session && event !== 'SIGNED_IN')) {
        logoutState.setSessionValid(false);
        if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
        if (monitorIntervalRef.current) clearInterval(monitorIntervalRef.current);
        setState({ user: null, loading: false, sessionValid: false });
        if (!logoutState.isLoggingOut()) queryClient.clear();
        if (logoutState.isLoggingOut()) {
          logoutState.setLoggingOut(false);
          enableQueryPolling();
        }
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        logoutState.setSessionValid(true);
        logoutState.setLoggingOut(false);
        setState({ user: session!.user, loading: false, sessionValid: true });
        if (session!.expires_at) scheduleRefresh(session!.expires_at);
        if (!monitorIntervalRef.current) startMonitoring();
        if (event === 'SIGNED_IN') {
          clearAuthCache();
          queryClient.invalidateQueries({ queryKey: ['/api/profiles/me'] });
        }
      }
    });

    const handleVisibility = () => {
      if (!mounted || logoutState.isLoggingOut()) return;
      if (document.visibilityState === 'visible') {
        if (visibilityTimerRef.current) clearTimeout(visibilityTimerRef.current);
        visibilityTimerRef.current = setTimeout(() => {
          if (!logoutState.isLoggingOut()) checkAndRefresh();
        }, 1000);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibility);
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      if (monitorIntervalRef.current) clearInterval(monitorIntervalRef.current);
      if (visibilityTimerRef.current) clearTimeout(visibilityTimerRef.current);
    };
  }, [scheduleRefresh, startMonitoring, checkAndRefresh]);

  return state;
}
