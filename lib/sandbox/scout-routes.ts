/**
 * Sandbox ("Walk the Pitch") — Scout-only endpoints answered locally.
 *
 * The practice run ("Walk the Pitch") starts as a READY-MADE sample investor:
 * Jordan Ellis, partner at the fictional Kestrel Field Ventures, with a fully
 * set-up, verified Scout workspace and a seed–Series A European sports-tech
 * thesis built from REAL taxonomy rows (sector / sport / round-type ids are
 * production ids, see server/scripts/local-db/seed-data). Home, Recommended
 * and Deal Flow therefore work from the first request.
 *
 * Every route still answers as the server does for the state it holds
 * (server/src/modules/scout/**), so edits behave like the real product:
 *
 *   - no row:   only reachable if a stored state says so. GET /api/scout → null;
 *               GET /home → needs_setup; GET /recommended and deal-flow writes →
 *               403 SCOUT_NOT_SET_UP.
 *   - row:      the sample's, or one re-created by PATCH /api/scout or PUT
 *               /thesis. Recommended is scored against the stored thesis.
 *   - complete: `setup_completed_at` is stamped on the sample; PATCH never clears it.
 *
 * Consumers: use-thesis.ts / onboarding.tsx / thesis-settings.tsx (profile,
 * thesis), scout-home.tsx (home), recommended.tsx, deal-flow.tsx,
 * deal-detail.tsx, share-deal.tsx.
 *
 * Only writes call `ctx.save()`. The interceptor hands each request its own
 * snapshot of state, so a GET that saved after an `await` could overwrite a
 * wizard step that landed meanwhile — caches therefore live in module memory.
 *
 * Recommendations are REAL companies (public `/api/companies`). Deal Flow
 * listings are fictional on purpose: a listing asserts a live round, valuation
 * and commitments, which would be invented claims about a real business.
 */
import type { DealRow, MyDealRow } from '@/components/scout/deal-types';
import type { ScoutProfile, ServerThesis, TaxonomyRef } from '@/components/scout/thesis-codec';
import { daysFromNow, gated, json, type SandboxCtx, type SandboxRoute } from './types';

// ─── Constants & state ───────────────────────────────────────────────────────

const RECOMMENDED_CAP = 10;
const COMPANY_SAMPLE_PATH = '/api/companies?limit=12&page=1';
const NEW_MATCH_WINDOW_MS = 7 * 864e5;

/**
 * Bump to discard earlier sandbox state. v2 started as a brand-new customer
 * with no workspace; v3 starts as the ready-made Kestrel Field Ventures sample.
 */
const STATE_KEY = 'scoutV3';
const LEGACY_KEYS = ['scoutProfile', 'scoutThesis', 'scoutDrafts', 'scoutCompanies', 'scoutV2'];

/** `ScoutProfileRow` on the server; the client reads the `ScoutProfile` subset. */
interface ScoutProfileRow extends ScoutProfile {
	id: string;
	profile_id: string;
	claim_id: string | null;
	investor_id: string | null;
	photo_url: string | null;
	location_id: string | null;
	created_at: string;
	updated_at: string;
}

/** A submitter's own deal (`SELECT *` server-side). */
type DraftDeal = MyDealRow & Record<string, unknown>;

interface ScoutState {
	/** null = no `scout_profiles` row yet. */
	profile: ScoutProfileRow | null;
	/** null = nothing saved; reads as the server's empty thesis. */
	thesis: ServerThesis | null;
	drafts: DraftDeal[];
}

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

function readState(ctx: SandboxCtx): ScoutState {
	const s = ctx.state[STATE_KEY];
	if (!isRecord(s)) return sampleState();
	return {
		profile: isRecord(s.profile) ? (s.profile as unknown as ScoutProfileRow) : null,
		thesis: isRecord(s.thesis) ? (s.thesis as unknown as ServerThesis) : null,
		drafts: Array.isArray(s.drafts) ? (s.drafts as DraftDeal[]) : [],
	};
}

function writeState(ctx: SandboxCtx, next: ScoutState) {
	for (const k of LEGACY_KEYS) delete ctx.state[k];
	ctx.state[STATE_KEY] = next;
	ctx.save();
}

// ─── Server responses ────────────────────────────────────────────────────────

/** scout.controller.ts:230-237 and scout-dealflow.controller.ts:265-272. */
const notSetUp = () => json({ error: { code: 'SCOUT_NOT_SET_UP', message: 'complete Scout setup first' } }, 403);
const notFound = () => json({ error: { code: 'NOT_FOUND', message: 'not found' } }, 404);
const badRequest = (message: string) => json({ error: { code: 'VALIDATION_ERROR', message } }, 400);
const isoDate = (days: number) => daysFromNow(days).slice(0, 10);

/** scout.repository.ts:211-218 — an unset thesis reads as empty. */
const EMPTY_THESIS: ServerThesis = {
	sectors: [], sports: [], round_types: [], geo: [], business_models: [],
	cheque_min: null, cheque_max: null, traction_floor: null, invest_style: null, exclusions: null,
};

// ─── Sample identity: Kestrel Field Ventures ─────────────────────────────────

/** Fixed ids so the sample row reads the same on every request. */
const SAMPLE_PROFILE_ID = '5c0e7a10-3f4b-4d2a-9b6e-1a2b3c4d5e01';
/** Set = verified (`verification` on /home reads `investor_id`). Fictional fund, not a directory row. */
const SAMPLE_INVESTOR_ID = '5c0e7a10-3f4b-4d2a-9b6e-1a2b3c4d5e02';

/** Real taxonomy rows (production ids), so recommendations score against the live sector tree. */
const SAMPLE_THESIS: ServerThesis = {
	sectors: [
		{ id: 'a4f1d65b-33ec-482a-a9de-e46c01dd2836', name: 'Fan Engagement' },
		{ id: '8dddaed5-95f3-4d96-9569-fc5878db810a', name: 'Recovery & Injury Prevention' },
		{ id: '55d31fcd-8802-4f3f-9183-3545aea50a7c', name: 'Tracking & Analytics' },
	],
	sports: [{ id: 'f15b372b-4b3b-42cb-869c-a40db20d0fca', name: 'Football / Soccer' }],
	round_types: [
		{ id: 'd5cfe586-f001-402a-8d7b-35862d047053', name: 'Series A' },
		{ id: 'f5ed8eeb-33d5-4e55-bc47-064248942cce', name: 'Seed Round' },
	],
	geo: [{ scope_type: 'continent', scope_value: 'Europe' }],
	business_models: ['b2b'],
	cheque_min: 250_000,
	cheque_max: 1_500_000,
	traction_floor: 'Early revenue',
	invest_style: 'either',
	exclusions: 'Betting & prediction',
};

/** The state a fresh practice run starts in: set up, verified, thesis saved. */
function sampleState(): ScoutState {
	const profile: ScoutProfileRow = {
		id: SAMPLE_PROFILE_ID, profile_id: 'sandbox', claim_id: null, investor_id: SAMPLE_INVESTOR_ID,
		full_name: 'Jordan Ellis', role_title: 'Partner', linkedin_url: null, photo_url: null,
		fund_name: 'Kestrel Field Ventures', investor_type: 'venture_capital',
		fund_website: 'https://kestrelfield.example', location_id: null, hq_country: 'United Kingdom', hq_city: 'London', aum: '€25–100m',
		setup_completed_at: daysFromNow(-21), created_at: daysFromNow(-21), updated_at: daysFromNow(-2),
	};
	return { profile, thesis: SAMPLE_THESIS, drafts: [] };
}

const HOME_PROMPTS = [
	'Find companies matching my thesis',
	'Show recent sports tech deals',
	"What's new in fan engagement?",
	'Find European Series A companies',
];

// ─── Profile ─────────────────────────────────────────────────────────────────

const PROFILE_KEYS = [
	'full_name', 'role_title', 'linkedin_url', 'photo_url',
	'fund_name', 'investor_type', 'fund_website', 'location_id', 'hq_country', 'hq_city', 'aum',
] as const;

const newProfileRow = (): ScoutProfileRow => {
	const now = daysFromNow(0);
	return {
		id: crypto.randomUUID(), profile_id: 'sandbox', claim_id: null, investor_id: null,
		full_name: null, role_title: null, linkedin_url: null, photo_url: null,
		fund_name: null, investor_type: null, fund_website: null, location_id: null, hq_country: null, hq_city: null, aum: null,
		setup_completed_at: null, created_at: now, updated_at: now,
	};
};

/**
 * `POST` and `PATCH /api/scout` (scout.controller.ts:101-122 → repository
 * upsert): creates the row on first call, writes only the keys present, and
 * `setup_completed: true` stamps `setup_completed_at` once, never clearing it.
 */
function upsertProfile(ctx: SandboxCtx) {
	if (!isRecord(ctx.body)) return badRequest('expected a JSON object');
	const body = ctx.body;
	const state = readState(ctx);
	const current = state.profile ?? newProfileRow();
	const changes = Object.fromEntries(
		PROFILE_KEYS.filter((k) => k in body).map((k) => [k, typeof body[k] === 'string' ? body[k] : null]),
	);
	const now = daysFromNow(0);
	const profile: ScoutProfileRow = {
		...current,
		...changes,
		setup_completed_at: current.setup_completed_at ?? (body.setup_completed === true ? now : null),
		updated_at: now,
	};
	writeState(ctx, { ...state, profile });
	return profile;
}

// ─── Reference data (public endpoints, cached in memory) ─────────────────────

interface RefRow { id: string; name: string | null; parent_id?: string | null }

const refCache = new Map<string, Promise<RefRow[]>>();

/** `/api/sectors` etc. answer a bare array (or `{data}`). Empty on failure. */
function reference(ctx: SandboxCtx, path: string): Promise<RefRow[]> {
	const hit = refCache.get(path);
	if (hit) return hit;
	const p = fetch(new URL(path, ctx.url.origin))
		.then((r) => (r.ok ? r.json() : []))
		.then((d: unknown) => (Array.isArray(d) ? d : isRecord(d) && Array.isArray(d.data) ? d.data : []) as RefRow[])
		.catch(() => {
			refCache.delete(path);
			return [] as RefRow[];
		});
	refCache.set(path, p);
	return p;
}

const REF_PATHS = { sectors: '/api/sectors', sports: '/api/sports', rounds: '/api/round-types' } as const;

/** Ids → `TaxonomyRef`s. Unknown ids are dropped, as the server does; an omitted group is left alone. */
function refsById(rows: RefRow[], ids: unknown, previous: TaxonomyRef[]): TaxonomyRef[] {
	if (!Array.isArray(ids)) return previous;
	const byId = new Map(rows.map((r) => [r.id, r]));
	const known = new Map(previous.map((r) => [r.id, r]));
	return ids
		.filter((id): id is string => typeof id === 'string')
		.map((id) => {
			const row = byId.get(id);
			return row ? { id, name: row.name } : known.get(id);
		})
		.filter((r): r is TaxonomyRef => !!r)
		.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
}

// ─── Thesis ──────────────────────────────────────────────────────────────────

/** scout.controller.ts:119-122 — readable with or without a row. */
const getThesis = (ctx: SandboxCtx): ServerThesis => readState(ctx).thesis ?? EMPTY_THESIS;

const pick = <T>(body: Record<string, unknown>, key: string, prev: T, valid: (v: unknown) => boolean): T =>
	key in body && (body[key] === null || valid(body[key])) ? (body[key] as T) : prev;

/**
 * `PUT /api/scout/thesis` (scout.controller.ts:129-142): creates the workspace
 * if there is none, replaces only the groups named in the body, and returns the
 * stored state.
 */
async function putThesis(ctx: SandboxCtx) {
	if (!isRecord(ctx.body)) return badRequest('expected a JSON object');
	const body = ctx.body;
	const state = readState(ctx);
	const prev = state.thesis ?? EMPTY_THESIS;
	const [sectors, sports, rounds] = await Promise.all([
		reference(ctx, REF_PATHS.sectors), reference(ctx, REF_PATHS.sports), reference(ctx, REF_PATHS.rounds),
	]);
	const isNum = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v >= 0;
	const isStr = (v: unknown) => typeof v === 'string';
	const thesis: ServerThesis = {
		sectors: refsById(sectors, body.sector_ids, prev.sectors),
		sports: refsById(sports, body.sport_ids, prev.sports),
		round_types: refsById(rounds, body.round_type_ids, prev.round_types),
		geo: Array.isArray(body.geo)
			? body.geo.filter((g): g is ServerThesis['geo'][number] => isRecord(g) && isStr(g.scope_type) && isStr(g.scope_value))
			: prev.geo,
		business_models: pick(body, 'business_models', prev.business_models, Array.isArray) ?? [],
		cheque_min: pick(body, 'cheque_min', prev.cheque_min, isNum),
		cheque_max: pick(body, 'cheque_max', prev.cheque_max, isNum),
		traction_floor: pick(body, 'traction_floor', prev.traction_floor, isStr),
		invest_style: pick(body, 'invest_style', prev.invest_style, isStr),
		exclusions: pick(body, 'exclusions', prev.exclusions, isStr),
	};
	if (thesis.cheque_min != null && thesis.cheque_max != null && thesis.cheque_min > thesis.cheque_max) {
		return badRequest('cheque_min must not exceed cheque_max');
	}
	writeState(ctx, { ...state, profile: state.profile ?? newProfileRow(), thesis });
	return thesis;
}

// ─── Recommendations (real companies, scored like the server) ────────────────

/** The fields of a public `/api/companies` row this module reads. */
interface CompanyLite {
	id: string; name: string; slug: string | null; description: string | null;
	website: string | null; custom_logo_url: string | null; sector_id: string | null;
	primary_sector: string | null; hq_city: string | null; hq_country: string | null;
	total_funding_usd: string | null;
}

/** Mirrors `RecommendationRow` / `Recommendation` in recommended.tsx. */
interface Recommendation {
	id: string; name: string; slug: string | null; description: string | null;
	website: string | null; custom_logo_url: string | null; sector: string | null;
	city: string | null; country: string | null; total_funding_usd: string | null;
	latest_round: string | null;
	match_sector: boolean; match_geo: boolean; match_stage: boolean; match_cheque: boolean;
	match_count: number;
}

/** Used only when the public companies list cannot be read. */
export const FALLBACK_COMPANIES: CompanyLite[] = [
	['Pitchside Metrics', 'Computer-vision match analytics for semi-pro football clubs.', 'Tracking & Analytics', 'Leeds', 'United Kingdom', '1800000'],
	['Racketry', 'Court booking and league software for padel clubs.', 'Booking & Discovery', 'Valencia', 'Spain', '650000'],
	['Fanfold', 'Loyalty and ticketing wallet for mid-tier European clubs.', 'Fan Engagement', 'Hamburg', 'Germany', '2400000'],
	['Strideline', 'Running gait coaching app built on wearable data.', 'Tracking & Analytics', 'Stockholm', 'Sweden', '900000'],
].map(([name, description, sector, city, country, funding], i) => ({
	id: `7a1c3e5f-0b2d-4c6e-8f1a-3b5d7f9a1c0${i}`,
	name, slug: null, description, website: null, custom_logo_url: null, sector_id: null,
	primary_sector: sector, hq_city: city, hq_country: country, total_funding_usd: funding,
}));

const str = (v: unknown): string | null => (typeof v === 'string' && v ? v : null);

function toCompanyLite(raw: unknown): CompanyLite | null {
	if (!isRecord(raw) || typeof raw.id !== 'string' || typeof raw.name !== 'string') return null;
	const funding = raw.total_funding_usd ?? raw.total_funding_usd_cached;
	return {
		id: raw.id, name: raw.name, slug: str(raw.slug), description: str(raw.description),
		website: str(raw.website), custom_logo_url: str(raw.custom_logo_url), sector_id: str(raw.sector_id),
		primary_sector: str(raw.primary_sector), hq_city: str(raw.hq_city), hq_country: str(raw.hq_country),
		total_funding_usd: funding == null ? null : String(funding),
	};
}

let companyCache: Promise<CompanyLite[]> | null = null;

/** One public fetch per page load. Fictional fallback on failure (not cached, so it retries). */
function sampleCompanies(ctx: SandboxCtx): Promise<CompanyLite[]> {
	if (companyCache) return companyCache;
	const p = fetch(new URL(COMPANY_SAMPLE_PATH, ctx.url.origin))
		.then(async (res) => {
			if (!res.ok) throw new Error(String(res.status));
			const body: unknown = await res.json();
			const list = isRecord(body) && Array.isArray(body.data) ? body.data : [];
			const rows = list.map(toCompanyLite).filter((c): c is CompanyLite => !!c);
			if (rows.length === 0) throw new Error('empty company list');
			return rows;
		})
		.catch(() => {
			companyCache = null;
			return FALLBACK_COMPANIES;
		});
	companyCache = p;
	return p;
}

/** Country → the region and continent the thesis picker offers. */
const GEO: Array<[region: string, continent: string, countries: string[]]> = [
	['DACH', 'Europe', ['Germany', 'Austria', 'Switzerland']],
	['UK & Ireland', 'Europe', ['United Kingdom', 'UK', 'England', 'Scotland', 'Wales', 'Ireland']],
	['Nordics', 'Europe', ['Sweden', 'Denmark', 'Norway', 'Finland', 'Iceland']],
	['France & Benelux', 'Europe', ['France', 'Netherlands', 'Belgium', 'Luxembourg']],
	['Southern Europe', 'Europe', ['Spain', 'Portugal', 'Italy', 'Greece', 'Malta', 'Cyprus']],
	['CEE', 'Europe', ['Poland', 'Czech Republic', 'Czechia', 'Slovakia', 'Hungary', 'Romania', 'Bulgaria', 'Croatia', 'Slovenia', 'Serbia', 'Ukraine']],
	['Baltics', 'Europe', ['Estonia', 'Latvia', 'Lithuania']],
	['USA & Canada', 'North America', ['United States', 'USA', 'US', 'Canada']],
];

function geoMatches(country: string | null, geo: ServerThesis['geo']): boolean {
	if (!country) return false;
	const c = country.replace(/^the\s+/i, '').trim().toLowerCase();
	const entry = GEO.find(([, , list]) => list.some((x) => x.toLowerCase() === c));
	return geo.some((g) => {
		const v = g.scope_value.toLowerCase();
		if (g.scope_type === 'country') return v === c;
		if (g.scope_type === 'region') return !!entry && entry[0].toLowerCase() === v;
		return (!!entry && entry[1].toLowerCase() === v) || v === 'global';
	});
}

/** True when `id` is `target` or sits under it in the sector tree (the server's `descendants` CTE). */
function underSector(id: string | null, targets: Set<string>, byId: Map<string, RefRow>): boolean {
	let cur = id ? byId.get(id) : undefined;
	if (id && targets.has(id)) return true;
	for (let guard = 0; cur?.parent_id && guard < 10; guard += 1) {
		if (targets.has(cur.parent_id)) return true;
		cur = byId.get(cur.parent_id);
	}
	return false;
}

/** Scored against the caller's own thesis; an empty thesis matches nothing (server parity). */
async function recommendations(ctx: SandboxCtx, thesis: ServerThesis): Promise<Recommendation[]> {
	const [companies, sectors] = await Promise.all([sampleCompanies(ctx), reference(ctx, REF_PATHS.sectors)]);
	const byId = new Map(sectors.map((s) => [s.id, s]));
	const sectorIds = new Set(thesis.sectors.map((s) => s.id));
	const sectorNames = new Set(thesis.sectors.map((s) => (s.name ?? '').toLowerCase()));
	return companies
		.map((c): Recommendation => {
			const flags = {
				match_sector: c.sector_id
					? underSector(c.sector_id, sectorIds, byId)
					: sectorNames.has((c.primary_sector ?? '').toLowerCase()),
				match_geo: geoMatches(c.hq_country, thesis.geo),
				// The public list carries no latest round, so stage and cheque cannot
				// be shown as matched — the server's rule for a company with no deal.
				match_stage: false,
				match_cheque: false,
			};
			return {
				id: c.id, name: c.name, slug: c.slug, description: c.description, website: c.website,
				custom_logo_url: c.custom_logo_url, sector: c.primary_sector, city: c.hq_city, country: c.hq_country,
				total_funding_usd: c.total_funding_usd, latest_round: null,
				...flags, match_count: Object.values(flags).filter(Boolean).length,
			};
		})
		.filter((r) => r.match_count > 0)
		.sort((a, b) => b.match_count - a.match_count || a.name.localeCompare(b.name));
}

/** scout.controller.ts:162-169 — 403 until a row exists. */
async function recommendedRoute(ctx: SandboxCtx) {
	const state = readState(ctx);
	if (!state.profile) return notSetUp();
	const limit = Number(ctx.url.searchParams.get('limit') ?? RECOMMENDED_CAP);
	const offset = Number(ctx.url.searchParams.get('offset') ?? 0);
	const take = Math.min(RECOMMENDED_CAP, Number.isFinite(limit) && limit > 0 ? limit : RECOMMENDED_CAP);
	const start = Number.isFinite(offset) && offset > 0 ? offset : 0;
	return { data: (await recommendations(ctx, state.thesis ?? EMPTY_THESIS)).slice(start, start + take) };
}

// ─── Home ────────────────────────────────────────────────────────────────────

/** scout-home.service.ts:51-67 — the no-row read-model, verbatim. */
const HOME_NO_ROW = {
	needs_setup: true,
	verification: 'unverified',
	scout: null,
	thesis_set: false,
	snapshot: { watchlist_companies: 0, thesis_dimensions: 0 },
	attention: [{
		id: 'onboarding',
		title: 'Complete your investment thesis',
		why: 'Tell Atlas what you are looking for to personalise Scout.',
		cta_label: 'Set up thesis',
		cta_href: '/thesis',
	}],
	prompts: HOME_PROMPTS,
};

/** `new_matches` server-side: fundraising signals in the last 7 days (scout.repository.ts homeCounts). */
async function newMatchCount(ctx: SandboxCtx): Promise<number> {
	try {
		const res = await fetch(new URL('/api/signals?type=fundraising&limit=100', ctx.url.origin));
		if (!res.ok) return 0;
		const body: unknown = await res.json();
		const rows = isRecord(body) && Array.isArray(body.data) ? body.data : [];
		const since = Date.now() - NEW_MATCH_WINDOW_MS;
		return rows.filter((r) => isRecord(r) && Date.parse(String(r.occurred_at)) >= since).length;
	} catch {
		return 0;
	}
}

/**
 * Companies across the user's watchlists. Read through the app's own
 * `/api/user-watchlists`, which the sandbox's core routes answer with the sample
 * watchlists, so the count matches the Watchlists page. 0 on failure.
 */
async function watchlistCompanyCount(ctx: SandboxCtx): Promise<number> {
	try {
		const res = await fetch(new URL('/api/user-watchlists', ctx.url.origin));
		if (!res.ok) return 0;
		const body: unknown = await res.json();
		const lists = isRecord(body) && Array.isArray(body.data) ? body.data : [];
		return lists.reduce((n: number, l) => n + (isRecord(l) && typeof l.company_count === 'number' ? l.company_count : 0), 0);
	} catch {
		return 0;
	}
}

/** `ScoutHomeService.build` + `attention()` (scout-home.service.ts:49-171) for a row that exists. */
async function home(ctx: SandboxCtx) {
	const { profile, thesis } = readState(ctx);
	if (!profile) return HOME_NO_ROW;
	const t = thesis ?? EMPTY_THESIS;
	const dimensions = t.sectors.length + t.sports.length + t.round_types.length + t.geo.length;
	// Sandbox choice: when the live feed has no fundraising signal this week,
	// fall back to the thesis matches so the "new matches" card (the tour's
	// first step) is always there.
	const [signalMatches, watchlistCompanies] = await Promise.all([newMatchCount(ctx), watchlistCompanyCount(ctx)]);
	const newMatches = signalMatches || (dimensions > 0 ? (await recommendations(ctx, t)).length : 0);
	const verification = profile.investor_id ? 'verified' : profile.claim_id ? 'pending' : 'unverified';
	const attention = [
		...(!profile.setup_completed_at ? [{
			id: 'finish-setup', title: 'Finish setting up',
			why: 'A few more details and Atlas can start matching companies to you.',
			cta_label: 'Finish setup', cta_href: '/home',
		}] : []),
		...(dimensions === 0 ? [{
			id: 'thesis', title: 'Complete your investment thesis',
			why: 'Tell Atlas what you are looking for to personalise Scout.',
			cta_label: 'Set up thesis', cta_href: '/thesis',
		}] : []),
		...(dimensions > 0 && newMatches > 0 ? [{
			id: 'new-matches',
			title: `${newMatches} ${newMatches === 1 ? 'company matches' : 'companies match'} your thesis`,
			why: 'Companies identified as actively raising since last week.',
			cta_label: 'Review matches', cta_href: '/recommended', count: newMatches,
		}] : []),
		...(dimensions > 0 && watchlistCompanies === 0 ? [{
			id: 'first-watchlist', title: 'Start a watchlist',
			why: 'Track the companies you are following and Atlas will tell you when they move.',
			cta_label: 'Browse companies', cta_href: '/companies',
		}] : []),
	].slice(0, 3);
	return {
		needs_setup: !profile.setup_completed_at,
		verification,
		scout: { full_name: profile.full_name, fund_name: profile.fund_name, investor_type: profile.investor_type },
		thesis_set: dimensions > 0,
		snapshot: { watchlist_companies: watchlistCompanies, thesis_dimensions: dimensions },
		attention,
		prompts: HOME_PROMPTS,
	};
}

/** Same rows as the public feed; un-gated by setup server-side (scout.controller.ts:146-157). */
async function signals(ctx: SandboxCtx) {
	try {
		const res = await fetch(new URL(`/api/signals${ctx.url.search}`, ctx.url.origin));
		if (!res.ok) throw new Error(String(res.status));
		return await res.json();
	} catch {
		return { data: [] };
	}
}

// ─── Deal Flow ───────────────────────────────────────────────────────────────

const DEAL_BASE: Omit<DealRow, 'id' | 'source' | 'company_name' | 'company_description' | 'company_hq' | 'sector'> = {
	status: 'live', is_featured: false,
	company_website: null, company_id: null, company_anonymous: false,
	round_type: 'Seed', instrument: 'priced_equity', currency_code: 'EUR',
	target_amount: null, committed_amount: null, ticket_min: null, ticket_max: null,
	valuation: null, valuation_amount: null, valuation_basis: null, valuation_undisclosed: null,
	target_close_date: null, lead_status: null, lead_investor: null,
	submitter_name: null, submitter_anonymous: false,
	member_perspective: null, member_relationship: null, member_commitment: null,
	has_deck: false, has_one_pager: false, materials_access: 'on_request',
	disclosed: false, interest_status: null,
};

/** The featured listing (Stridewise); the guided tour opens it. */
export const SANDBOX_FEATURED_DEAL_ID = 'd1f0a3b2-4c5d-4e6f-8a7b-9c0d1e2f3a01';

/** Fictional live listings. Money is `::text` on the server, so strings here. */
const SAMPLE_DEALS: DealRow[] = [
	{
		...DEAL_BASE, id: SANDBOX_FEATURED_DEAL_ID, source: 'verified_raise', is_featured: true,
		company_name: 'Stridewise', company_website: 'stridewise.example',
		company_hq: 'Copenhagen, Denmark', sector: 'Tracking & Analytics',
		company_description: 'Gait analysis for runners from a phone camera, sold to running clubs and physio chains on a per-seat subscription.',
		round_type: 'Series A', target_amount: '4000000', committed_amount: '2600000',
		ticket_min: '250000', ticket_max: '1000000', valuation: '€18m pre-money',
		target_close_date: isoDate(54), lead_status: 'confirmed', lead_investor: 'Nordbrook Capital',
		member_perspective: '42 paying clubs across four Nordic markets, €1.1m ARR growing 14% month on month. The round funds a German launch and a clinical-grade injury-risk model.',
		has_deck: true, has_one_pager: true, materials_access: 'immediate',
	},
	{
		...DEAL_BASE, id: 'd1f0a3b2-4c5d-4e6f-8a7b-9c0d1e2f3a02', source: 'verified_raise',
		company_name: 'Courtline', company_website: 'courtline.example',
		company_hq: 'Madrid, Spain', sector: 'Booking & Discovery',
		company_description: 'Booking, payments and league software for padel clubs, live in 310 venues across Spain and Portugal.',
		target_amount: '1500000', committed_amount: '900000', ticket_min: '100000', ticket_max: '400000',
		valuation: '€7m pre-money', target_close_date: isoDate(38), lead_status: 'confirmed', lead_investor: 'Sierra Norte Partners',
		member_perspective: 'Profitable unit economics at club level; 68% of revenue is SaaS. Raising to enter Italy and the UK.',
		has_deck: true, materials_access: 'immediate',
	},
	{
		...DEAL_BASE, id: 'd1f0a3b2-4c5d-4e6f-8a7b-9c0d1e2f3a03', source: 'verified_raise',
		company_name: 'Matchday Loop', company_website: 'matchdayloop.example',
		company_hq: 'Manchester, United Kingdom', sector: 'Fan Engagement',
		company_description: 'White-label loyalty and matchday rewards for second-tier football clubs, paid per active fan.',
		target_amount: '2000000', committed_amount: '1150000',
		valuation: 'Not disclosed', target_close_date: isoDate(71), lead_status: 'seeking',
		member_perspective: '19 clubs signed, 240k monthly active fans. Seeking a lead for the remaining €850k.',
		has_deck: true, has_one_pager: true, materials_access: 'on_request',
	},
	{
		...DEAL_BASE, id: 'd1f0a3b2-4c5d-4e6f-8a7b-9c0d1e2f3a04', source: 'circle',
		company_name: null, company_anonymous: true,
		company_hq: 'Munich, Germany', sector: 'Tracking & Analytics',
		company_description: 'Wearable load monitoring built for women’s football, with cycle-aware training recommendations.',
		target_amount: '2500000', committed_amount: '1400000',
		target_close_date: isoDate(46), lead_status: 'confirmed',
		submitter_anonymous: true, member_relationship: 'investing_this_round', member_commitment: '300000',
		member_perspective: 'Working with three Frauen-Bundesliga clubs and one national federation. We are taking €300k of the round.',
		has_deck: true, materials_access: 'immediate',
	},
	{
		...DEAL_BASE, id: 'd1f0a3b2-4c5d-4e6f-8a7b-9c0d1e2f3a05', source: 'circle',
		company_name: 'Kitroom', company_website: 'kitroom.example',
		company_hq: 'Amsterdam, Netherlands', sector: 'Team & Club Management',
		company_description: 'B2B marketplace for grassroots teamwear: clubs design kits, suppliers bid, members order direct.',
		round_type: 'Pre-seed', instrument: 'safe', target_amount: '750000', committed_amount: '480000',
		valuation: '€4.5m cap', target_close_date: isoDate(29), lead_status: 'not_required',
		submitter_name: 'Maren Holt', member_relationship: 'existing_investor', member_commitment: '75000',
		member_perspective: 'I backed the angel round. GMV tripled in the last two quarters with no paid acquisition.',
		has_one_pager: true, materials_access: 'on_request',
	},
	{
		...DEAL_BASE, id: 'd1f0a3b2-4c5d-4e6f-8a7b-9c0d1e2f3a06', source: 'circle',
		company_name: 'Tidepool Sport', company_website: 'tidepoolsport.example',
		company_hq: 'Lisbon, Portugal', sector: 'Media Production',
		company_description: 'Automated multi-camera production for surf and open-water events, licensed to organisers and broadcasters.',
		target_amount: '1200000', target_close_date: isoDate(63), lead_status: 'seeking',
		submitter_name: 'Tomás Reis', member_relationship: 'advisor_or_board',
		member_perspective: 'Advisor since 2025. Strong pipeline with two world-tour events; needs a sector-specialist lead.',
		materials_access: 'on_request',
	},
];

const DEAL_KEYS = [
	'company_id', 'company_name', 'company_website', 'company_description', 'company_hq', 'sector_id',
	'founder_contact_name', 'founder_contact_email', 'founder_contact_phone',
	'round_type', 'instrument', 'currency_code', 'target_amount', 'committed_amount',
	'ticket_min', 'ticket_max', 'valuation', 'target_close_date', 'lead_status', 'lead_investor',
	'member_relationship', 'member_commitment', 'member_perspective',
	'submitter_anonymous', 'company_anonymous', 'materials_access', 'deck_path', 'one_pager_path',
	'founder_consent',
] as const;

/** `POST /api/scout/dealflow` (id = null) and `PATCH /:id`: 403 without a row, then write only the keys present. */
function upsertDraft(ctx: SandboxCtx, id: string | null) {
	const state = readState(ctx);
	if (!state.profile) return notSetUp();
	if (!isRecord(ctx.body)) return badRequest('expected a JSON object');
	const body = ctx.body;
	const changes = Object.fromEntries(DEAL_KEYS.filter((k) => k in body).map((k) => [k, body[k]]));
	const now = daysFromNow(0);
	if (id === null) {
		const row: DraftDeal = {
			id: crypto.randomUUID(), source: 'circle', status: 'draft', company_name: null, round_type: null,
			currency_code: null, target_amount: null, review_notes: null, submitted_at: null,
			created_at: now, updated_at: now, company_anonymous: false, submitter_anonymous: false,
			founder_consent: false, committed_amount: null, lead_status: null, target_close_date: null, ...changes,
		};
		writeState(ctx, { ...state, drafts: [row, ...state.drafts] });
		return row;
	}
	const existing = state.drafts.find((m) => m.id === id);
	// The server scopes the UPDATE by owner and status; anything else is a 404.
	if (!existing || !['draft', 'changes_requested'].includes(existing.status)) return notFound();
	const updated: DraftDeal = { ...existing, ...changes, updated_at: now };
	writeState(ctx, { ...state, drafts: state.drafts.map((m) => (m.id === id ? updated : m)) });
	return updated;
}

/** Readable without a row — the server uses `scoutIdOrNull` (scout-dealflow.controller.ts:50-53). */
function dealList(ctx: SandboxCtx) {
	const tab = ctx.url.searchParams.get('tab') ?? 'all';
	const limit = Math.min(50, Math.max(1, Number(ctx.url.searchParams.get('limit')) || 20));
	const offset = Math.max(0, Number(ctx.url.searchParams.get('offset')) || 0);
	const rows = SAMPLE_DEALS.filter((d) => (
		tab === 'featured' ? d.is_featured
			: tab === 'verified' ? d.source === 'verified_raise'
				: tab === 'circle' ? d.source === 'circle'
					: true
	));
	return { data: rows.slice(offset, offset + limit) };
}

const findDeal = (id: string | undefined) => SAMPLE_DEALS.find((d) => d.id === id);

/** Document opens are gated, but only for documents the real server would release. */
function documentRoute(ctx: SandboxCtx, which: 'deck' | 'one_pager') {
	const d = findDeal(ctx.params.id);
	const present = which === 'deck' ? d?.has_deck : d?.has_one_pager;
	const allowed = !!d && (d.disclosed || (d.materials_access === 'immediate' && !d.company_anonymous));
	if (!d || !present || !allowed) return notFound();
	return gated('scout', 'Opening deal documents is part of Scout. Upgrade to read the full pitch deck and one-pager.');
}

// ─── Routes ──────────────────────────────────────────────────────────────────

/** First match wins, so literal paths precede their `:id` siblings. */
export const scoutSandboxRoutes: SandboxRoute[] = [
	// Profile & thesis — the wizard's requests (use-thesis.ts `save`)
	['GET', '/api/scout', (ctx) => json(readState(ctx).profile)],
	['POST', '/api/scout', (ctx) => upsertProfile(ctx)],
	['PATCH', '/api/scout', (ctx) => upsertProfile(ctx)],
	['GET', '/api/scout/thesis', (ctx) => getThesis(ctx)],
	['PUT', '/api/scout/thesis', (ctx) => putThesis(ctx)],

	// Discover
	['GET', '/api/scout/home', (ctx) => home(ctx)],
	['GET', '/api/scout/recommended', (ctx) => recommendedRoute(ctx)],
	['GET', '/api/scout/signals', (ctx) => signals(ctx)],

	// Deal Flow — reads work without a row (server parity); writes need one
	['GET', '/api/scout/dealflow', (ctx) => dealList(ctx)],
	['GET', '/api/scout/dealflow/mine', (ctx) => ({ data: readState(ctx).drafts })],
	['GET', '/api/scout/dealflow/interest', () => ({ data: [] })],
	// Sandbox choice: eligible once a workspace exists, so drafting can be tried.
	['GET', '/api/scout/dealflow/can-submit', (ctx) => ({ can_submit: !!readState(ctx).profile })],
	['POST', '/api/scout/dealflow', (ctx) => upsertDraft(ctx, null)],
	['GET', '/api/scout/dealflow/:id', (ctx) => findDeal(ctx.params.id) ?? notFound()],
	['PATCH', '/api/scout/dealflow/:id', (ctx) => upsertDraft(ctx, ctx.params.id)],
	['GET', '/api/scout/dealflow/:id/deck-url', (ctx) => documentRoute(ctx, 'deck')],
	['GET', '/api/scout/dealflow/:id/one-pager-url', (ctx) => documentRoute(ctx, 'one_pager')],
	['POST', '/api/scout/dealflow/:id/interest', (ctx) => (findDeal(ctx.params.id)
		? gated('scout', 'Requesting an introduction is part of Scout. Upgrade and SportsTechX will connect you with the company.')
		: notFound())],
	['POST', '/api/scout/dealflow/:id/submit', (ctx) => (readState(ctx).profile
		? gated('scout', 'Your draft is saved. Upgrade to Scout to submit it to the Investor Circle for review.')
		: notSetUp())],
];
