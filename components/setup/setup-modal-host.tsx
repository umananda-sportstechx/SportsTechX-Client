'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import { SETUP_EVENT, type OpenSetupDetail, type SetupWizard } from '@/lib/setup-events';
import { useUrlModal } from '@/hooks/use-url-state';
import { useUserProfile, getUserType } from '@/hooks/use-user-profile';
import { SetupModal } from './setup-modal';

// Each wizard belongs to exactly one tier: the thesis wizard is Scout-only, the
// raise wizard is Raise-only. Gated here so `?setup=thesis` / the event bus can't
// open the wrong wizard for the wrong tier (e.g. a Raise user hitting
// /home?setup=thesis and getting the Scout thesis flow).
const WIZARD_TIER: Record<SetupWizard, 'raise' | 'scout'> = { raise: 'raise', thesis: 'scout' };

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
	const [edit, setEdit] = useState(false);
	// `?setup=raise|thesis` makes the wizard shareable: pasting the URL reopens it,
	// and Back closes it. Event-bus opens stamp the param too.
	const [setupParam, setSetupParam] = useUrlModal('setup');

	// The viewer's tier decides which wizard is allowed. Kept in a ref so the event
	// listener below always sees the latest without re-subscribing.
	const { data: profile, isLoading } = useUserProfile();
	const tier = getUserType(profile);
	const allows = (w: SetupWizard): boolean => tier === WIZARD_TIER[w];
	const allowsRef = useRef(allows);
	allowsRef.current = allows;

	useEffect(() => {
		const onEvent = (e: Event) => {
			const detail = (e as CustomEvent<OpenSetupDetail>).detail;
			if (!detail?.wizard) return;
			if (!allowsRef.current(detail.wizard)) return; // out-of-tier request — ignore
			setWizard(detail.wizard);
			setEdit(!!detail.edit);
			setOpen(true);
			setSetupParam(detail.wizard);
		};
		window.addEventListener(SETUP_EVENT, onEvent);
		return () => window.removeEventListener(SETUP_EVENT, onEvent);
	}, [setSetupParam]);

	// URL-driven: a deep link opens the matching wizard ONLY if it belongs to the
	// viewer's tier; a wrong-tier param is stripped so the wizard never shows. Wait
	// for the profile so we don't block a legitimate viewer while the tier loads.
	useEffect(() => {
		if (setupParam !== 'raise' && setupParam !== 'thesis') {
			if (!setupParam) setOpen(false);
			return;
		}
		// Not `isLoading` alone: until the auth session is ready the profile query
		// is disabled — isLoading false, no data — so the tier read as 'explore'
		// and a cold load of `?setup=thesis` stripped its own param.
		if (isLoading || !profile) return;
		if (allows(setupParam)) {
			setWizard(setupParam);
			setOpen(true);
		} else {
			// Wrong tier — silently strip the param and show nothing.
			setSetupParam(null);
			setOpen(false);
		}
		// `allows` is derived from `tier`, which is in the deps.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [setupParam, isLoading, profile, tier, setSetupParam]);

	// Nothing rendered, and neither wizard's chunk requested, until asked for.
	if (!wizard) return null;

	const close = () => { setOpen(false); setSetupParam(null); };
	const label = edit
		? (wizard === 'thesis' ? 'Edit your investment thesis' : 'Edit your raise')
		: LABEL[wizard];
	return (
		<SetupModal open={open} onClose={close} label={label}>
			{wizard === 'raise' ? <RaiseSetup onClose={close} edit={edit} /> : <Onboarding onClose={close} edit={edit} />}
		</SetupModal>
	);
}
