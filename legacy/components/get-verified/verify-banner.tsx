'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, X } from 'lucide-react';
import { openClaim } from '@/lib/claim-events';

const DISMISS_KEY = 'stx:gv-banner-dismissed';

function VerifyGlyph({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
      <path d="M8 1.2l1.6 1.4 2.1-.2.5 2 1.8 1.1-.9 1.9.5 2.1-1.9.9-.8 2-2.1-.4L8 13.5l-1.6-1.4-2.1.4-.8-2-1.9-.9.5-2.1L1.2 5.5l1.8-1.1.5-2 2.1.2L7.2 1.2z" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinejoin="round" />
      <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Dismissible "own your data" banner for the Companies page (Direction B).
 * Dismissal persists in localStorage so it stays hidden across reloads.
 */
export function VerifyBanner() {
  const [hidden, setHidden] = useState(true);

  // Read dismissal after mount to avoid an SSR/client hydration mismatch
  // (localStorage isn't available during render). Genuine external→state sync.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHidden(localStorage.getItem(DISMISS_KEY) === '1');
  }, []);

  if (hidden) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1');
    setHidden(true);
  };

  return (
    <div className="gv-banner" role="region" aria-label="Get your company verified">
      <span className="gv-banner-glyph"><VerifyGlyph /></span>
      <div className="gv-banner-text">
        <div className="gv-banner-h">
          Is your company in here? Own your data.
          <span className="gv-banner-free">Free · 5 min</span>
        </div>
        <div className="gv-banner-sub">
          Verify your profile to control the funding, stage and contacts investors see — and unlock a free Locker Room Report plus 30 days of Growth access.
        </div>
      </div>
      <div className="gv-banner-actions">
        <Link href="/get-verified" className="btn ghost">Learn more</Link>
        <button className="btn" style={{ background: 'var(--verify)', borderColor: 'var(--verify)' }} onClick={() => openClaim()}>
          Get verified <ArrowRight size={12} />
        </button>
      </div>
      <button className="gv-banner-x" onClick={dismiss} aria-label="Dismiss"><X size={15} /></button>
    </div>
  );
}
