/* eslint-disable @typescript-eslint/no-explicit-any -- local-only mock fixtures */
/**
 * Mock API routes (see lib/mock-api/README.md).
 *
 * Public data (sectors, companies, investors, programs/events, analytics,
 * roundups) is served from fixtures/captured.json — real responses snapshotted
 * by capture.mjs. Logged-in data (profile, raise, watchlist, pitch deck, chat,
 * billing) is seeded below and kept in localStorage so writes survive reloads.
 */
import { seedState, type MockState } from './seed';

type Json = unknown;
type Handler = (ctx: Ctx) => Json | Response | Promise<Json | Response>;
interface Ctx { method: string; url: URL; params: Record<string, string>; body: any; state: MockState; captured: Record<string, Json> }

// ── helpers ──────────────────────────────────────────────────────────────────
const json = (data: Json, status = 200) => new Response(JSON.stringify(data ?? null), { status, headers: { 'Content-Type': 'application/json' } });
const now = () => new Date().toISOString();
const uid = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `mock-${Math.random().toString(36).slice(2)}`);
const sortedQuery = (url: URL, drop: string[] = []) => {
	const q = [...url.searchParams.entries()].filter(([k, v]) => v !== '' && !drop.includes(k)).sort(([a], [b]) => a.localeCompare(b));
	return new URLSearchParams(q).toString();
};
const capKey = (url: URL, drop?: string[]) => { const q = sortedQuery(url, drop); return q ? `${url.pathname}?${q}` : url.pathname; };
const paged = <T,>(rows: T[], url: URL) => {
	const limit = Number(url.searchParams.get('limit') ?? 24) || 24;
	const page = Number(url.searchParams.get('page') ?? 1) || 1;
	return { data: rows.slice((page - 1) * limit, page * limit), total: rows.length, page, limit, offset: (page - 1) * limit, totalPages: Math.max(1, Math.ceil(rows.length / limit)), nextCursor: null };
};
const nameMatch = (q: string | null) => (r: { name?: string | null }) => !q || (r.name ?? '').toLowerCase().includes(q.toLowerCase());

/** Every row of a captured list endpoint (all captured pages, de-duplicated). */
function capturedRows<T extends { id: string }>(captured: Record<string, Json>, path: string, extra?: (k: string) => boolean): T[] {
	const seen = new Map<string, T>();
	for (const [k, v] of Object.entries(captured)) {
		if (!k.startsWith(path + '?') || (extra && !extra(k))) continue;
		for (const r of ((v as { data?: T[] })?.data ?? [])) if (!seen.has(r.id)) seen.set(r.id, r);
	}
	return [...seen.values()];
}

/** SSE response that emits events with a small delay between them. */
function sse(events: Array<{ event: string; data: Json }>, delayMs = 60): Response {
	const enc = new TextEncoder();
	const stream = new ReadableStream({
		async start(ctrl) {
			for (const e of events) {
				ctrl.enqueue(enc.encode(`event: ${e.event}\ndata: ${JSON.stringify(e.data)}\n\n`));
				await new Promise((r) => setTimeout(r, delayMs));
			}
			ctrl.close();
		},
	});
	return new Response(stream, { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
}
const chunk = (text: string, size = 40) => text.match(new RegExp(`[\\s\\S]{1,${size}}`, 'g')) ?? [];

// ── routes ───────────────────────────────────────────────────────────────────
const routes: Array<[string, string, Handler]> = [
	// Auth / app shell
	['POST', '/api/auth/post-login', () => ({ ok: true })],
	['GET', '/api/public/site-content', () => ({ sections: {} })],
	['POST', '/api/personalization/signal', () => ({ ok: true })],
	['GET', '/api/(profiles/)?me', ({ state }) => state.profile],
	['PATCH', '/api/(profiles/)?me', ({ state, body }) => Object.assign(state.profile, body ?? {})],
	['POST', '/api/(profiles/)?plan', ({ state, body }) => {
		state.profile.paywall_shown_at = now();
		if (body?.plan) state.profile.user_type = body.plan;
		return state.profile;
	}],
	['GET', '/api/features', ({ state }) => state.features],
	['GET', '/api/me/feature-grants', () => ({ data: [] })],
	['GET', '/api/credits/balance', () => ({ monthly_balance: 450, topup_balance: 200, overage_balance: 0, total_available: 650, monthly_grant: 500 })],
	['GET', '/api/credits/ledger', ({ state }) => ({ data: state.ledger, nextCursor: null })],

	// Raise
	['GET', '/api/raise', ({ state }) => ({ raise: state.raise, criteria: state.criteria })],
	['PATCH', '/api/raise', ({ state, body }) => { state.raise = { ...(state.raise ?? {}), ...(body ?? {}) }; return state.raise; }],
	['POST', '/api/raise', ({ state, body }) => { state.raise = { ...(state.raise ?? {}), ...(body ?? {}) }; return state.raise; }],
	['GET', '/api/raise/criteria', ({ state }) => state.criteria],
	['PUT', '/api/raise/criteria', ({ state, body }) => { state.criteria = { ...(state.criteria ?? {}), ...(body ?? {}) }; return state.criteria; }],
	['GET', '/api/raise/home', ({ state }) => homeFor(state)],
	['POST', '/api/raise/strategy/book', ({ state }) => { state.strategy = { ...state.strategy, status: 'booked', scheduled_at: null }; return { ok: true }; }],
	['GET', '/api/raise/market', ({ state }) => state.market],

	// Watchlist (raise pipeline)
	['GET', '/api/raise/pipeline', ({ state, url }) => {
		const f = url.searchParams.get('filter');
		const today = new Date().toISOString().slice(0, 10);
		let rows = state.pipeline.filter((r) => (f === 'archived' ? r.is_archived : !r.is_archived));
		if (f === 'overdue') rows = rows.filter((r) => r.next_step_due && r.next_step_due < today);
		if (f === 'no_next_step') rows = rows.filter((r) => !r.next_step && !['closed', 'passed'].includes(r.stage));
		if (f === 'committed') rows = rows.filter((r) => r.stage === 'committed');
		return { data: rows };
	}],
	['POST', '/api/raise/pipeline', ({ state, body, captured }) => {
		const inv = body?.investor_id ? allInvestors(captured).find((i) => i.id === body.investor_id) : null;
		const row = {
			id: uid(), investor_id: body?.investor_id ?? null, custom_name: body?.custom_name ?? null,
			investor_name: inv?.name ?? null, investor_slug: inv?.slug ?? null, investor_logo_url: inv?.logo_url ?? null, investor_website: inv?.website ?? null,
			stage: body?.stage ?? 'target', contact_name: null, potential_amount: null, last_contact_at: null,
			next_step: null, next_step_due: null, notes: null, is_archived: false,
		};
		state.pipeline.unshift(row);
		state.activity[row.id] = [{ type: 'created', payload: null, occurred_at: now() }];
		return row;
	}],
	['PATCH', '/api/raise/pipeline/:id', ({ state, params, body }) => {
		const row = state.pipeline.find((r) => r.id === params.id);
		if (!row) return json({ error: { message: 'Not found' } }, 404);
		if (body?.stage && body.stage !== row.stage) (state.activity[row.id] ??= []).unshift({ type: 'stage_change', payload: { from: row.stage, to: body.stage }, occurred_at: now() });
		Object.assign(row, body ?? {});
		return row;
	}],
	['GET', '/api/raise/pipeline/:id/activity', ({ state, params }) => ({ data: state.activity[params.id] ?? [] })],

	// Investors
	['GET', '/api/recommendations/investors', ({ captured }) => ({
		company: { id: 'mock-company', name: 'Your company' },
		results: allInvestors(captured).slice(0, 24).map((i, n) => ({
			id: i.id, name: i.name, slug: i.slug, website: i.website, logo_url: i.logo_url, hq_country: i.hq_country,
			category: i.category, description: i.description, score: 92 - n,
			match_reasons: [['Invests in your sector', 'Backs seed-stage rounds'], ['Active in your geography', 'Recent sports-tech deals'], ['Matches your investor type', 'Writes cheques in your range']][n % 3],
		})),
	})],
	['GET', '/api/investors', ({ url, captured }) => {
		const exact = captured[capKey(url)];
		if (exact) return exact;
		let rows = allInvestors(captured);
		const ids = url.searchParams.get('ids');
		if (ids) rows = rows.filter((r) => ids.split(',').includes(r.id));
		rows = rows.filter(nameMatch(url.searchParams.get('q')));
		const cat = url.searchParams.get('category');
		if (cat) rows = rows.filter((r) => r.category === cat);
		return paged(rows, url);
	}],
	['GET', '/api/investors/:id/thesis', ({ url, captured }) => captured[capKey(url)] ?? { thesis: null, round_types: [], geo: [] }],
	['GET', '/api/investors/:id', ({ url, params, captured }) =>
		captured[capKey(url)] ?? allInvestors(captured).find((i) => i.id === params.id || i.slug === params.id) ?? json({ error: { message: 'Investor not found' } }, 404)],

	// Companies
	['GET', '/api/companies', ({ url, captured }) => {
		const exact = captured[capKey(url)];
		if (exact) return exact;
		const sector = url.searchParams.get('sector_slug');
		if (sector) {
			// Framework counts/examples were captured per category; reuse the matching capture regardless of sort/limit.
			const hit = Object.entries(captured).find(([k]) => k.startsWith('/api/companies?') && k.includes(`sector_slug=${encodeURIComponent(sector)}`));
			if (hit) return hit[1];
		}
		let rows = allCompanies(captured).filter(nameMatch(url.searchParams.get('q')));
		const country = url.searchParams.get('country');
		if (country) rows = rows.filter((r) => country.split(',').includes(String(r.hq_country)));
		return paged(rows, url);
	}],
	['GET', '/api/companies/:id/sports', ({ url, captured }) => captured[capKey(url)] ?? []],
	['GET', '/api/companies/:id/news', ({ url, captured }) => captured[capKey(url)] ?? []],
	['GET', '/api/companies/:id/similar', ({ url, params, captured }) => {
		const hit = captured[capKey(url)];
		if (hit) return hit;
		const self = allCompanies(captured).find((c) => c.id === params.id || c.slug === params.id);
		return allCompanies(captured).filter((c) => c.id !== self?.id && c.primary_sector_slug === self?.primary_sector_slug).slice(0, 12);
	}],
	['GET', '/api/companies/:id/contacts', ({ params, captured }) => {
		const c = allCompanies(captured).find((x) => x.id === params.id || x.slug === params.id);
		return c ? { id: `contact-${c.id}`, full_name: 'Alex Morgan', job_position: 'Co-founder & CEO', email: null, linkedin_url: null, phone: null, role: 'founder' } : null;
	}],
	['GET', '/api/companies/:id', ({ url, params, captured }) =>
		captured[capKey(url)] ?? allCompanies(captured).find((c) => c.id === params.id || c.slug === params.id) ?? json({ error: { message: 'Company not found' } }, 404)],
	['GET', '/api/deals', ({ url, captured }) => captured[capKey(url)] ?? { data: [], total: 0, totalPages: 1 }],
	['GET', '/api/acquisitions', () => ({ data: [], total: 0, totalPages: 1 })],

	// Ecosystem (programs / events)
	['GET', '/api/ecosystem-entities', ({ url, captured }) => {
		const exact = captured[capKey(url)];
		if (exact) return exact;
		const type = url.searchParams.get('entity_type') ?? 'program';
		const rows = capturedRows<{ id: string; name: string }>(captured, '/api/ecosystem-entities', (k) => k.includes(`entity_type=${type}`))
			.filter(nameMatch(url.searchParams.get('q')));
		return paged(rows, url);
	}],

	// Market analytics + roundup (fallback to the "all time" capture for other periods)
	['GET', '/api/analytics/:name', ({ url, captured }) => {
		const exact = captured[capKey(url)];
		if (exact) return exact;
		const alt = Object.entries(captured).find(([k]) => k.startsWith(url.pathname + '?'));
		return alt ? alt[1] : [];
	}],
	['GET', '/api/market/roundup', ({ url, captured }) => {
		const exact = captured[capKey(url)];
		if (exact) return exact;
		const any = Object.entries(captured).filter(([k]) => k.startsWith('/api/market/roundup?')).map(([, v]) => v as { stats?: { deal_count?: number } });
		return any.find((r) => (r.stats?.deal_count ?? 0) > 0) ?? any[0] ?? null;
	}],

	// Pitch deck
	['GET', '/api/deck-analysis', ({ state }) => state.decks.map(({ id, filename, status, overall_score, created_at }) => ({ id, filename, status, overall_score, created_at }))],
	['POST', '/api/deck-analysis', ({ state, body }) => {
		const id = uid();
		state.decks.unshift({ id, filename: body?.filename ?? 'Pitch deck.pdf', status: 'processing', overall_score: null, created_at: now(), analysis_md: null, result_json: null });
		return { id };
	}],
	['POST', '/api/deck-analysis/:id/stream', ({ state, params }) => {
		const deck = state.decks.find((d) => d.id === params.id);
		const sample = state.decks.find((d) => d.result_json) ?? null;
		if (deck && sample && deck !== sample) Object.assign(deck, { status: 'done', overall_score: sample.overall_score, analysis_md: sample.analysis_md, result_json: sample.result_json });
		const md = deck?.analysis_md ?? sample?.analysis_md ?? '';
		return sse([...chunk(md, 60).map((text) => ({ event: 'delta', data: { text } })), { event: 'done', data: { scorecard: deck?.result_json ?? sample?.result_json ?? null } }], 30);
	}],
	['GET', '/api/deck-analysis/:id', ({ state, params }) => state.decks.find((d) => d.id === params.id) ?? json({ error: { message: 'Not found' } }, 404)],

	// Chat
	['GET', '/api/chat/conversations', ({ state }) => state.conversations.map(({ id, title, last_message_at }) => ({ id, title, last_message_at }))],
	['GET', '/api/chat/conversations/:id/export', ({ state, params }) => {
		const c = state.conversations.find((x) => x.id === params.id);
		return new Response((c?.messages ?? []).map((m) => `**${m.role}:** ${m.content}`).join('\n\n'), { headers: { 'Content-Type': 'text/markdown' } });
	}],
	['GET', '/api/chat/conversations/:id', ({ state, params }) => ({ messages: state.conversations.find((c) => c.id === params.id)?.messages ?? [] })],
	['DELETE', '/api/chat/conversations/:id', ({ state, params }) => { state.conversations = state.conversations.filter((c) => c.id !== params.id); return { ok: true }; }],
	['POST', '/api/chat', ({ state, body }) => {
		const id = body?.conversation_id ?? uid();
		let conv = state.conversations.find((c) => c.id === id);
		if (!conv) { conv = { id, title: String(body?.message ?? 'New chat').slice(0, 60), last_message_at: now(), messages: [] }; state.conversations.unshift(conv); }
		const answer = `**Mock mode** — the assistant isn't connected while the API is offline.\n\nYou asked: _${String(body?.message ?? '').slice(0, 200)}_\n\nWhen the backend is back, this will be a real answer from Atlas.`;
		conv.messages.push({ role: 'user', content: String(body?.message ?? '') }, { role: 'assistant', content: answer });
		conv.last_message_at = now();
		return sse([
			{ event: 'conversation', data: { id } },
			{ event: 'thinking', data: { iteration: 1 } },
			...chunk(answer, 24).map((text) => ({ event: 'content_delta', data: { text } })),
			{ event: 'done', data: {} },
		], 25);
	}],

	// Favorites / watchlists / search
	['GET', '/api/favorites/:kind', ({ state, params }) => ({ data: state.favorites[params.kind] ?? [] })],
	['POST', '/api/favorites/:kind/:id', ({ state, params }) => {
		const col = { companies: 'company_id', investors: 'investor_id', ecosystem: 'ecosystem_entity_id', deals: 'deal_id' }[params.kind] ?? 'id';
		(state.favorites[params.kind] ??= []).push({ [col]: params.id });
		return { ok: true };
	}],
	['DELETE', '/api/favorites/:kind/:id', ({ state, params }) => {
		state.favorites[params.kind] = (state.favorites[params.kind] ?? []).filter((r) => !Object.values(r).includes(params.id));
		return { ok: true };
	}],
	['GET', '/api/user-watchlists', ({ state }) => ({ data: state.companyWatchlists.map((w) => ({ ...w, company_count: w.company_ids.length })) })],
	['POST', '/api/user-watchlists', ({ state, body }) => { const w = { id: uid(), name: body?.name ?? 'New list', description: null, color: body?.color ?? null, company_ids: [] as string[] }; state.companyWatchlists.push(w); return w; }],
	['GET', '/api/user-watchlists/:wl/companies', ({ state, params, captured }) => {
		const w = state.companyWatchlists.find((x) => x.id === params.wl);
		const all = allCompanies(captured);
		return { data: (w?.company_ids ?? []).map((id) => all.find((c) => c.id === id)).filter(Boolean) };
	}],
	['PATCH', '/api/user-watchlists/:wl', ({ state, params, body }) => {
		const w = state.companyWatchlists.find((x) => x.id === params.wl);
		if (w && body?.name) w.name = body.name;
		return w ?? json({ error: { message: 'Not found' } }, 404);
	}],
	['DELETE', '/api/user-watchlists/:wl', ({ state, params }) => { state.companyWatchlists = state.companyWatchlists.filter((w) => w.id !== params.wl); return { ok: true }; }],
	['GET', '/api/user-watchlists/containing/:id', ({ state, params }) => ({ data: state.companyWatchlists.filter((w) => w.company_ids.includes(params.id)).map((w) => w.id) })],
	['POST', '/api/user-watchlists/:wl/companies/:id', ({ state, params }) => { state.companyWatchlists.find((w) => w.id === params.wl)?.company_ids.push(params.id); return { ok: true }; }],
	['DELETE', '/api/user-watchlists/:wl/companies/:id', ({ state, params }) => {
		const w = state.companyWatchlists.find((x) => x.id === params.wl);
		if (w) w.company_ids = w.company_ids.filter((c) => c !== params.id);
		return { ok: true };
	}],
	['GET', '/api/search', ({ url, captured }) => {
		const q = url.searchParams.get('q') ?? '';
		return {
			q,
			results: {
				companies: allCompanies(captured).filter(nameMatch(q)).slice(0, 5).map((c) => ({ id: c.id, name: c.name, slug: c.slug, sector: c.primary_sector, website: c.website })),
				investors: allInvestors(captured).filter(nameMatch(q)).slice(0, 5).map((i) => ({ id: i.id, name: i.name, slug: i.slug, type: i.category, website: i.website })),
			},
		};
	}],

	// Billing
	['GET', '/api/billing/subscription', () => ({ subscription_status: 'active', is_trial: false, subscription_current_period_end: new Date(Date.now() + 25 * 864e5).toISOString() })],
	['GET', '/api/billing/subscriptions', () => [{ stripe_subscription_id: 'sub_mock', subscription_status: 'active', is_active: true, is_trial: false, plan_name: 'Atlas Raise', user_type: 'raise', subscription_current_period_end: new Date(Date.now() + 25 * 864e5).toISOString(), subscription_cancel_at: null, updated_at: now() }]],
	['GET', '/api/billing/invoices', () => [
		{ id: 'in_mock_2', number: 'STX-0002', status: 'paid', amount_paid: 50000, currency: 'eur', created: Math.floor(Date.now() / 1000) - 5 * 86400, hosted_invoice_url: null, invoice_pdf: null },
		{ id: 'in_mock_1', number: 'STX-0001', status: 'paid', amount_paid: 50000, currency: 'eur', created: Math.floor(Date.now() / 1000) - 370 * 86400, hosted_invoice_url: null, invoice_pdf: null },
	]],
	['GET', '/api/billing/credit-packs', () => ({ data: [
		{ id: 'ai-1k', name: '1,000 AI Credits', credit_amount: 1000, price_amount: 1000, currency_code: 'EUR' },
		{ id: 'ai-5k', name: '5,000 AI Credits', credit_amount: 5000, price_amount: 4000, currency_code: 'EUR' },
	] })],
	['POST', '/api/billing/(checkout|portal|credit-packs/checkout)', () => ({ url: '/billing' })],
];

/**
 * Match a route pattern against a pathname. Patterns are paths with `:name`
 * segments and may contain a `(segment/)?` optional group.
 */
const compiled = new Map<string, { re: RegExp; names: string[] }>();
function matchPath(pattern: string, pathname: string): Record<string, string> | null {
	let c = compiled.get(pattern);
	if (!c) {
		const names: string[] = [];
		const src = pattern.replace(/:(\w+)/g, (_m, n: string) => { names.push(n); return '([^/]+)'; });
		c = { re: new RegExp(`^${src}$`), names };
		compiled.set(pattern, c);
	}
	const m = pathname.match(c.re);
	if (!m) return null;
	const out: Record<string, string> = {};
	// Optional groups like "(profiles/)?" capture too; map only the named ones from the end.
	const caps = m.slice(1).filter((_v, i) => i >= m.length - 1 - c!.names.length);
	c.names.forEach((n, i) => { out[n] = decodeURIComponent(caps[i] ?? ''); });
	return out;
}

// ── data helpers over the captured lists ─────────────────────────────────────
type Row = Record<string, any> & { id: string; name: string };
function allCompanies(captured: Record<string, Json>): Row[] { return capturedRows<Row>(captured, '/api/companies', (k) => !k.includes('sector_slug')); }
function allInvestors(captured: Record<string, Json>): Row[] { return capturedRows<Row>(captured, '/api/investors'); }

function homeFor(state: MockState) {
	const today = new Date().toISOString().slice(0, 10);
	const active = state.pipeline.filter((r) => !r.is_archived);
	const overdue = active.filter((r) => r.next_step_due && r.next_step_due < today).length;
	const noNext = active.filter((r) => !r.next_step && !['closed', 'passed'].includes(r.stage)).length;
	const attention = [
		...(state.decks.some((d) => d.status === 'done') ? [] : [{ id: 'deck', title: 'Analyse your pitch deck', why: 'See the weaknesses investors are likely to challenge before you send it.', cta_label: 'Analyse deck', cta_href: '/raise/pitch' }]),
		...(overdue ? [{ id: 'overdue', title: `Follow up with ${overdue} overdue investor${overdue > 1 ? 's' : ''}`, why: 'These conversations have a next step that is past due.', cta_label: 'Review overdue', cta_href: '/raise/pipeline?filter=overdue', count: overdue }] : []),
		...(noNext ? [{ id: 'next-steps', title: 'Add next steps to your active investors', why: 'Some active conversations have no next action — they will stall.', cta_label: 'Review investors', cta_href: '/raise/pipeline?filter=no_next_step', count: noNext }] : []),
		...(active.length < 5 ? [{ id: 'add-first', title: 'Add your first investors to the watchlist', why: 'Build a target list of at least five relevant investors to get moving.', cta_label: 'Find investors', cta_href: '/raise/investors' }] : []),
		{ id: 'strategy', title: 'Book your strategy session', why: 'You have unlocked a session with STX leadership to pressure-test the raise.', cta_label: 'Book call', cta_href: '/raise/strategy' },
	];
	return { attention, strategy: state.strategy, raise: { stage: 'outreach' } };
}

// ── state (persisted per browser) ────────────────────────────────────────────
const STATE_KEY = 'stx:mock-api-state:v1';
let state: MockState | null = null;
let captured: Record<string, Json> | null = null;

async function load() {
	if (!captured) captured = (await import('./fixtures/captured.json')).default as Record<string, Json>;
	if (!state) {
		try { const raw = localStorage.getItem(STATE_KEY); if (raw) state = JSON.parse(raw) as MockState; } catch { /* ignore */ }
		if (!state) state = seedState(captured);
	}
	return { state, captured };
}
function save() { try { localStorage.setItem(STATE_KEY, JSON.stringify(state)); } catch { /* storage unavailable */ } }

/** Reset all mock state to the seed (run `window.__stxMockReset()` in the console). */
if (typeof window !== 'undefined') (window as unknown as { __stxMockReset?: () => void }).__stxMockReset = () => { try { localStorage.removeItem(STATE_KEY); } catch { /* */ } state = null; location.reload(); };

export async function resolveMock(method: string, url: URL, body: unknown): Promise<Response | null> {
	const { state: st, captured: cap } = await load();
	for (const [m, pattern, handler] of routes) {
		if (m !== method) continue;
		const params = matchPath(pattern, url.pathname);
		if (!params) continue;
		const out = await handler({ method, url, params, body, state: st, captured: cap });
		if (method !== 'GET') save();
		return out instanceof Response ? out : json(out);
	}
	// Any other GET captured verbatim (reference data: sectors, sports, tech tags, round types, location facets…).
	if (method === 'GET') {
		const hit = cap[capKey(url)];
		if (hit !== undefined) return json(hit);
	}
	// Generic success for unknown writes so forms don't explode; reads fall through to a logged 404.
	if (method !== 'GET') { console.warn(`[mock-api] generic OK for ${method} ${url.pathname}`); return json({ ok: true }); }
	return null;
}
