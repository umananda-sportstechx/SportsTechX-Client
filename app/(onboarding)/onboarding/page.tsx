'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import type { AccountType } from '@/hooks/use-user-profile';
import type { ClaimRole } from '@/lib/claim-events';
import { patchOnboarding } from '@/lib/onboarding';
import { PersonaStep } from '@/components/onboarding/persona-step';
import { ClaimModal } from '@/components/claim/claim-modal';

export default function OnboardingPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [claimRole, setClaimRole] = useState<ClaimRole | null>(null);

  const goDashboard = () => router.push('/dashboard');

  async function choose(persona: AccountType) {
    setBusy(true);
    try {
      if (persona === 'user') {
        await patchOnboarding({ account_type: 'user', onboarding_stage: 'complete', onboarding_complete_free: true });
        goDashboard();
        return;
      }
      await patchOnboarding({ account_type: persona, onboarding_stage: `persona:${persona}` });
      setClaimRole(persona === 'founder' ? 'founder' : 'investor');
    } finally {
      setBusy(false);
    }
  }

  async function skip() {
    setBusy(true);
    try {
      await patchOnboarding({ onboarding_stage: 'skipped' });
      goDashboard();
    } finally {
      setBusy(false);
    }
  }

  // When the claim is submitted, mark onboarding done; closing the modal (incl.
  // the "Back to the platform" button on the done screen) returns to the app.
  function onClaimSubmitted() {
    void patchOnboarding({ onboarding_stage: 'complete', onboarding_complete_free: true });
  }

  if (claimRole) {
    return (
      <ClaimModal
        target={null}
        initialRole={claimRole}
        onClose={goDashboard}
        onSubmitted={onClaimSubmitted}
      />
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <h1 className="font-display text-3xl font-extrabold tracking-wider text-primary">SPORTSTECHX</h1>
          <h2 className="mt-6 font-display text-2xl font-bold tracking-tight">Welcome — what brings you here?</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            This helps us tailor what you see. You can change it later in Settings.
          </p>
        </div>

        <PersonaStep onChoose={choose} />

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={skip}
            disabled={busy}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline disabled:opacity-50"
          >
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}
