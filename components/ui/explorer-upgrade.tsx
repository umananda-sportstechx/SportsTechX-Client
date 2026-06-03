'use client';

import Link from 'next/link';
import { Sparkles } from 'lucide-react';

/** Free-tier row cap for the Companies table (mirrors ui_design EXPLORER_CAP). */
export const EXPLORER_CAP = 100;

function LockGlyph({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 11V8a6 6 0 1 1 12 0v3" stroke="currentColor" strokeWidth="1.8" fill="none" />
      <rect x="4" y="11" width="16" height="11" rx="1.5" fill="currentColor" />
    </svg>
  );
}

/**
 * Inline upsell banner shown above the Companies table for free (Explorer)
 * users. `capped` is true when results are actually being truncated.
 */
export function ExplorerUpgradeBanner({ capped }: { capped: boolean }) {
  return (
    <div className="co-up-banner">
      <div className="co-up-badge"><Sparkles size={20} /></div>
      <div className="co-up-text">
        <div className="co-up-eyebrow">Explorer plan · limited view</div>
        <div className="co-up-head">
          Explorer shows only the first <b>{EXPLORER_CAP}</b> companies
        </div>
        <div className="co-up-sub">
          {capped
            ? 'You’re seeing a capped slice of the results. Upgrade to Growth to unlock the full database, advanced filters and every data field.'
            : 'Upgrade to Growth to unlock the full database, advanced filters and every data field.'}
        </div>
      </div>
      <div className="co-up-actions">
        <Link className="btn ghost" href="/subscriptions">Compare plans</Link>
        <Link className="btn" href="/subscriptions"><Sparkles size={12} /> Upgrade to Growth</Link>
      </div>
    </div>
  );
}

/** "N more locked" footer shown beneath the capped table for free users. */
export function ExplorerLockedFooter({ hiddenCount }: { hiddenCount: number }) {
  if (hiddenCount <= 0) return null;
  return (
    <div className="co-up-footer">
      <span className="co-up-lock"><LockGlyph size={14} /> {hiddenCount.toLocaleString()} more locked</span>
      <span className="co-up-footer-text">
        <b>{hiddenCount.toLocaleString()}</b> companies are hidden on Explorer. Unlock the full database with Growth.
      </span>
      <Link className="btn" href="/subscriptions"><Sparkles size={12} /> Upgrade to Growth</Link>
    </div>
  );
}
