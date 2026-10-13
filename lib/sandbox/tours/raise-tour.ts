/**
 * "Walk the Pitch" for Atlas Raise: eight moves over the real app, played as the
 * sample company Fanloop (see raise-routes.ts for its ready-made workspace).
 *
 * Each `target` is a `data-tour` attribute on the real element; lists mark only
 * their first item. Paths come from lib/routes.ts so they can't drift.
 */
import { canonicalHrefOf as hrefOf } from '@/lib/routes';
import { SAMPLE_DECK_ID } from '../core-routes';
import type { Tour } from '../tour-types';

const DECK = hrefOf('deck');
const INVESTORS = hrefOf('investors');

export const raiseTour: Tour = {
	product: 'raise',
	intro: {
		title: 'You’re Fanloop. Let’s raise.',
		body: 'You run Fanloop, a Berlin fan-engagement startup raising a €1.5m seed with €300k already committed. Eight quick moves and you’ve seen the whole playbook.',
	},
	steps: [
		{
			id: 'home',
			path: hrefOf('home'),
			target: 'raise-attention-card',
			title: 'Your raise at a glance',
			body: 'Home puts what needs you today up front, starting with follow-ups that slipped. Open the top card.',
			advance: { kind: 'click' },
		},
		{
			id: 'deck',
			path: DECK,
			target: 'deck-open',
			title: 'Your deck scored 71/100',
			body: 'Atlas read Fanloop’s deck the way an investor would and scored every section. Open the full analysis.',
			advance: { kind: 'path', pattern: `${DECK}/:id` },
		},
		{
			id: 'deck-top-fix',
			path: `${DECK}/${SAMPLE_DECK_ID}`,
			target: 'deck-top-fix',
			title: 'Start with the top fix',
			body: 'Recommendations are ranked by how much they lift the score. For Fanloop, a bottom-up market size comes first.',
			advance: { kind: 'next' },
		},
		{
			id: 'investors',
			path: hrefOf('recommended'),
			target: 'raise-top-investor',
			title: 'Investors who fit Fanloop',
			body: 'Atlas matches investors on sector, stage and geography, and says why each one fits. Open your top match.',
			advance: { kind: 'path', pattern: `${INVESTORS}/:id` },
		},
		{
			id: 'investor-profile',
			path: `${INVESTORS}/:id`,
			target: 'raise-add-to-pipeline',
			title: 'Check the fit, then add',
			body: 'Stages, geography and recent deals show whether they back teams like yours. Add them to your watchlist.',
			advance: { kind: 'request', method: 'POST', pattern: '/api/raise/pipeline' },
		},
		{
			id: 'pipeline',
			path: hrefOf('pipeline'),
			target: 'raise-pipeline-card',
			title: 'Move them to Contacted',
			body: 'Your watchlist tracks every investor, stage by stage. Drag the new card to Contacted, or open it and change the stage.',
			advance: { kind: 'request', method: 'PATCH', pattern: '/api/raise/pipeline/:id' },
		},
		{
			id: 'market',
			path: hrefOf('my-market'),
			target: 'raise-market-size',
			title: 'Know your playing field',
			body: 'Market size, growth and funding in your space, built on SportsTechX data. Your competitors are one tab over.',
			advance: { kind: 'next' },
		},
		{
			id: 'copilot',
			path: hrefOf('chat'),
			target: 'chat-suggestion',
			title: 'Ask your co-pilot',
			body: 'The co-pilot knows your raise, your deck and your watchlist. Tap the suggested question to try it.',
			advance: { kind: 'request', method: 'POST', pattern: '/api/chat' },
		},
	],
	finale: {
		title: 'Warm-up done',
		body: 'With Atlas Raise this runs on your own deck, live investor data and your real conversations. Keep looking around Fanloop’s raise, or start yours for real.',
	},
};
