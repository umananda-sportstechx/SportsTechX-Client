'use client';

import React, { createContext, useCallback, useContext, useMemo } from 'react';
import useSWR from 'swr';
import { useAuthSession } from '@/hooks/use-auth-session';
import { useUserProfile, useIsAdmin, getUserType, type UserType } from '@/hooks/use-user-profile';
import { qk } from '@/lib/query-keys';

export interface Feature {
  /** A uuid. This was typed `number` and never was one. */
  id: string;
  slug: string;
  name: string;
  /** One flag per tier. No inheritance — a feature lists every tier that has
   *  it, so `feature[userType]` is the whole answer. */
  explore: boolean;
  raise: boolean;
  scout: boolean;
}

/** Read a tier flag off a feature. The server is the only source of truth for
 *  gating — this never infers access the response did not grant. */
function allows(feature: Feature, tier: UserType): boolean {
  return feature[tier] ?? false;
}

/** Paid tiers, cheapest first (Raise €600/yr, Scout €2,500/yr). Explore is free,
 *  so it is never an upgrade target. */
const PAID_BY_PRICE: UserType[] = ['raise', 'scout'];

/** A per-user override fetched from /api/me/feature-grants. Merged on top of
 *  the tier matrix. expires_at=null means permanent. */
interface FeatureGrant {
  feature_slug: string;
  expires_at: string | null;
}

export interface FeatureAccessResult {
  hasAccess: boolean;
  isLocked: boolean;
  userType: UserType;
  requiredTier: UserType | null;
  isLoading: boolean;
  /** The feature matrix failed to load (and there's no cached copy). Callers
   *  should offer a retry rather than render a paywall or blank screen. */
  error: boolean;
}

interface FeatureAccessContextType {
  checkAccess: (slug: string) => FeatureAccessResult;
  isLoading: boolean;
  features: Feature[];
  /** Re-fetch the feature matrix (used by the error/retry UI). */
  reload: () => void;
}

const FeatureAccessContext = createContext<FeatureAccessContextType | null>(null);

export function FeatureAccessProvider({ children }: { children: React.ReactNode }) {
  const { sessionValid, loading: authLoading } = useAuthSession();
  const { data: profile } = useUserProfile();
  const userType = getUserType(profile);
  const { isAdmin, isLoading: profileLoading } = useIsAdmin();

  const enabled = sessionValid && !authLoading;
  const { data, isLoading, error, mutate } = useSWR<Feature[]>(enabled ? qk.features() : null, {
    // Feature matrix barely changes — keep deduped for 30 min and don't refetch
    // on window focus. It MUST still fetch on mount though: a previous
    // `revalidateOnMount:false` meant a cold cache (a hard load / refresh
    // directly on a gated page like /analytics) never fetched the matrix, so
    // every feature read as "not found" and even pro users hit a paywall.
    dedupingInterval: 30 * 60_000,
    revalidateOnFocus: false,
  });
  // Memoised: `data ?? []` minted a fresh array on every render, which made
  // every downstream memo and the context value itself change identity.
  const features = useMemo(() => data ?? [], [data]);
  // True only when the fetch failed AND we have no cached matrix to fall back on.
  const matrixError = !!error && features.length === 0;

  // Per-user overrides: admins can grant individual features outside the tier
  // matrix (e.g. give a free user CSV export). The server returns ONLY active
  // (non-revoked, non-expired) grants so we don't filter client-side.
  const { data: grantsResp } = useSWR<{ data: FeatureGrant[] }>(
    enabled ? qk.me.featureGrants() : null,
    { dedupingInterval: 5 * 60_000, revalidateOnFocus: false },
  );
  const grantedSlugs = useMemo(
    () => new Set((grantsResp?.data ?? []).map((g) => g.feature_slug)),
    [grantsResp],
  );

  // Derived, not stored. As state-plus-effect this forced a second render pass
  // of the whole tree every time the matrix landed. Both spellings are indexed
  // so a slug resolves whether it arrives snake_case or kebab-case.
  const featureMap = useMemo(() => {
    const map = new Map<string, Feature>();
    features.forEach((f) => {
      map.set(f.slug, f);
      map.set(f.slug.replace(/_/g, '-'), f);
    });
    return map;
  }, [features]);

  const checkAccess = useCallback((slug: string): FeatureAccessResult => {
    if (isAdmin) return { hasAccess: true, isLocked: false, userType, requiredTier: null, isLoading: false, error: false };
    if (profileLoading || isLoading) return { hasAccess: false, isLocked: true, userType, requiredTier: null, isLoading: true, error: false };

    // Matrix fetch failed and there's no cached copy → surface an error so the
    // caller can offer a retry, rather than blanking or showing a wrong paywall.
    if (matrixError) return { hasAccess: false, isLocked: true, userType, requiredTier: null, isLoading: false, error: true };

    // Matrix not requested yet (no valid session, so the SWR key is null):
    // genuinely unknown, so report loading rather than "feature absent".
    // Showing a paywall because we simply don't have the matrix would wrongly
    // lock entitled users (this broke pro /analytics).
    if (!enabled) return { hasAccess: false, isLocked: true, userType, requiredTier: null, isLoading: true, error: false };

    // Enabled, settled (isLoading was checked above) and still empty: the matrix
    // really is empty — an unseeded `features` table, or everything
    // `is_active = false`. That is NOT "still loading", and saying so forever is
    // worse than it sounds: any caller that gates a request on `isLoading` hangs
    // with no error and no console output. `market-companies.tsx` does exactly
    // that for a `?sub=` deep link, which turned this latent branch into a
    // permanent spinner. Report it as an error so callers degrade instead.
    if (features.length === 0) return { hasAccess: false, isLocked: true, userType, requiredTier: null, isLoading: false, error: true };

    const normalized = slug.replace(/-/g, '_');
    const feature = featureMap.get(normalized) ?? features.find(f => f.slug === normalized || f.slug.replace(/_/g, '-') === slug);

    if (!feature) return { hasAccess: false, isLocked: true, userType, requiredTier: null, isLoading: false, error: false };

    // Per-user override wins regardless of tier. Lets admins unlock individual
    // features for specific users without bumping their whole tier.
    if (grantedSlugs.has(feature.slug)) {
      return { hasAccess: true, isLocked: false, userType, requiredTier: null, isLoading: false, error: false };
    }

    // The matrix carries one flag per tier with no inheritance, so the user's
    // own flag is the answer. The previous version collapsed five tier names
    // onto three access levels and then OR-ed the flags together, which is why
    // `requiredTier` could only ever come back 'raise' or 'general' — and why
    // every lock badge in the app read "GROWTH".
    const hasAccess = allows(feature, userType);

    // The cheapest paid tier that actually has it.
    //
    // This used to walk UPGRADE_PATH from the user's own position, which
    // assumes a ladder. Raise and Scout are siblings, so for a Scout user
    // locked out of a Raise feature the slice was empty and `requiredTier`
    // came back null — leaving the lock badge unable to name a tier at all.
    const requiredTier: UserType | null = hasAccess
      ? null
      : PAID_BY_PRICE.find((t) => t !== userType && allows(feature, t)) ?? null;

    return { hasAccess, isLocked: !hasAccess, userType, requiredTier, isLoading: false, error: false };
  }, [isAdmin, profileLoading, isLoading, matrixError, enabled, features, featureMap, grantedSlugs, userType]);

  // This provider sits above the whole app, so an unstable value here re-renders
  // every consumer on every render of any of its six reactive inputs.
  const value = useMemo(
    () => ({ checkAccess, isLoading, features, reload: () => { void mutate(); } }),
    [checkAccess, isLoading, features, mutate],
  );

  return <FeatureAccessContext.Provider value={value}>{children}</FeatureAccessContext.Provider>;
}

export function useFeatureAccessContext() {
  const ctx = useContext(FeatureAccessContext);
  if (!ctx) throw new Error('useFeatureAccessContext must be used within FeatureAccessProvider');
  return ctx;
}

export function useFeatureAccess(slug: string): FeatureAccessResult {
  return useFeatureAccessContext().checkAccess(slug);
}
