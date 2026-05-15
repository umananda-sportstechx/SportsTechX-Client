'use client';

import useSWR from 'swr';
import { useAuthSession } from './use-auth-session';
import { qk } from '@/lib/query-keys';

export type UserType = 'free' | 'plus' | 'pro';

export interface Profile {
  id: string;
  email: string | null;
  display_name: string | null;
  // `user_role` is the RBAC role: 'admin' | 'user'. Gates the admin panel
  // and any @RequireRole('admin') endpoints on the server.
  user_role: string | null;
  // `user_type` is the subscription tier: 'free' | 'plus' | 'pro'. Drives
  // feature gating in the user-facing app, NOT admin access.
  user_type: string | null;
  user_type_detail: string | null;
  avatar_url: string | null;
  company_name: string | null;
  job_title: string | null;
  is_trial: boolean | null;
  trial_ends_at: string | null;
  stripe_customer_id: string | null;
  intercom_hash: string | null;
  created_at: string;
}

export function useUserProfile() {
  const { sessionValid, loading } = useAuthSession();
  // Conditional key: passing null to useSWR is the documented way to disable
  // a fetch (equivalent to TanStack's `enabled: false`). When sessionValid
  // flips true, SWR rebuilds the key and fetches.
  const enabled = sessionValid && !loading;
  return useSWR<Profile>(enabled ? qk.profile() : null, {
    dedupingInterval: 5 * 60_000,
    errorRetryCount: 1,
  });
}

export function getUserType(profile: Profile | null | undefined): UserType {
  if (!profile) return 'free';
  return (profile.user_type?.toLowerCase() as UserType) ?? 'free';
}

export function useIsAdmin() {
  const { data: profile, isLoading } = useUserProfile();
  return {
    isAdmin: profile?.user_role === 'admin',
    isLoading,
    profile,
  };
}
