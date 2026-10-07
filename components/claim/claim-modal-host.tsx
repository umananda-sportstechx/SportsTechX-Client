'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { CLAIM_EVENT, type OpenClaimDetail } from '@/lib/claim-events';

// Loaded on the first `stx:open-claim`, not at import time. This host is
// mounted in app/providers, so a static import put all ~750 lines of the modal
// (plus its form, DTO and reference hooks) into the bundle of every route in
// the app, for a component most sessions never open.
const ClaimModal = dynamic(() => import('./claim-modal').then((m) => m.ClaimModal), { ssr: false });

/**
 * Single mounted listener for `stx:open-claim` events. Lives in app/providers
 * so every authed surface (app shell + onboarding) can call `openClaim(...)`
 * without importing the modal. Renders nothing until an event arrives.
 */
export function ClaimModalHost() {
  const [state, setState] = useState<OpenClaimDetail | null>(null);

  useEffect(() => {
    const open = (e: Event) => setState((e as CustomEvent<OpenClaimDetail>).detail ?? { target: null, role: null });
    window.addEventListener(CLAIM_EVENT, open);
    return () => window.removeEventListener(CLAIM_EVENT, open);
  }, []);

  if (!state) return null;
  return (
    <ClaimModal
      target={state.target}
      initialRole={state.role}
      prefill={state.prefill}
      onClose={() => setState(null)}
    />
  );
}
