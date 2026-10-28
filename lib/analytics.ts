'use client';

import type mixpanelType from 'mixpanel-browser';

type MP = typeof mixpanelType;

let initialized = false;
let userId: string | null = null;
let mp: MP | null = null;
// Calls made before the SDK has loaded, replayed in order once it has.
const queue: ((m: MP) => void)[] = [];
const withMp = (fn: (m: MP) => void) => { if (mp) fn(mp); else if (initialized) queue.push(fn); };

/**
 * Mixpanel wrapper. Initialised at app boot from the providers tree once the
 * NEXT_PUBLIC_MIXPANEL_TOKEN env var is present; no-op otherwise so dev
 * environments without analytics keys don't error out.
 *
 * Call `track(Events.x, …)` directly. An earlier version of this comment
 * claimed coverage of "35+ events" and told callers to use a `useTrack()` hook
 * — there were no events wired at all and no such hook has ever existed, so
 * anyone checking whether analytics worked stopped reading here and concluded
 * it did.
 *
 * Currently wired, enough to see the activation funnel: page views (one call in
 * the /app layout), sign in, sign out, company opened, checkout started.
 * `Events` lists the rest as named, agreed slots — adding one is a `track`
 * call, not a decision.
 */
export function initAnalytics(): void {
	if (initialized) return;
	const token = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;
	if (!token) return;
	initialized = true;
	// Off the critical path. The SDK was imported eagerly and, with its bundled
	// session recorder, was the largest chunk every page shipped (~400 KB) —
	// before anything rendered. It now loads once the browser is idle, and only
	// the recorder-free core build: session replay was never turned on.
	const load = () => {
		import('mixpanel-browser/dist/mixpanel-core.cjs.js')
			.then(({ default: m }) => {
				m.init(token, {
					debug: process.env.NODE_ENV !== 'production',
					track_pageview: false,
					persistence: 'localStorage',
				});
				mp = m;
				queue.splice(0).forEach((fn) => fn(m));
			})
			.catch(() => { /* analytics is best-effort; a blocked script must not break the app */ });
	};
	if ('requestIdleCallback' in window) window.requestIdleCallback(load, { timeout: 4000 });
	else setTimeout(load, 1500);
}

export function identify(profileId: string, traits?: Record<string, unknown>): void {
	if (!initialized) return;
	if (userId === profileId) return;
	userId = profileId;
	withMp((m) => { m.identify(profileId); if (traits) m.people.set(traits); });
}

export function reset(): void {
	if (!initialized) return;
	userId = null;
	withMp((m) => m.reset());
}

export function track(event: string, props?: Record<string, unknown>): void {
	if (!initialized) return;
	withMp((m) => m.track(event, props));
}

export function trackPage(path: string, title?: string): void {
	track('page_viewed', { path, title });
}

/** Canonical event names so we don't typo at call sites. */
export const Events = {
	signedIn: 'signed_in',
	signedOut: 'signed_out',
	pageViewed: 'page_viewed',
	companySearched: 'company_searched',
	companyOpened: 'company_opened',
	dealOpened: 'deal_opened',
	investorOpened: 'investor_opened',
	reportOpened: 'report_opened',
	reportDownloaded: 'report_downloaded',
	filterApplied: 'filter_applied',
	savedSearchCreated: 'saved_search_created',
	chatTurnSent: 'chat_turn_sent',
	chatSuggestionUsed: 'chat_suggestion_used',
	chatExported: 'chat_exported',
	billingCheckoutStarted: 'billing_checkout_started',
	billingPortalOpened: 'billing_portal_opened',
} as const;
