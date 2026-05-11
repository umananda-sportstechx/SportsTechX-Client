'use client';

import { useContext } from 'react';
import { AuthSessionContext, type AuthSessionState } from '@/contexts/auth-session-context';

/**
 * Read the global Supabase auth session state. The actual subscription,
 * refresh timers, visibility listener, and onAuthStateChange handler live
 * in `AuthSessionProvider` (mounted once in `app/providers.tsx`). This hook
 * is a thin context reader so calling it in many components is free — no
 * per-instance subscription cost.
 *
 * Migrated from a per-instance state hook on 2026-05-08 after the multi-
 * subscriber pattern caused 10+ sequential `/api/profiles/me` refetches
 * whenever Supabase fired SIGNED_IN or TOKEN_REFRESHED — every subscriber
 * called invalidateQueries, and React Query queues invalidations behind
 * in-flight fetches.
 */
export function useAuthSession(): AuthSessionState {
	return useContext(AuthSessionContext);
}
