'use client';

import { activeSandbox, exitPractice, replayTour, startWalkthrough } from '@/lib/sandbox/store';
import type { SandboxProduct } from '@/lib/sandbox/types';
import { hrefOf } from '@/lib/routes';
import { track } from '@/lib/analytics';

/*
 * Entering, replaying and leaving practice all end in a full page load, so every
 * tier reader and the SWR cache start fresh (sample data in, or real data back).
 */

/**
 * Start a product's walkthrough from any entry point. `source` is for
 * analytics only. `homeHref` defaults to the real app's `/home` — the
 * pre-signup `/preview/[product]/*` tour (app/preview/) has no session to
 * land in there, so it passes its own `/preview/<product>/home` instead.
 */
export function enterPractice(product: SandboxProduct, source: string, homeHref: string = hrefOf('home')) {
	track(`walkthrough:${product}:start`, { source });
	startWalkthrough(product);
	window.location.assign(homeHref);
}

/** Run the active tour again from step 1, on a fresh sample workspace. */
export function restartPractice(homeHref: string = hrefOf('home')) {
	const product = activeSandbox();
	if (!product) return;
	track(`walkthrough:${product}:replay`);
	replayTour();
	window.location.assign(homeHref);
}

/** Leave practice and go to `to` with the real account. */
export function leavePractice(to: string) {
	exitPractice();
	window.location.assign(to);
}
