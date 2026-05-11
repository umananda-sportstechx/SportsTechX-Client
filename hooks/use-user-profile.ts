'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthSession } from './use-auth-session';
import { qk } from '@/lib/query-keys';

export type UserType = 'free' | 'plus' | 'pro';

export interface Profile {
  id: string;
  email: string | null;
  display_name: string | null;
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
  return useQuery<Profile>({
    queryKey: qk.profile(),
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    retry: 1,
    enabled: sessionValid && !loading,
  });
}

export function getUserType(profile: Profile | null | undefined): UserType {
  if (!profile) return 'free';
  return (profile.user_type?.toLowerCase() as UserType) ?? 'free';
}

export function useIsAdmin() {
  const { data: profile, isLoading } = useUserProfile();
  return {
    isAdmin: profile?.user_type_detail === 'admin',
    isLoading,
    profile,
  };
}
