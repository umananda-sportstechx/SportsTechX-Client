'use client';

import { mutate } from 'swr';
import { apiRequest } from '@/lib/query-client';
import { qk } from '@/lib/query-keys';

/**
 * Persist onboarding progress to the profile (PATCH /api/me) and refresh the
 * cached profile so `useUserProfile` reflects the new account_type / stage.
 * The post-signup onboarding flow advances `onboarding_stage` through a small
 * set of tokens ('persona:founder', 'complete', 'skipped').
 */
export async function patchOnboarding(patch: {
  account_type?: 'founder' | 'investor' | 'user';
  onboarding_stage?: string;
  onboarding_complete_free?: boolean;
}): Promise<void> {
  await apiRequest('PATCH', '/api/me', patch);
  await mutate(qk.profile());
}
