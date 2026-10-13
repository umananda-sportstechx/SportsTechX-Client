/**
 * Company watchlists in practice (both products). Spread into coreSandboxRoutes.
 *
 * The real `/api/user-watchlists` must never be hit from practice — those are
 * the visitor's own lists. Instead each product's practice workspace gets two
 * seeded lists of real companies (public `/api/companies`, fetched once per page
 * load; fictional fallback), kept statefully in ctx.state.
 *
 * Shapes follow the server controller (user-watchlists.controller.ts) and the
 * consuming types in components/features/watchlists/use-company-watchlists.ts.
 */
import type { CompanyWatchlist, WatchlistCompany } from '@/components/features/watchlists/use-company-watchlists';
import { daysFromNow, gated, json, type SandboxCtx, type SandboxRoute } from './types';

interface StoredList { id: string; name: string; description: string | null; color: string | null; created_at: string }
type StoredCompany = WatchlistCompany & { stage?: string | null };
interface WatchlistState { lists: StoredList[]; items: Record<string, StoredCompany[]> }

const SEED_COUNT = 8;
const NAME_MAX = 120;
const SHORTLIST_ID = 'sandbox-wl-shortlist';
const PORTFOLIO_ID = 'sandbox-wl-portfolio';

export const FALLBACK: StoredCompany[] = [
	['Fanloop', 'Fan Engagement', 'Lisbon', 'Portugal', 4_200_000],
	['Strideline Labs', 'Wearables', 'Copenhagen', 'Denmark', 9_800_000],
	['Courtside Data', 'Performance Analytics', 'Austin', 'United States', 12_500_000],
	['Kitbag Exchange', 'Commerce', 'Manchester', 'United Kingdom', 2_100_000],
	['Pace & Point', 'Coaching', 'Melbourne', 'Australia', 3_600_000],
	['Arena Pulse', 'Venue Tech', 'Berlin', 'Germany', 7_400_000],
	['Hatrick Health', 'Health & Fitness', 'Dublin', 'Ireland', 1_500_000],
	['Matchday Media', 'Media & Content', 'Madrid', 'Spain', 5_900_000],
].map(([name, sector, city, country, raised], i) => ({
	id: `sandbox-co-${i + 1}`, name: String(name), slug: null, website: null, custom_logo_url: null,
	description: null, primary_sector: String(sector), hq_city: String(city), hq_country: String(country),
	total_funding_usd: Number(raised),
}));

type CompanyRow = Partial<WatchlistCompany> & { id?: string; name?: string };

const toCompany = (c: CompanyRow, addedDaysAgo: number): StoredCompany | null => (c.id && c.name ? {
	id: c.id, name: c.name, slug: c.slug ?? null, website: c.website ?? null, custom_logo_url: c.custom_logo_url ?? null,
	description: c.description ? c.description.slice(0, 280) : null, primary_sector: c.primary_sector ?? null,
	hq_city: c.hq_city ?? null, hq_country: c.hq_country ?? null, total_funding_usd: c.total_funding_usd ?? null,
	added_at: daysFromNow(-addedDaysAgo),
} : null);

async function getJson<T>(path: string): Promise<T | null> {
	try {
		const res = await fetch(path);
		return res.ok ? ((await res.json()) as T) : null;
	} catch { return null; }
}

let seedCompanies: Promise<StoredCompany[]> | null = null;
function loadSeedCompanies(): Promise<StoredCompany[]> {
	seedCompanies ??= getJson<{ data?: CompanyRow[] }>(`/api/companies?limit=${SEED_COUNT}&page=1`).then((page) => {
		const real = (page?.data ?? []).map((c, i) => toCompany(c, 2 + i * 3)).filter((c): c is StoredCompany => c !== null);
		return real.length >= 2 ? real : FALLBACK.map((c, i) => ({ ...c, added_at: daysFromNow(-(2 + i * 3)) }));
	});
	return seedCompanies;
}

async function load(ctx: SandboxCtx): Promise<WatchlistState> {
	const existing = ctx.state.watchlists as WatchlistState | undefined;
	if (existing?.lists && existing.items) return existing;
	const cos = await loadSeedCompanies();
	const half = Math.ceil(cos.length / 2);
	const seeded: WatchlistState = {
		lists: [
			{ id: SHORTLIST_ID, name: 'Pitch-side shortlist', description: 'Companies worth a closer look this quarter.', color: null, created_at: daysFromNow(-21) },
			{ id: PORTFOLIO_ID, name: 'Portfolio watch', description: 'Companies to keep tracking after a first conversation.', color: null, created_at: daysFromNow(-40) },
		],
		items: { [SHORTLIST_ID]: cos.slice(0, half), [PORTFOLIO_ID]: cos.slice(half) },
	};
	return save(ctx, seeded);
}

function save(ctx: SandboxCtx, next: WatchlistState): WatchlistState {
	ctx.state.watchlists = next;
	ctx.save();
	return next;
}

const listOut = (l: StoredList, st: WatchlistState): CompanyWatchlist & { created_at: string } =>
	({ ...l, company_count: st.items[l.id]?.length ?? 0 });

const notFound = () => json({ error: { code: 'NOT_FOUND', message: 'Watchlist not found' } }, 404);
const badRequest = (message: string) => json({ error: { code: 'VALIDATION_ERROR', message } }, 400);
const noContent = () => new Response(null, { status: 204 });

const cleanName = (body: unknown): string | null => {
	const n = (body as { name?: unknown } | null)?.name;
	const name = typeof n === 'string' ? n.trim() : '';
	return name && name.length <= NAME_MAX ? name : null;
};
const optText = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);

/** The company being added, from the public profile; a bare row if that fails. */
async function companyFor(id: string): Promise<StoredCompany> {
	const known = (await loadSeedCompanies()).find((c) => c.id === id);
	if (known) return { ...known, added_at: daysFromNow(0) };
	const row = await getJson<CompanyRow>(`/api/companies/${encodeURIComponent(id)}`);
	return toCompany({ ...row, id }, 0) ?? toCompany({ id, name: 'Company' }, 0)!;
}

export const watchlistSandboxRoutes: SandboxRoute[] = [
	['GET', '/api/user-watchlists', async (ctx) => {
		const st = await load(ctx);
		return { data: st.lists.map((l) => listOut(l, st)) };
	}],
	['POST', '/api/user-watchlists', async (ctx) => {
		const name = cleanName(ctx.body);
		if (!name) return badRequest(`Give the watchlist a name (up to ${NAME_MAX} characters).`);
		const st = await load(ctx);
		const b = ctx.body as { description?: unknown; color?: unknown };
		const list: StoredList = { id: `sandbox-wl-${Date.now().toString(36)}`, name, description: optText(b.description), color: optText(b.color), created_at: daysFromNow(0) };
		const next = save(ctx, { lists: [list, ...st.lists], items: { ...st.items, [list.id]: [] } });
		return json(listOut(list, next), 201);
	}],
	// Before `:id` routes with two segments, so "containing" is never read as a list id.
	['GET', '/api/user-watchlists/containing/:companyId', async (ctx) => {
		const st = await load(ctx);
		return { data: st.lists.filter((l) => st.items[l.id]?.some((c) => c.id === ctx.params.companyId)).map((l) => l.id) };
	}],
	['GET', '/api/user-watchlists/:id', async (ctx) => {
		const st = await load(ctx);
		const list = st.lists.find((l) => l.id === ctx.params.id);
		return list ? listOut(list, st) : notFound();
	}],
	['PATCH', '/api/user-watchlists/:id', async (ctx) => {
		const st = await load(ctx);
		const list = st.lists.find((l) => l.id === ctx.params.id);
		if (!list) return notFound();
		const name = cleanName(ctx.body);
		if (!name) return badRequest(`Give the watchlist a name (up to ${NAME_MAX} characters).`);
		const renamed = { ...list, name };
		const next = save(ctx, { ...st, lists: st.lists.map((l) => (l.id === list.id ? renamed : l)) });
		return listOut(renamed, next);
	}],
	['DELETE', '/api/user-watchlists/:id', async (ctx) => {
		const st = await load(ctx);
		if (!st.lists.some((l) => l.id === ctx.params.id)) return notFound();
		const items = Object.fromEntries(Object.entries(st.items).filter(([k]) => k !== ctx.params.id));
		save(ctx, { lists: st.lists.filter((l) => l.id !== ctx.params.id), items });
		return noContent();
	}],
	// Public share links would expose a practice list on a real URL.
	['POST', '/api/user-watchlists/:id/share', ({ product }) => gated(product, `Sharing watchlists is part of Atlas ${product === 'raise' ? 'Raise' : 'Scout'}.`)],
	['DELETE', '/api/user-watchlists/:id/share', () => noContent()],
	['GET', '/api/user-watchlists/:id/companies', async (ctx) => {
		const st = await load(ctx);
		return st.lists.some((l) => l.id === ctx.params.id) ? { data: st.items[ctx.params.id] ?? [] } : notFound();
	}],
	['POST', '/api/user-watchlists/:id/companies/:companyId', async (ctx) => {
		const st = await load(ctx);
		const { id, companyId } = ctx.params;
		if (!st.lists.some((l) => l.id === id)) return notFound();
		const current = st.items[id] ?? [];
		if (!current.some((c) => c.id === companyId)) {
			const added = await companyFor(companyId);
			save(ctx, { ...st, items: { ...st.items, [id]: [added, ...current] } });
		}
		return { ok: true };
	}],
	['DELETE', '/api/user-watchlists/:id/companies/:companyId', async (ctx) => {
		const st = await load(ctx);
		const { id, companyId } = ctx.params;
		if (!st.lists.some((l) => l.id === id)) return notFound();
		save(ctx, { ...st, items: { ...st.items, [id]: (st.items[id] ?? []).filter((c) => c.id !== companyId) } });
		return noContent();
	}],
	// Scout board stage moves (scout.controller.ts moveStage). The board keeps
	// stages in the browser today; answering here keeps practice off the real list if it starts calling this.
	['PATCH', '/api/scout/watchlists/:id/companies/:companyId/stage', async (ctx) => {
		const st = await load(ctx);
		const { id, companyId } = ctx.params;
		const stage = optText((ctx.body as { stage?: unknown } | null)?.stage);
		if (!stage) return badRequest('Pick a stage.');
		const items = st.items[id];
		if (!items?.some((c) => c.id === companyId)) return notFound();
		save(ctx, { ...st, items: { ...st.items, [id]: items.map((c) => (c.id === companyId ? { ...c, stage } : c)) } });
		return { moved: true };
	}],
];
