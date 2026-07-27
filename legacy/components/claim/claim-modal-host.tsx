'use client';

import { useEffect, useState } from 'react';
import { CLAIM_EVENT, type OpenClaimDetail } from '@/lib/claim-events';
import { ClaimModal } from './claim-modal';

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
      onClose={() => setState(null)}
    />
  );
}
