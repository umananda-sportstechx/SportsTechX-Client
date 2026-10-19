'use client';

/**
 * Opening the setup wizards from anywhere.
 *
 * Both wizards used to be routes — `/setup` for Raise and `/onboarding/scout`
 * for the Scout thesis — which meant prompting someone to finish setup took
 * them away from whatever they were doing. They are modals now, so the prompt
 * can be answered in place, and those two URLs are retired.
 *
 * Same `window` CustomEvent bus as `lib/claim-events.ts`, deliberately: it is
 * the house pattern for a globally-mounted modal (see also `lib/tier-events.ts`
 * and `lib/credit-events.ts`). No context, no store, no URL state.
 */
export type SetupWizard = 'raise' | 'thesis';

export interface OpenSetupDetail {
	wizard: SetupWizard;
	/**
	 * Re-editing an existing, already-complete thesis from settings rather than
	 * onboarding. The wizard then saves + closes with a toast on finish instead
	 * of showing the first-run "you're set up" transition.
	 */
	edit?: boolean;
}

export const SETUP_EVENT = 'stx:open-setup';

function open(wizard: SetupWizard, edit = false): void {
	// SSR has no window; a server-rendered CTA calling this is a no-op rather
	// than a crash.
	if (typeof window === 'undefined') return;
	window.dispatchEvent(new CustomEvent<OpenSetupDetail>(SETUP_EVENT, { detail: { wizard, edit } }));
}

/** The Raise setup wizard (company → raise → traction → readiness → investors).
 *  Pass `{ edit: true }` to re-edit a completed raise (saves + closes, no done screen). */
export const openRaiseSetup = (opts?: { edit?: boolean }): void => open('raise', opts?.edit);

/** The Scout thesis wizard (profile → fund → stage → focus → review). Pass
 *  `{ edit: true }` to re-edit a completed thesis (saves + closes, no done screen). */
export const openScoutThesis = (opts?: { edit?: boolean }): void => open('thesis', opts?.edit);

/**
 * Which wizard a home-screen attention card should open, keyed by the card's
 * `id` — a stable server-side identifier, unlike `cta_href`, which is the thing
 * being retired. Returns null for every other card, which keeps its link.
 */
export const SETUP_CARD_WIZARD: Record<string, SetupWizard> = {
	setup: 'raise',           // raise-home.service.ts — both the no-raise and unfinished branches
	'finish-setup': 'thesis', // scout-home.service.ts
};
