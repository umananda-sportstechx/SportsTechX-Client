'use client';

import type { ClaimForm } from '@/components/claim/claim-form';

// Global trigger for the claim/verify modal, mirroring the existing `stx:*`
// CustomEvent idiom used by the app shell (e.g. `stx:open-ai`). Any component
// — a "Get verified" pill, a company-detail footer, the onboarding flow — can
// call `openClaim(...)` without importing the modal; a single mounted
// <ClaimModalHost> (in app/providers.tsx) listens and renders it.

export type ClaimRole = 'founder' | 'investor' | 'operator';

/** Fields to pre-fill the claim form with — e.g. from the Raise Setup answers,
 *  so a founder verifying right after setup only fills the remaining fields. */
export type ClaimPrefill = Partial<ClaimForm>;

// Minimal pre-selected entity passed when launching a claim from a detail page
// or drawer (e.g. "Is this you? Verify" on a company). Maps onto the wizard's
// pre-filled "claim" mode. Omit to start at the role chooser / search.
export interface ClaimTarget {
  role: ClaimRole;
  /** Existing entity id (company/investor/ecosystem). Omitted for "add new". */
  id?: string | null;
  name?: string;
  website?: string | null;
  /** True when the viewer already holds a *verified* claim on this entity, so
   *  the modal opens in edit mode and submits a data-change-request (which
   *  leaves the live record untouched) instead of creating a new claim. */
  verified?: boolean;
  /** The viewer's own claim id for this entity. When set, the modal loads that
   *  claim's submitted data (GET /api/claims/:id/form) back into the form so an
   *  edit starts from the real values, not a blank form. */
  claimId?: string;
}

export interface OpenClaimDetail {
  target: ClaimTarget | null;
  role: ClaimRole | null;
  prefill?: ClaimPrefill;
  /** Which roles the chooser may offer. Omitted means all three. */
  allowedRoles?: ClaimRole[];
}

export const CLAIM_EVENT = 'stx:open-claim';

/**
 * Open the claim modal.
 *  - `openClaim()`                       → role chooser → search → form
 *  - `openClaim(null, 'investor')`       → jump straight into a role's search
 *  - `openClaim({ role:'founder', id, name })` → pre-selected founder claim
 *  - `openClaim({ role:'founder', id }, 'founder', prefill)` → pre-filled from Raise Setup
 *  - `openClaim(null, null, undefined, ['founder','operator'])` → a chooser
 *    limited to the roles this tier may claim (see `rolesForTier`)
 */
export function openClaim(
  target: ClaimTarget | null = null,
  role: ClaimRole | null = null,
  prefill?: ClaimPrefill,
  allowedRoles?: ClaimRole[],
): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent<OpenClaimDetail>(CLAIM_EVENT, {
      detail: { target, role: role ?? target?.role ?? null, prefill, allowedRoles },
    }),
  );
}
