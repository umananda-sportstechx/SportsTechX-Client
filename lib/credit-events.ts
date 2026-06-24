'use client';

// Global trigger for the "out of credits" modal, mirroring the `stx:*`
// CustomEvent idiom used elsewhere (e.g. `stx:open-claim`). The central API
// error handler (lib/query-client.ts) dispatches this on a 402
// INSUFFICIENT_CREDITS, so any AI feature surfaces the same modal — with a CTA
// to buy more credits — without each page wiring it up. A single mounted
// <CreditExhaustionHost> (app/providers.tsx) listens and renders it.

export interface CreditExhaustedDetail {
  /** Credits the operation needed (when known). */
  required?: number;
  /** Credits the user had available (when known). */
  available?: number;
  /** Optional context line, e.g. "to analyze this deck". */
  context?: string;
}

export const CREDITS_EVENT = 'stx:credits-exhausted';

/** Error thrown by the API layer when a request fails with 402 INSUFFICIENT_CREDITS. */
export class InsufficientCreditsError extends Error {
  readonly code = 'INSUFFICIENT_CREDITS';
  readonly required?: number;
  readonly available?: number;
  constructor(message: string, detail?: CreditExhaustedDetail) {
    super(message);
    this.name = 'InsufficientCreditsError';
    this.required = detail?.required;
    this.available = detail?.available;
  }
}

export function isInsufficientCreditsError(err: unknown): err is InsufficientCreditsError {
  return err instanceof Error && (err as { code?: string }).code === 'INSUFFICIENT_CREDITS';
}

/** Open the global "out of credits" modal. */
export function openCreditExhausted(detail: CreditExhaustedDetail = {}): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<CreditExhaustedDetail>(CREDITS_EVENT, { detail }));
}
