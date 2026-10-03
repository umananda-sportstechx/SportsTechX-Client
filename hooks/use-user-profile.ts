'use client';

import useSWR from 'swr';
import { useAuthSession } from './use-auth-session';
import { qk } from '@/lib/query-keys';

// The three tiers Atlas sells, cheapest first. The order is the upgrade path,
// so `UPGRADE_PATH.indexOf()` is a valid comparison.
export const UPGRADE_PATH = ['explore', 'raise', 'scout'] as const;
export type UserType = (typeof UPGRADE_PATH)[number];

/** Display name for a tier. */
export const TIER_LABEL: Record<UserType, string> = {
  explore: 'Explore',
  raise: 'Raise',
  scout: 'Scout',
};

// Self-declared persona, orthogonal to user_role (RBAC) and user_type (tier).
// null = undeclared (treated as a regular 'user'). A verified claim is the
// authoritative "verified founder/investor" layer on top of this hint.
export type AccountType = 'founder' | 'investor' | 'user';

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  display_name: string | null;
  referral_code: string | null;
  // `user_role` is the RBAC role: 'admin' | 'user'. Gates the admin panel
  // and any @RequireRole('admin') endpoints on the server.
  user_role: string | null;
  // `user_type` is the subscription tier: 'explore' | 'raise' | 'scout'.
  // Drives feature gating in the user-facing app, NOT admin access.
  user_type: string | null;
  user_type_detail: string | null;
  // Free-text "what brings you to Atlas", from Explore onboarding.
  background?: string | null;
  // `account_type` is the self-declared persona set at onboarding.
  account_type: AccountType | null;
  // Set once the user has seen the post-login plan paywall.
  paywall_shown_at?: string | null;
  avatar_url: string | null;
  company_name: string | null;
  job_title: string | null;
  is_trial: boolean | null;
  trial_ends_at: string | null;
  stripe_customer_id: string | null;
  intercom_hash: string | null;
  // Notification preference flags (PATCH /api/profiles/me writes back).
  notification_newsletter: boolean | null;
  notification_email: boolean | null;
  notification_marketing: boolean | null;
  notification_updates: boolean | null;
  notification_funding_alerts: boolean | null;
  notification_ma_alerts: boolean | null;
  notification_report_releases: boolean | null;
  notification_programs_deadline: boolean | null;
  // Onboarding progress. `onboarding_stage` is a free-text token the client
  // advances through the post-signup flow; the per-tier complete flags mark a
  // finished onboarding for that tier.
  onboarding_stage: string | null;
  onboarding_complete_explore: boolean | null;
  onboarding_complete_raise: boolean | null;
  onboarding_complete_scout: boolean | null;
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
  const raw = profile?.user_type?.toLowerCase();
  // Validated rather than cast. The old cast let any string through, so a
  // profile holding a retired label landed in whatever branch happened to
  // catch it rather than on the base tier.
  return (UPGRADE_PATH as readonly string[]).includes(raw ?? '') ? (raw as UserType) : 'explore';
}

// Resolve the self-declared persona, defaulting an undeclared profile to 'user'.
export function getAccountType(profile: Profile | null | undefined): AccountType {
  return (profile?.account_type as AccountType) ?? 'user';
}

export function useIsAdmin() {
  const { data: profile, isLoading } = useUserProfile();
  return {
    isAdmin: profile?.user_role === 'admin',
    isLoading,
    profile,
  };
}
