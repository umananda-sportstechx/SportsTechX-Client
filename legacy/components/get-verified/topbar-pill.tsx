'use client';

import { openClaim } from '@/lib/claim-events';

/**
 * "Get verified" pill for the topbar (Direction A). Opens the claim modal at
 * the role chooser. Visible to everyone; a future enhancement can hide it for
 * users who already hold a verified claim.
 */
export function GetVerifiedPill() {
  return (
    <button className="gv-topbar-btn" onClick={() => openClaim()} title="Verify your company — free">
      <span className="gv-topbar-dot" />
      Get verified
    </button>
  );
}
