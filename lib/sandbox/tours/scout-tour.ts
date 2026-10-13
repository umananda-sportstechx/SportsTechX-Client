/**
 * "Walk the Pitch" — the Atlas Scout tour.
 *
 * The user plays Jordan Ellis, partner at the fictional Kestrel Field Ventures,
 * whose ready-made workspace and thesis come from scout-routes.ts. Each step's
 * `target` is a `data-tour` attribute on the real page (first list item only).
 *
 * Request patterns match what the pages actually send:
 *   - save to watchlist: SaveToWatchlist → addToWatchlist()
 *     (components/features/watchlists/use-company-watchlists.ts)
 *   - request intro: DealDetail → requestIntro() (components/scout/deal-detail.tsx),
 *     answered with the sandbox's upgrade prompt (402 TIER_REQUIRED).
 * The board's stage change sends no request (it is kept in this browser by
 * components/scout/watchlist-board.tsx), so that step advances on Next.
 */
import type { Tour } from '../tour-types';
import { SANDBOX_FEATURED_DEAL_ID } from '../scout-routes';

export const scoutTour: Tour = {
	product: 'scout',
	intro: {
		title: 'Welcome to Kestrel Field Ventures',
		body: 'You are Jordan Ellis, a partner backing seed to Series A sports tech across Europe. Your thesis is set, so let’s go and find your next deal.',
	},
	steps: [
		{
			id: 'home-matches',
			path: '/home',
			target: 'scout-matches-card',
			title: 'Fresh matches this week',
			body: 'Atlas matches new companies to your thesis. Open the matches card to see who made the squad.',
			advance: { kind: 'path', pattern: '/recommended' },
		},
		{
			id: 'recommended',
			path: '/recommended',
			target: 'scout-open-company',
			title: 'Scored against your thesis',
			body: 'Every company shows which parts of your thesis it hits. Click View company on the top card to see it up close.',
			advance: { kind: 'path', pattern: '/companies/:slug' },
		},
		{
			id: 'company-save',
			path: '/companies/:slug',
			target: 'company-save-watchlist',
			title: 'Keep them on your radar',
			body: 'Click Add to watchlist, then pick a list — it saves the moment you choose one.',
			advance: { kind: 'request', method: 'POST', pattern: '/api/user-watchlists/:wl/companies/:id' },
		},
		{
			id: 'watchlist-open',
			path: '/watchlists',
			target: 'watchlist-open',
			title: 'Your watchlists',
			body: 'All the companies you track live here. Open a watchlist.',
			advance: { kind: 'path', pattern: '/watchlists/:id' },
		},
		{
			id: 'watchlist-board',
			path: '/watchlists/:id',
			target: 'scout-board-toggle',
			title: 'See it as a pipeline',
			body: 'Switch to Board to line up every company by deal stage.',
			advance: { kind: 'click' },
		},
		{
			id: 'watchlist-stage',
			path: '/watchlists/:id',
			target: 'scout-board-stage',
			title: 'Move it up the pitch',
			body: 'Use the stage menu on the top company to move it to Reviewing, then press Next. That is how a first look becomes a first meeting.',
			// `next`, not `click`: the stage menu is a Combobox whose options render
			// in a portal outside this target, and a pick sends no request — a click
			// advance would fire on merely opening the menu, before anything is picked.
			advance: { kind: 'next' },
		},
		{
			id: 'signals',
			path: '/signals',
			title: 'Signals from the market',
			body: 'Fresh funding rounds and companies starting to raise. Spot the momentum before the crowd does.',
			advance: { kind: 'next' },
		},
		{
			id: 'deal-flow',
			path: '/deal-flow',
			target: 'scout-featured-deal',
			title: 'Live raises, verified',
			body: 'Deal Flow lists companies raising right now, checked by SportsTechX. Open this month’s featured deal.',
			advance: { kind: 'path', pattern: `/deal-flow/${SANDBOX_FEATURED_DEAL_ID}` },
		},
		{
			id: 'request-intro',
			path: `/deal-flow/${SANDBOX_FEATURED_DEAL_ID}`,
			target: 'scout-request-intro',
			title: 'Ask for the intro',
			body: 'Request an introduction and send it. In Atlas Scout this goes to the founders as a warm intro from SportsTechX.',
			advance: { kind: 'request', method: 'POST', pattern: '/api/scout/dealflow/:id/interest' },
		},
		{
			id: 'deck-screener',
			path: '/deck',
			target: 'deck-open',
			title: 'Screen the deck in minutes',
			body: 'Atlas reads a pitch deck and scores it section by section. Open the sample screen.',
			advance: { kind: 'path', pattern: '/deck/:id' },
		},
	],
	finale: {
		title: 'Warm-up complete',
		body: 'You ran the full Scout play: matches, watchlists, signals, deal flow and deck screening. With Atlas Scout it runs on your own thesis, with real introductions to founders.',
	},
};
