'use client';

// Global trigger for the claim/verify modal, mirroring the existing `stx:*`
// CustomEvent idiom used by the app shell (e.g. `stx:open-ai`). Any component
// — a "Get verified" pill, a company-detail footer, the onboarding flow — can
// call `openClaim(...)` without importing the modal; a single mounted
// <ClaimModalHost> (in app/providers.tsx) listens and renders it.

export type ClaimRole = 'founder' | 'investor' | 'operator';

// Minimal pre-selected entity passed when launching a claim from a detail page
// or drawer (e.g. "Is this you? Verify" on a company). Maps onto the wizard's
// pre-filled "claim" mode. Omit to start at the role chooser / search.
export interface ClaimTarget {
  role: ClaimRole;
  /** Existing entity id (company/investor/ecosystem). Omitted for "add new". */
  id?: string | null;
  name?: string;
  website?: string | null;
}

export interface OpenClaimDetail {
  target: ClaimTarget | null;
  role: ClaimRole | null;
}

export const CLAIM_EVENT = 'stx:open-claim';

/**
 * Open the claim modal.
 *  - `openClaim()`                       → role chooser → search → form
 *  - `openClaim(null, 'investor')`       → jump straight into a role's search
 *  - `openClaim({ role:'founder', id, name })` → pre-selected founder claim
 */
export function openClaim(target: ClaimTarget | null = null, role: ClaimRole | null = null): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent<OpenClaimDetail>(CLAIM_EVENT, {
      detail: { target, role: role ?? target?.role ?? null },
    }),
  );
}
