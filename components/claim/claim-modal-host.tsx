'use client';

import { useEffect, useRef, useState } from 'react';
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
  // Bumped on every open so the modal REMOUNTS: its step/selection/form are seeded
  // once at mount, so re-opening while open (e.g. jumping into editing your own
  // claim from the search list) must start fresh, not keep the old state.
  const opens = useRef(0);
  const [openKey, setOpenKey] = useState(0);

  useEffect(() => {
    const open = (e: Event) => {
      opens.current += 1;
      setOpenKey(opens.current);
      setState((e as CustomEvent<OpenClaimDetail>).detail ?? { target: null, role: null });
    };
    window.addEventListener(CLAIM_EVENT, open);
    return () => window.removeEventListener(CLAIM_EVENT, open);
  }, []);

  if (!state) return null;
  return (
    <ClaimModal
      key={openKey}
      target={state.target}
      initialRole={state.role}
      prefill={state.prefill}
      allowedRoles={state.allowedRoles}
      onClose={() => setState(null)}
    />
  );
}
