'use client';

import { createContext, useCallback, useEffect, useRef, useState } from 'react';
import { mutate as globalMutate } from 'swr';
import { getSupabaseBrowser } from '@/lib/supabase/client';
import { enableQueryPolling, clearAuthCache } from '@/lib/query-client';
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
 * `mutate(qk.profile())`, and SWR queues revalidations behind in-flight
 * fetches → 15 sequential refetches per event. This Provider eliminates
 * that fan-out at the source.
 */
export function AuthSessionProvider({ children }: { children: React.ReactNode }) {
	const [state, setState] = useState<AuthSessionState>(INITIAL_STATE);

	const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const monitorIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const visibilityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	/**
	 * Hard logout used when we know the session is unrecoverable — refresh
	 * token revoked, JWT secret rotated, or cookie corruption. We force-clear
	 * the `sb-*` cookies on top of calling signOut(), because signOut() can
	 * silently no-op when the SDK can't talk to Supabase Auth (e.g. when the
	 * refresh token is missing the call returns `{error: AuthSessionMissingError}`
	 * but the rejected cookies sit there forever).
	 */
	const clearAuthCookies = useCallback(() => {
		if (typeof document === 'undefined') return;
		const hostname = window.location.hostname;
		for (const raw of document.cookie.split(';')) {
			const name = raw.split('=')[0]?.trim();
			if (!name?.startsWith('sb-')) continue;
			// Try several path/domain combos so the right cookie definitely
			// drops regardless of how it was set.
			document.cookie = `${name}=; Max-Age=0; path=/;`;
			document.cookie = `${name}=; Max-Age=0; path=/; domain=${hostname};`;
			document.cookie = `${name}=; Max-Age=0; path=/; domain=.${hostname};`;
		}
	}, []);

	const handleSessionExpired = useCallback(() => {
		if (logoutState.isLoggingOut()) return;
		if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
		if (monitorIntervalRef.current) clearInterval(monitorIntervalRef.current);
		const supabase = getSupabaseBrowser();
		// Fire-and-forget signOut; we don't depend on it succeeding because
		// the refresh token may already be invalid (which is precisely why
		// we're here). Forcible cookie clear runs in parallel.
		supabase.auth.signOut().catch(() => undefined);
		clearAuthCookies();
		void globalMutate(() => true, undefined, { revalidate: false });
		logoutState.setSessionValid(false);
		setState({ user: null, loading: false, sessionValid: false });
		// If we're already on an auth page, don't hard-navigate — that
		// reloads the page, resets all React state, and starves the user
		// of any in-progress form input. Cookies and SWR cache are
		// cleared above, so the SWR queries gated on `sessionValid` won't
		// re-fire and we won't loop. Forgot/reset/confirm flows likewise
		// need to stay put.
		const AUTH_PATHS = ['/login', '/signup', '/forgot-password', '/reset-password', '/auth/callback', '/confirm'];
		if (typeof window !== 'undefined' && !AUTH_PATHS.includes(window.location.pathname)) {
			window.location.href = '/login?reason=session_expired';
		}
	}, [clearAuthCookies]);

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
			// If the cookie carries an already-expired access token, don't
			// schedule a refresh — the SDK's own auto-refresh will fire and
			// throw "Invalid Refresh Token: Refresh Token Not Found" if the
			// refresh token is also stale, which is the common case for a
			// long-idle tab. Bail straight to the login flow instead.
			if (session.expires_at && session.expires_at * 1000 <= Date.now()) {
				handleSessionExpired();
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
				if (!logoutState.isLoggingOut()) void globalMutate(() => true, undefined, { revalidate: false });
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
						// Revalidate EVERY query (not just the profile) with the fresh
						// session so the whole page loads in one shot. Previously only
						// the profile was refetched, so other data (companies, favorites,
						// credits, …) stayed empty until a manual refresh — the "needs 2
						// refreshes after login" bug (BUG-035, also BUG-028/032/004).
						clearAuthCache();
						void globalMutate(() => true, undefined, { revalidate: true });
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
	}, [scheduleRefresh, startMonitoring, checkAndRefresh, handleSessionExpired]);

	return (
		<AuthSessionContext.Provider value={state}>
			{children}
		</AuthSessionContext.Provider>
	);
}
