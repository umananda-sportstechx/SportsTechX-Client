'use client';

import mixpanel from 'mixpanel-browser';

let initialized = false;
let userId: string | null = null;

/**
 * Mixpanel wrapper. Initialised at app boot from the providers tree once the
 * NEXT_PUBLIC_MIXPANEL_TOKEN env var is present; no-op otherwise so dev
 * environments without analytics keys don't error out.
 *
 * Event coverage mirrors the 35+ events from the legacy STX-WebApp client —
 * page views, search/filter usage, AI chat actions, report opens, billing
 * events. Component callers should reach for `useTrack()` rather than
 * importing mixpanel directly so the shape stays consistent.
 */
export function initAnalytics(): void {
	if (initialized) return;
	const token = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;
	if (!token) return;
	mixpanel.init(token, {
		debug: process.env.NODE_ENV !== 'production',
		track_pageview: false,
		persistence: 'localStorage',
	});
	initialized = true;
}

export function identify(profileId: string, traits?: Record<string, unknown>): void {
	if (!initialized) return;
	if (userId === profileId) return;
	mixpanel.identify(profileId);
	if (traits) mixpanel.people.set(traits);
	userId = profileId;
}

export function reset(): void {
	if (!initialized) return;
	mixpanel.reset();
	userId = null;
}

export function track(event: string, props?: Record<string, unknown>): void {
	if (!initialized) return;
	mixpanel.track(event, props);
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
