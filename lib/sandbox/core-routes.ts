/**
 * Sandbox routes shared by Raise and Scout: deck analysis, AI chat, exports,
 * API keys / webhooks, company contacts and list caps. Product-specific data
 * lives in raise-routes.ts and scout-routes.ts.
 */
import type { DeckScorecard } from '@/lib/deck-analysis';
import { daysFromNow, gated, json, sse, type SandboxRoute } from './types';

/** Free AI chat messages in the sandbox before the upgrade prompt. */
export const SANDBOX_CHAT_LIMIT = 3;
/** Rows shown in Raise/Scout-only lists (investors, recently funded…). */
export const SANDBOX_LIST_CAP = 10;

const SAMPLE_DECK_ID = 'sandbox-deck';
const PRODUCT_NAME = { raise: 'Atlas Raise', scout: 'Atlas Scout' } as const;

const SCORECARD: DeckScorecard = {
	overall_score: 71,
	verdict: 'A credible deck with a clear problem and early traction. Market sizing and go-to-market need more evidence before Series A conversations, and the financial plan should tie hiring to milestones.',
	sections: [
		{ key: 'problem', label: 'Problem', score: 8, page_refs: [2], quote: 'Clubs lose 30% of season-ticket holders each year.' },
		{ key: 'solution', label: 'Solution', score: 7, page_refs: [3], quote: null },
		{ key: 'market', label: 'Market', score: 5, page_refs: [5], quote: null },
		{ key: 'product', label: 'Product', score: 7, page_refs: [4], quote: null },
		{ key: 'business_model', label: 'Business model', score: 6, page_refs: [7], quote: null },
		{ key: 'competition', label: 'Competition', score: 6, page_refs: [8], quote: null },
		{ key: 'gtm', label: 'Go-to-market', score: 5, page_refs: [9], quote: null },
		{ key: 'traction', label: 'Traction', score: 8, page_refs: [6], quote: '14 clubs live, 3x ARR in 12 months.' },
		{ key: 'financials', label: 'Financials', score: 6, page_refs: [11], quote: null },
		{ key: 'team', label: 'Team', score: 8, page_refs: [10], quote: null },
		{ key: 'ask', label: 'The ask', score: 7, page_refs: [12], quote: null },
	],
	strengths: ['Clear, specific problem statement', 'Strong early traction with named clubs', 'Experienced founding team'],
	risks: ['Market size relies on top-down estimates', 'Go-to-market beyond the first league is unproven', 'Use of funds is not tied to milestones'],
	suggestions: [
		{ area: 'Market', suggestion: 'Rebuild the market size bottom-up from clubs × average contract value.', page_ref: 5, quote: null },
		{ area: 'Go-to-market', suggestion: 'Show the playbook for entering a second league, with pipeline evidence.', page_ref: 9, quote: null },
		{ area: 'Financials', suggestion: 'Tie each hire in the use of funds to a revenue milestone.', page_ref: 11, quote: null },
	],
};
const ANALYSIS_MD = `## Overall\n\n${SCORECARD.verdict}\n\n## Strengths\n\n${SCORECARD.strengths.map((s) => `- ${s}`).join('\n')}\n\n## Main investor concerns\n\n${SCORECARD.risks.map((s) => `- ${s}`).join('\n')}\n`;
const sampleDeck = () => ({ id: SAMPLE_DECK_ID, filename: 'Sample — Fanloop Seed Deck.pdf', status: 'done', overall_score: SCORECARD.overall_score, created_at: daysFromNow(-3) });

const CHAT_ANSWERS = {
	raise: 'In the sandbox I answer with sample data. With **Atlas Raise** I would rank investors who have backed fan-engagement companies at seed in Europe, check their recent cheques, and draft your outreach for the top ten.',
	scout: 'In the sandbox I answer with sample data. With **Atlas Scout** I would screen companies against your thesis, surface new rounds and signals in your sectors, and brief you on any deal before a first call.',
} as const;

const onPage = (path: string) => typeof window !== 'undefined' && window.location.pathname === path;

/** Keep the first SANDBOX_LIST_CAP rows of a public list and drop further pages. */
async function capList(res: Response): Promise<Response> {
	if (!res.ok) return res;
	const body = (await res.json()) as unknown;
	if (Array.isArray(body)) return json(body.slice(0, SANDBOX_LIST_CAP));
	const b = body as { data?: unknown[]; totalPages?: number };
	if (!Array.isArray(b?.data)) return json(body);
	return json({ ...b, data: b.data.slice(0, SANDBOX_LIST_CAP), totalPages: 1, page: 1, sandboxCapped: true });
}

export const coreSandboxRoutes: SandboxRoute[] = [
	// Deck analysis / Deck Screener: one sample deck with a full analysis; own uploads are a paid feature.
	['GET', '/api/deck-analysis', () => [sampleDeck()]],
	['POST', '/api/deck-analysis', ({ product }) => gated(product, `Analysing your own deck is part of ${PRODUCT_NAME[product]}. In the sandbox you can explore the sample analysis.`)],
	['GET', '/api/deck-analysis/:id', () => ({ ...sampleDeck(), analysis_md: ANALYSIS_MD, result_json: SCORECARD })],
	['GET', '/api/deck-analysis/:id/file', ({ product }) => gated(product, `Opening deck files is part of ${PRODUCT_NAME[product]}.`)],
	['POST', '/api/deck-analysis/:id/reanalyze', ({ product }) => gated(product, `Re-running analyses is part of ${PRODUCT_NAME[product]}.`)],
	['POST', '/api/deck-analysis/:id/stream', () => sse([
		...ANALYSIS_MD.match(/[\s\S]{1,60}/g)!.map((text) => ({ event: 'delta', data: { text } })),
		{ event: 'done', data: { scorecard: SCORECARD } },
	])],

	// AI chat: a few canned answers, then the upgrade prompt (shown inline by the chat UI).
	['POST', '/api/chat', ({ product, state, save }) => {
		const used = Number(state.chatUsed ?? 0);
		if (used >= SANDBOX_CHAT_LIMIT) return gated(product, `You've used the ${SANDBOX_CHAT_LIMIT} sandbox questions. Get ${PRODUCT_NAME[product]} for unlimited AI answers on live data.`);
		state.chatUsed = used + 1; save();
		const left = SANDBOX_CHAT_LIMIT - used - 1;
		const text = `${CHAT_ANSWERS[product]}\n\n_Sandbox: ${left} free question${left === 1 ? '' : 's'} left._`;
		return sse([
			{ event: 'conversation', data: { id: 'sandbox-chat' } },
			...text.match(/[\s\S]{1,40}/g)!.map((t) => ({ event: 'content_delta', data: { text: t } })),
			{ event: 'done', data: {} },
		]);
	}],
	['GET', '/api/chat/conversations', () => []],
	['GET', '/api/chat/conversations/:id', () => json({ error: { code: 'NOT_FOUND', message: 'Not available in the sandbox' } }, 404)],
	['GET', '/api/chat/conversations/:id/export', ({ product }) => gated(product, `Exporting chats is part of ${PRODUCT_NAME[product]}.`)],

	// Exports, API keys and webhooks are paid features.
	['POST', '/api/exports/:entity', ({ product }) => gated(product, `Exports are part of ${PRODUCT_NAME[product]}.`)],
	['GET', '/api/me/api-keys', () => []],
	['POST', '/api/me/api-keys', ({ product }) => gated(product, `API keys are part of ${PRODUCT_NAME[product]}.`)],
	['GET', '/api/me/webhooks', () => []],
	['POST', '/api/me/webhooks', ({ product }) => gated(product, `Webhooks are part of ${PRODUCT_NAME[product]}.`)],

	// Verification claims and data corrections are real submissions: locked.
	['POST', '/api/claims/:kind', ({ product }) => gated(product, `Getting verified is available once you're on ${PRODUCT_NAME[product]}. Nothing was submitted from the sandbox.`)],
	['POST', '/api/data-change-requests', ({ product }) => gated(product, `Suggesting corrections is available once you're on ${PRODUCT_NAME[product]}.`)],

	// Contact details stay hidden in the sandbox (the UI also shows them as locked).
	['GET', '/api/companies/:id/contacts', () => null],

	// Raise/Scout-only list pages on public data: first rows only. Keyed to the
	// page being viewed, so free pages that share these endpoints (Monthly
	// Roundup, company funding history) are untouched.
	['GET', '/api/investors', async ({ passthrough }) => (onPage('/investors') ? capList(await passthrough()) : undefined)],
	['GET', '/api/deals', async ({ passthrough }) => (onPage('/recently-funded') ? capList(await passthrough()) : undefined)],
];
