'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { SETUP_EVENT, type OpenSetupDetail, type SetupWizard } from '@/lib/setup-events';
import { SetupModal } from './setup-modal';

/**
 * Mounts the two setup wizards once, for the whole app, and opens whichever one
 * `openRaiseSetup()` / `openScoutThesis()` asks for.
 *
 * Both are dynamically imported and `ssr: false`, which matters more than the
 * usual bundle-size argument: the thesis wizard's `useThesisState` fires five
 * SWR requests (scout profile, thesis, sectors, round types, sports). A static
 * import here would run all five on every page in the product, for everyone,
 * whether or not they ever open it. Nothing is loaded until the first event.
 *
 * Same shape as `components/claim/claim-modal-host.tsx`, with one deliberate
 * difference: `open` and `wizard` are separate state, so closing hides the
 * modal without unmounting the wizard mid-flight. Both wizards persist each
 * step as it is left, so a close is recoverable either way — but there is no
 * reason to throw away the current step's in-progress edits as well.
 */
const RaiseSetup = dynamic(() => import('@/components/raise/raise-setup').then((m) => m.RaiseSetup), { ssr: false });
const Onboarding = dynamic(() => import('@/components/scout/onboarding').then((m) => m.Onboarding), { ssr: false });

const LABEL: Record<SetupWizard, string> = {
	raise: 'Set up your raise',
	thesis: 'Set up your investment thesis',
};

export function SetupModalHost() {
	const [open, setOpen] = useState(false);
	const [wizard, setWizard] = useState<SetupWizard | null>(null);

	useEffect(() => {
		const onEvent = (e: Event) => {
			const detail = (e as CustomEvent<OpenSetupDetail>).detail;
			if (!detail?.wizard) return;
			setWizard(detail.wizard);
			setOpen(true);
		};
		window.addEventListener(SETUP_EVENT, onEvent);
		return () => window.removeEventListener(SETUP_EVENT, onEvent);
	}, []);

	// Nothing rendered, and neither wizard's chunk requested, until asked for.
	if (!wizard) return null;

	const close = () => setOpen(false);
	return (
		<SetupModal open={open} onClose={close} label={LABEL[wizard]}>
			{wizard === 'raise' ? <RaiseSetup onClose={close} /> : <Onboarding onClose={close} />}
		</SetupModal>
	);
}
