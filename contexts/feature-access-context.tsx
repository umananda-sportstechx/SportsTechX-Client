'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import useSWR from 'swr';
import { useAuthSession } from '@/hooks/use-auth-session';
import { useUserProfile, useIsAdmin, getUserType, UPGRADE_PATH, type UserType } from '@/hooks/use-user-profile';
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
  const features = data ?? [];
  // True only when the fetch failed AND we have no cached matrix to fall back on.
  const matrixError = !!error && features.length === 0;

  // Per-user overrides: admins can grant individual features outside the tier
  // matrix (e.g. give a free user CSV export). The server returns ONLY active
  // (non-revoked, non-expired) grants so we don't filter client-side.
  const { data: grantsResp } = useSWR<{ data: FeatureGrant[] }>(
    enabled ? qk.me.featureGrants() : null,
    { dedupingInterval: 5 * 60_000, revalidateOnFocus: false },
  );
  const grantedSlugs = new Set((grantsResp?.data ?? []).map((g) => g.feature_slug));

  const [featureMap, setFeatureMap] = useState<Map<string, Feature>>(new Map());

  useEffect(() => {
    if (features.length > 0) {
      const map = new Map<string, Feature>();
      features.forEach(f => {
        map.set(f.slug, f);
        map.set(f.slug.replace(/_/g, '-'), f);
      });
      setFeatureMap(map);
    }
  }, [features]);

  const checkAccess = (slug: string): FeatureAccessResult => {
    if (isAdmin) return { hasAccess: true, isLocked: false, userType, requiredTier: null, isLoading: false, error: false };
    if (profileLoading || isLoading) return { hasAccess: false, isLocked: true, userType, requiredTier: null, isLoading: true, error: false };

    // Matrix fetch failed and there's no cached copy → surface an error so the
    // caller can offer a retry, rather than blanking or showing a wrong paywall.
    if (matrixError) return { hasAccess: false, isLocked: true, userType, requiredTier: null, isLoading: false, error: true };

    // Matrix not available yet (cold cache / in-flight): treat as still-loading
    // rather than "feature absent". Showing a paywall because we simply don't
    // have the matrix would wrongly lock entitled users (this broke pro /analytics).
    if (features.length === 0) return { hasAccess: false, isLocked: true, userType, requiredTier: null, isLoading: true, error: false };

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

    // Cheapest tier above the user's that does have it.
    const requiredTier: UserType | null = hasAccess
      ? null
      : UPGRADE_PATH.slice(UPGRADE_PATH.indexOf(userType) + 1).find((t) => allows(feature, t)) ?? null;

    return { hasAccess, isLocked: !hasAccess, userType, requiredTier, isLoading: false, error: false };
  };

  return (
    <FeatureAccessContext.Provider value={{ checkAccess, isLoading, features, reload: () => { void mutate(); } }}>
      {children}
    </FeatureAccessContext.Provider>
  );
}

export function useFeatureAccessContext() {
  const ctx = useContext(FeatureAccessContext);
  if (!ctx) throw new Error('useFeatureAccessContext must be used within FeatureAccessProvider');
  return ctx;
}

export function useFeatureAccess(slug: string): FeatureAccessResult {
  return useFeatureAccessContext().checkAccess(slug);
}
