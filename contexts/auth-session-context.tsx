'use client';

import { createContext, useCallback, useEffect, useRef, useState } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase/client';
import { queryClient, enableQueryPolling, clearAuthCache } from '@/lib/query-client';
import { qk } from '@/lib/query-keys';
import { sessionRefreshLock } from '@/lib/session-refresh-lock';
import { logoutState } from '@/lib/logout-state';
import type { User } from '@supabase/supabase-js';

export interface AuthSessionState {
	user: User | null;
	loading: boolean;
	sessionValid: boolean;
}

const INITIAL_STATE: AuthSessionState = { user: null, loading: true, sessionValid: false };

export const AuthSessionContext = createContext<AuthSessionState>(INITIAL_STATE);

/**
 * Single global owner of the Supabase auth session: ONE onAuthStateChange
 * subscription, ONE init() call, ONE refresh timer. Components consume the
 * state via `useAuthSession()` which is now just a `useContext` read.
 *
 * Why a Provider: previously, every component that called `useAuthSession()`
 * created its own subscription + timers. The sidebar alone has ~15 NavItem
 * components, each calling the hook → 15 subscribers. When Supabase fired
 * SIGNED_IN (on initial mount and on token refresh), each subscriber called
 * `queryClient.invalidateQueries({ queryKey: qk.profile() })`, and React
 * Query queues invalidations behind in-flight fetches → 15 sequential
 * refetches per event. This Provider eliminates that fan-out at the source.
 */
export function AuthSessionProvider({ children }: { children: React.ReactNode }) {
	const [state, setState] = useState<AuthSessionState>(INITIAL_STATE);

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
		if (monitorIntervalRef.current) return;
		monitorIntervalRef.current = setInterval(() => checkAndRefresh(), 5 * 60_000);
	}, [checkAndRefresh]);

	useEffect(() => {
		let mounted = true;
		const supabase = getSupabaseBrowser();

		// Track whether this Provider has already triggered a profile invalidate.
		// Supabase fires SIGNED_IN once at subscription time when there's an
		// existing session — we only want to invalidate on actual NEW sign-ins,
		// not on this first synthesized one.
		let hasFiredInitialSignIn = false;

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
			// Mark that the initial session is set so the upcoming SIGNED_IN
			// event from onAuthStateChange (synthesized for existing session)
			// is treated as the initial event, not a real sign-in.
			hasFiredInitialSignIn = true;
		};

		init();

		const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
			if (!mounted) return;
			if (event === 'SIGNED_OUT' || (!session && event !== 'SIGNED_IN')) {
				logoutState.setSessionValid(false);
				if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
				if (monitorIntervalRef.current) {
					clearInterval(monitorIntervalRef.current);
					monitorIntervalRef.current = null;
				}
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
				startMonitoring();
				if (event === 'SIGNED_IN') {
					if (hasFiredInitialSignIn) {
						// Real sign-in (after a SIGNED_OUT or fresh login flow).
						// Invalidate the profile so we pick up tier/role changes.
						clearAuthCache();
						queryClient.invalidateQueries({ queryKey: qk.profile() });
					} else {
						// First SIGNED_IN at subscription = the existing-session
						// synthesized event. The initial fetch is already gated
						// by `enabled: sessionValid && !loading` in useUserProfile,
						// so no invalidate needed.
						hasFiredInitialSignIn = true;
					}
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

	return (
		<AuthSessionContext.Provider value={state}>
			{children}
		</AuthSessionContext.Provider>
	);
}
