'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthSession } from '@/hooks/use-auth-session';
import { useUserProfile, useIsAdmin, getUserType, type UserType } from '@/hooks/use-user-profile';
import { qk } from '@/lib/query-keys';

export interface Feature {
  id: number;
  slug: string;
  name: string;
  free: boolean;
  plus: boolean;
  pro: boolean;
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

  const { data: features = [], isLoading } = useQuery<Feature[]>({
    queryKey: qk.features(),
    staleTime: 30 * 60_000,
    gcTime: 60 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    enabled: sessionValid && !authLoading,
  });

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

    let hasAccess = false;
    let requiredTier: UserType | null = null;

    if (userType === 'pro') {
      hasAccess = feature.pro;
    } else if (userType === 'plus') {
      hasAccess = feature.free || feature.plus;
      if (!hasAccess) requiredTier = 'pro';
    } else {
      hasAccess = feature.free;
      if (!hasAccess) requiredTier = feature.plus ? 'plus' : 'pro';
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
