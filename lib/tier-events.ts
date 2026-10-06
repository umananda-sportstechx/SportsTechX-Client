'use client';

// Global trigger for the "this needs another plan" modal, mirroring the `stx:*`
// CustomEvent idiom used elsewhere (e.g. `stx:credits-exhausted`,
// `stx:open-claim`). The central API error handler (lib/query-client.ts)
// dispatches this on a 402 TIER_REQUIRED, so any gated endpoint surfaces the
// same modal without each caller wiring it up. A single mounted
// <TierRequiredHost> (app/providers.tsx) listens and renders it.
//
// This is the third consumer of `lib/access.ts` that its header names — the
// route gate and the nav were the other two. Before this, a tier refusal
// reached the user as the server's raw string, "requires tier: raise".

import type { Tier } from './access';

export interface TierRequiredDetail {
  /** Tiers that would unlock it, from the server's `requiredTiers`. */
  requiredTiers?: Tier[];
  /** The viewer's tier, from the server's `currentTier`. */
  currentTier?: Tier;
  /** The server's own message, kept as a fallback for an unknown tier. */
  message?: string;
}

export const TIER_EVENT = 'stx:tier-required';

/** Error thrown by the API layer when a request fails with 402 TIER_REQUIRED. */
export class TierRequiredError extends Error {
  readonly code = 'TIER_REQUIRED';
  readonly requiredTiers?: Tier[];
  readonly currentTier?: Tier;
  constructor(message: string, detail?: TierRequiredDetail) {
    super(message);
    this.name = 'TierRequiredError';
    this.requiredTiers = detail?.requiredTiers;
    this.currentTier = detail?.currentTier;
  }
}

export function isTierRequiredError(err: unknown): err is TierRequiredError {
  return err instanceof Error && (err as { code?: string }).code === 'TIER_REQUIRED';
}

/** Open the global "needs another plan" modal. */
export function openTierRequired(detail: TierRequiredDetail = {}): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<TierRequiredDetail>(TIER_EVENT, { detail }));
}
