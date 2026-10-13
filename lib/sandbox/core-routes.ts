/**
 * Practice routes shared by Raise and Scout: deck analysis, AI chat, exports,
 * API keys / webhooks, company contacts, list caps and company watchlists
 * (watchlist-routes.ts). Product-specific data lives in raise-routes.ts and
 * scout-routes.ts.
 */
import type { DeckScorecard } from '@/lib/deck-analysis';
import { previewBasePath } from '@/lib/preview-mode';
import { daysFromNow, gated, json, sse, type SandboxRoute } from './types';
import { watchlistSandboxRoutes, FALLBACK as FALLBACK_WATCHLIST_COMPANIES } from './watchlist-routes';
import { FALLBACK_COMPANIES as FALLBACK_SCOUT_COMPANIES } from './scout-routes';

/** Free AI chat messages in practice before the upgrade prompt. */
export const SANDBOX_CHAT_LIMIT = 3;
/** Rows shown in Raise/Scout-only lists (investors, recently funded…). */
export const SANDBOX_LIST_CAP = 10;

/** The one sample deck (Fanloop's), at `/deck/<id>`. */
export const SAMPLE_DECK_ID = 'sandbox-deck';
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
	raise: 'In practice mode I answer with sample data. With **Atlas Raise** I would rank investors who have backed fan-engagement companies at seed in Europe, check their recent cheques, and draft your outreach for the top ten.',
	scout: 'In practice mode I answer with sample data. With **Atlas Scout** I would screen companies against your thesis, surface new rounds and signals in your sectors, and brief you on any deal before a first call.',
} as const;

// Strip the preview prefix (app/preview/[product]/, lib/preview-mode.ts) before
// comparing: real browser pathnames there are `/preview/<product>/investors`,
// not `/investors`, and this is a plain string match with no other normalisation.
function onPage(path: string): boolean {
	if (typeof window === 'undefined') return false;
	const { pathname } = window.location;
	const base = previewBasePath();
	const here = base && pathname.startsWith(base) ? pathname.slice(base.length) || '/' : pathname;
	return here === path;
}

/** Keep the first SANDBOX_LIST_CAP rows of a public list and drop further pages. */
async function capList(res: Response): Promise<Response> {
	if (!res.ok) return res;
	const body = (await res.json()) as unknown;
	if (Array.isArray(body)) return json(body.slice(0, SANDBOX_LIST_CAP));
	const b = body as { data?: unknown[]; totalPages?: number };
	if (!Array.isArray(b?.data)) return json(body);
	return json({ ...b, data: b.data.slice(0, SANDBOX_LIST_CAP), totalPages: 1, page: 1, sandboxCapped: true });
}

interface SlimCompany {
	id: string; name: string; slug: string | null; description: string | null;
	website: string | null; custom_logo_url: string | null;
	primary_sector: string | null; hq_city: string | null; hq_country: string | null;
	total_funding_usd: number | string | null;
}

/** Both products' fallback company lists, by id — `/companies/:slug` passes an
 *  id here (these have no real slug), and the two lists use disjoint id
 *  spaces (`sandbox-co-*` vs scout's UUID-shaped ones), so checking both is safe. */
function findFallbackCompany(id: string): SlimCompany | undefined {
	return FALLBACK_WATCHLIST_COMPANIES.find((c) => c.id === id) ?? FALLBACK_SCOUT_COMPANIES.find((c) => c.id === id);
}

/**
 * `GET /api/companies/:id` has no local route — every company a tour can
 * reach (the watchlist seed, Scout's recommendations) is already one of the
 * two fallback lists above, built for their OWN pages; the profile page
 * (components/features/company/company-profile.tsx) needs the full `Company`
 * shape, not that summary, and nothing filled it in. Fields neither fallback
 * carries (founded year, business model, stage, socials…) are null — the
 * profile page already renders those as "—" when absent, same as a real
 * company with gaps in its data.
 */
function expandCompany(c: SlimCompany): Record<string, unknown> {
	return {
		id: c.id, name: c.name, website: c.website, slug: c.slug, custom_logo_url: c.custom_logo_url,
		description: c.description, status: 'active', founded_year: null, ipo_date: null, sector_id: null,
		business_model: null, location_id: null, social_profile_id: null, is_verified: true, is_unicorn: false,
		is_actively_raising: false, poc_first_name: null, poc_last_name: null, poc_job_position: null,
		poc_email: null, poc_linkedin: null, accelerator: null, cohort: null, added_by_profile_id: null,
		created_at: daysFromNow(-900), updated_at: daysFromNow(-14),
		primary_sector: c.primary_sector, primary_sector_slug: null, hq_city: c.hq_city, hq_country: c.hq_country,
		primary_sport: null, total_funding_usd: Number(c.total_funding_usd) || 0,
		hq_region: null, twitter_url: null, instagram_url: null, facebook_url: null, linkedin_url: null,
		youtube_url: null, contact_email: null, sport_count: 0, tech_tag_count: 0, deal_count: 0,
	};
}

/** "Recent signals" on the company profile — made up, but specific to the
 *  company rather than a generic placeholder, same spirit as everywhere else
 *  in the sandbox invents a small, named sample instead of leaving a blank. */
function sampleSignals(c: SlimCompany): Record<string, unknown>[] {
	const sector = c.primary_sector ?? 'sports tech';
	return [
		{ id: `${c.id}-signal-1`, title: `${c.name} expands its ${sector} product into new markets`, source: 'SportsTechX Wire', url: null, published_at: daysFromNow(-9) },
		{ id: `${c.id}-signal-2`, title: `${c.name} named one to watch in ${c.hq_country ?? 'its region'}`, source: 'Industry Roundup', url: null, published_at: daysFromNow(-26) },
		{ id: `${c.id}-signal-3`, title: `${c.name} adds two senior hires as it scales`, source: 'Company update', url: null, published_at: daysFromNow(-48) },
	];
}

/** "Related companies" — the other fallback companies, same reasoning. */
function sampleSimilar(c: SlimCompany): Record<string, unknown>[] {
	return [...FALLBACK_WATCHLIST_COMPANIES, ...FALLBACK_SCOUT_COMPANIES]
		.filter((o) => o.id !== c.id)
		.slice(0, 3)
		.map((o) => ({
			id: o.id, name: o.name, slug: o.slug, hq_city: o.hq_city, hq_country: o.hq_country,
			last_round_type: 'Seed', primary_sector: o.primary_sector,
		}));
}

/**
 * Discover → Signals (components/features/signals/signals.tsx), shared by
 * both products against the un-gated `GET /api/signals` — had no local route
 * at all, same "public data, assumed reachable" gap as everywhere else.
 * `funding`/`fundraising` only, same as the real product (its own comment:
 * the other four SignalType values have no source yet — an empty state
 * there is correct, not something to fill in).
 */
function sampleSignalsList(): Record<string, unknown>[] {
	const pool = [...FALLBACK_WATCHLIST_COMPANIES, ...FALLBACK_SCOUT_COMPANIES];
	const pick = (i: number) => pool[i % pool.length];
	const entries: { type: 'funding' | 'fundraising'; headline: (name: string) => string; daysAgo: number }[] = [
		{ type: 'funding', headline: (n) => `${n} closes an oversubscribed seed round`, daysAgo: 4 },
		{ type: 'fundraising', headline: (n) => `${n} opens a Series A to scale into new leagues`, daysAgo: 11 },
		{ type: 'funding', headline: (n) => `${n} raises a bridge round led by existing investors`, daysAgo: 19 },
		{ type: 'fundraising', headline: (n) => `${n} is quietly talking to investors for a seed extension`, daysAgo: 33 },
	];
	return entries.map((e, i) => {
		const c = pick(i);
		return {
			id: `signal-${i + 1}`, signal_type: e.type, source: 'SportsTechX Wire', headline: e.headline(c.name), body: null,
			occurred_at: daysFromNow(-e.daysAgo), company_id: c.id, company_name: c.name, company_slug: c.slug,
			company_website: c.website, company_custom_logo_url: c.custom_logo_url, sector: c.primary_sector,
			hq_city: c.hq_city, hq_country: c.hq_country, last_round_type: e.type === 'funding' ? 'Seed' : null,
		};
	});
}

export const coreSandboxRoutes: SandboxRoute[] = [
	['GET', '/api/signals', ({ url }) => {
		const type = url.searchParams.get('type');
		const rows = type ? sampleSignalsList().filter((s) => s.signal_type === type) : sampleSignalsList();
		return { data: rows };
	}],
	['GET', '/api/companies/:id', ({ params }) => {
		const c = findFallbackCompany(params.id);
		return c ? expandCompany(c) : undefined; // not one of ours → let the real /api/companies passthrough (public data) answer
	}],
	['GET', '/api/companies/:id/sports', () => []],
	['GET', '/api/companies/:id/news', ({ params }) => {
		const c = findFallbackCompany(params.id);
		return c ? sampleSignals(c) : [];
	}],
	['GET', '/api/companies/:id/similar', ({ params }) => {
		const c = findFallbackCompany(params.id);
		return c ? sampleSimilar(c) : [];
	}],

	// Company watchlists: seeded sample lists; the visitor's real lists are never touched.
	...watchlistSandboxRoutes,

	// Deck analysis / Deck Screener: one sample deck with a full analysis; own uploads are a paid feature.
	['GET', '/api/deck-analysis', () => [sampleDeck()]],
	['POST', '/api/deck-analysis', ({ product }) => gated(product, `Analysing your own deck is part of ${PRODUCT_NAME[product]}. In practice you can explore the sample analysis.`)],
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
		if (used >= SANDBOX_CHAT_LIMIT) return gated(product, `You've used the ${SANDBOX_CHAT_LIMIT} practice questions. Get ${PRODUCT_NAME[product]} for unlimited AI answers on live data.`);
		state.chatUsed = used + 1; save();
		const left = SANDBOX_CHAT_LIMIT - used - 1;
		const text = `${CHAT_ANSWERS[product]}\n\n_Practice: ${left} free question${left === 1 ? '' : 's'} left._`;
		return sse([
			{ event: 'conversation', data: { id: 'sandbox-chat' } },
			...text.match(/[\s\S]{1,40}/g)!.map((t) => ({ event: 'content_delta', data: { text: t } })),
			{ event: 'done', data: {} },
		]);
	}],
	['GET', '/api/chat/conversations', () => []],
	['GET', '/api/chat/conversations/:id', () => json({ error: { code: 'NOT_FOUND', message: 'Not available in practice' } }, 404)],
	['GET', '/api/chat/conversations/:id/export', ({ product }) => gated(product, `Exporting chats is part of ${PRODUCT_NAME[product]}.`)],

	// Exports, API keys and webhooks are paid features.
	['POST', '/api/exports/:entity', ({ product }) => gated(product, `Exports are part of ${PRODUCT_NAME[product]}.`)],
	['GET', '/api/me/api-keys', () => []],
	['POST', '/api/me/api-keys', ({ product }) => gated(product, `API keys are part of ${PRODUCT_NAME[product]}.`)],
	['GET', '/api/me/webhooks', () => []],
	['POST', '/api/me/webhooks', ({ product }) => gated(product, `Webhooks are part of ${PRODUCT_NAME[product]}.`)],

	// Global providers (app/providers.tsx → FeatureAccessProvider) fetch these
	// on EVERY page, sandbox or not — including the pre-signup preview
	// (app/preview/), where there is no real backend call to fall through to.
	// No grants and no extra unlocked features: a practice account is Explore,
	// same as the real one it mirrors.
	['GET', '/api/features', () => []],
	['GET', '/api/me/feature-grants', () => ({ data: [] })],

	// Verification claims and data corrections are real submissions: locked.
	['POST', '/api/claims/:kind', ({ product }) => gated(product, `Getting verified is available once you're on ${PRODUCT_NAME[product]}. Nothing was submitted from practice.`)],
	['POST', '/api/data-change-requests', ({ product }) => gated(product, `Suggesting corrections is available once you're on ${PRODUCT_NAME[product]}.`)],

	// Contact details stay hidden in the sandbox (the UI also shows them as locked).
	['GET', '/api/companies/:id/contacts', () => null],

	// Raise/Scout-only list pages on public data: first rows only. Keyed to the
	// page being viewed, so free pages that share these endpoints (Monthly
	// Roundup, company funding history) are untouched.
	['GET', '/api/investors', async ({ passthrough }) => (onPage('/investors') ? capList(await passthrough()) : undefined)],
	['GET', '/api/deals', async ({ passthrough }) => (onPage('/recently-funded') ? capList(await passthrough()) : undefined)],
];
