'use client';

import Link from 'next/link';
import { Lock, ArrowRight } from 'lucide-react';
import { useFeatureAccess } from '@/contexts/feature-access-context';
import { TIER_LABEL, type UserType } from '@/hooks/use-user-profile';

// Falls back to Raise, the cheapest paid tier — the branch is only reached
// when the matrix has not named a required tier.
function tierLabel(required: UserType | null): { TIER: string; label: string } {
  const label = TIER_LABEL[required ?? 'raise'];
  return { TIER: label.toUpperCase(), label };
}

/**
 * Small RAISE/SCOUT pill for a tab label when the tab's feature is locked for
 * the current user. Renders nothing when the user has access.
 */
export function TabLockBadge({ slug }: { slug: string }) {
  const access = useFeatureAccess(slug);
  if (access.isLoading || access.hasAccess) return null;
  const { TIER } = tierLabel(access.requiredTier);
  return <span className="tab-lock-badge">{TIER}</span>;
}

/**
 * Wraps a detail-page tab body. If the user lacks the feature, the content is
 * blurred behind a compact upgrade overlay (mirrors ui_design ProLockedTab);
 * otherwise the children render normally. While the matrix loads, children
 * render to avoid a flash.
 */
export function ProLockedTab({
  slug,
  title,
  children,
}: {
  slug: string;
  title: string;
  children: React.ReactNode;
}) {
  const access = useFeatureAccess(slug);
  if (access.isLoading || access.hasAccess) return <>{children}</>;

  const { label } = tierLabel(access.requiredTier);
  return (
    <div className="pro-lock-wrap">
      <div className="pro-lock-blur" aria-hidden="true">{children}</div>
      <div className="pro-lock-overlay" role="region" aria-label={`${title} is part of ${label}`}>
        <span className="pro-lock-icon"><Lock size={22} /></span>
        <div className="pro-lock-title">{title} is part of {label}</div>
        <div className="pro-lock-sub">Upgrade to {label} to unlock this section and every data field.</div>
        <Link href="/subscriptions" className="btn">Upgrade to {label} <ArrowRight size={13} /></Link>
      </div>
    </div>
  );
}
