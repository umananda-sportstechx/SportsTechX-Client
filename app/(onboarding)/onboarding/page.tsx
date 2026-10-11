'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import type { AccountType } from '@/hooks/use-user-profile';
import type { ClaimRole } from '@/lib/claim-events';
import { patchOnboarding } from '@/lib/onboarding';
import { AuthBrand } from '@/components/auth/auth-shell';
import { PersonaStep } from '@/components/onboarding/persona-step';
import { PaywallGate } from '@/components/paywall/paywall-gate';

// Loaded only once a persona branches into the claim flow. A static import here
// put ~750 lines into this route's bundle for a modal two of the three paths
// never reach — the same cost `claim-modal-host.tsx` was changed to avoid, which
// this route had quietly kept.
const ClaimModal = dynamic(() => import('@/components/claim/claim-modal').then((m) => m.ClaimModal), { ssr: false });

/**
 * What a new account sees after confirming its email: the plan chooser, then
 * the persona picker.
 *
 * `PaywallGate` is a fixed overlay that self-suppresses once `paywall_shown_at`
 * is stamped, so it covers this page until the visitor picks a plan and then
 * uncovers the persona step underneath. Choosing Explore stamps and stays;
 * choosing Raise or Scout leaves for Stripe and comes back via
 * `/billing/success`, which waits for the webhook before stamping anything.
 *
 * It sits on this route rather than in the app shell on purpose — as an overlay
 * over the dashboard it would have ambushed every pre-existing unstamped
 * account, including people already paying.
 */
export default function OnboardingPage() {
	const router = useRouter();
	const [busy, setBusy] = useState(false);
	const [claimRole, setClaimRole] = useState<ClaimRole | null>(null);

	const goDashboard = () => router.push('/home');

	async function choose(persona: AccountType) {
		setBusy(true);
		try {
			if (persona === 'user') {
				await patchOnboarding({ account_type: 'user', onboarding_stage: 'complete', onboarding_complete_explore: true });
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
		void patchOnboarding({ onboarding_stage: 'complete', onboarding_complete_explore: true });
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
		<div className="onb-screen">
			{/* Covers this page until a plan is chosen, then uncovers the persona
			    step below. Renders nothing once `paywall_shown_at` is stamped. */}
			<PaywallGate />
			<div className="onb-screen__inner">
				<div className="onb-head">
					<AuthBrand />
					<h1 className="onb-head__title">Welcome — what brings you here?</h1>
					<p className="onb-head__sub">
						This helps us tailor what you see. You can change it later in Settings.
					</p>
				</div>

				<PersonaStep onChoose={choose} />

				<button type="button" className="onb-skip" onClick={skip} disabled={busy}>
					{busy && <Loader2 size={13} className="animate-spin" />}
					Skip for now
				</button>
			</div>
		</div>
	);
}
