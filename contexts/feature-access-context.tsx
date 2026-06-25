'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import useSWR from 'swr';
import { useAuthSession } from '@/hooks/use-auth-session';
import { useUserProfile, useIsAdmin, getUserType, type UserType } from '@/hooks/use-user-profile';
import { qk } from '@/lib/query-keys';

export interface Feature {
  id: number;
  slug: string;
  name: string;
  free: boolean;
  growth: boolean;
  pro: boolean;
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
}

interface FeatureAccessContextType {
  checkAccess: (slug: string) => FeatureAccessResult;
  isLoading: boolean;
  features: Feature[];
}

const FeatureAccessContext = createContext<FeatureAccessContextType | null>(null);

export function FeatureAccessProvider({ children }: { children: React.ReactNode }) {
  const { sessionValid, loading: authLoading } = useAuthSession();
  const { data: profile } = useUserProfile();
  const userType = getUserType(profile);
  const { isAdmin, isLoading: profileLoading } = useIsAdmin();

  const enabled = sessionValid && !authLoading;
  const { data, isLoading } = useSWR<Feature[]>(enabled ? qk.features() : null, {
    // Feature matrix barely changes — keep deduped for 30 min, no auto-revalidate.
    dedupingInterval: 30 * 60_000,
    revalidateOnFocus: false,
    revalidateOnMount: false,
  });
  const features = data ?? [];

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
    if (isAdmin) return { hasAccess: true, isLocked: false, userType, requiredTier: null, isLoading: false };
    if (profileLoading || isLoading) return { hasAccess: false, isLocked: true, userType, requiredTier: null, isLoading: true };

    const normalized = slug.replace(/-/g, '_');
    const feature = featureMap.get(normalized) ?? features.find(f => f.slug === normalized || f.slug.replace(/_/g, '-') === slug);

    if (!feature) return { hasAccess: false, isLocked: true, userType, requiredTier: null, isLoading: false };

    // Per-user override wins regardless of tier. Lets admins unlock individual
    // features for specific users without bumping their whole tier.
    if (grantedSlugs.has(feature.slug)) {
      return { hasAccess: true, isLocked: false, userType, requiredTier: null, isLoading: false };
    }

    let hasAccess = false;
    let requiredTier: UserType | null = null;

    if (userType === 'pro') {
      // Pro is the top tier — it inherits everything free/growth unlock too, so a
      // feature that's only marked free/growth (not explicitly pro) stays open.
      hasAccess = feature.free || feature.growth || feature.pro;
    } else if (userType === 'growth') {
      hasAccess = feature.free || feature.growth;
      if (!hasAccess) requiredTier = 'pro';
    } else {
      hasAccess = feature.free;
      if (!hasAccess) requiredTier = feature.growth ? 'growth' : 'pro';
    }

    return { hasAccess, isLocked: !hasAccess, userType, requiredTier, isLoading: false };
  };

  return (
    <FeatureAccessContext.Provider value={{ checkAccess, isLoading, features }}>
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
