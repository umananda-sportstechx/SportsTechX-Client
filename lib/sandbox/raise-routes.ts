/**
 * Sandbox routes for Atlas Raise: the founder's raise profile, criteria, Home
 * read-model, investor watchlist (pipeline), market analysis, investor matches,
 * benchmarks and the Deal Flow opt-in — answered from a workspace kept in the
 * browser (see store.ts).
 *
 * "Walk the Pitch" plays a READY-MADE founder: the sample company Fanloop, a
 * Berlin fan-engagement startup raising a €1.5m seed with €300k committed. The
 * first request builds that workspace (raise set up, criteria filled, watchlist,
 * market and matches in place), so the tour (tours/raise-tour.ts) opens on a
 * live-looking raise instead of the setup wizard.
 *
 * The watchlist and matches use REAL investors (public /api/investors, filtered
 * to the sample company's sector) and the market's competitors are real
 * companies from that sector; fixed sample names are only fallbacks when the
 * public data can't be reached. Writes (add to watchlist, stage moves, settings
 * edits) are kept in this browser.
 *
 * Response shapes mirror server/src/modules/raise/* and recommendations/*
 * (money as strings, YYYY-MM-DD for date columns, ISO for timestamps).
 */
import { PIPELINE_STAGES, type PipelineActivity, type PipelineAdd, type PipelineStage, type PipelineUpdate, type RaiseCriteria, type RaiseUpsert } from '@/types/api';
import { daysFromNow, gated, json, type SandboxCtx, type SandboxRoute } from './types';

// ─── Shapes (mirror the server rows) ────────────────────────────────────────

interface InvestorRef {
	id: string; name: string; slug: string | null; website: string | null; logo_url: string | null;
	hq_country: string | null; category: string | null; description: string | null; deals_count: number | null;
}
interface CompanyRef {
	id: string; name: string; slug: string | null; website: string | null; custom_logo_url: string | null;
	hq_country: string | null; total_funding_usd: number;
}
interface SectorRef { id: string; name: string; parent_id: string | null }

/** RaiseProfileRow in server/src/modules/raise/raise.repository.ts. */
type RaiseRow = Record<string, unknown> & {
	id: string; status: string; setup_completed_at: string | null; dealflow_opt_in: boolean; dealflow_status: string | null;
	company_id: string | null; company_name: string | null; company_sector_id: string | null; company_category: string[] | null;
	hq_country: string | null; target_amount: string | null; committed_amount: string | null; prior_capital_raised: string | null;
};
/** RaiseCriteriaRow in the same file. */
type CriteriaRow = Record<string, unknown> & { raise_id: string; excluded_investor_ids: string[] | null };
/** PipelineRow in raise-pipeline.repository.ts. */
interface PipeRow {
	id: string; raise_id: string; investor_id: string | null; custom_name: string | null;
	investor_name: string | null; investor_slug: string | null; investor_logo_url: string | null; investor_website: string | null;
	stage: PipelineStage; contact_name: string | null; potential_amount: string | null; last_contact_at: string | null;
	next_step: string | null; next_step_due: string | null; notes: string | null; is_archived: boolean;
	added_at: string; updated_at: string;
}
interface Workspace {
	v: number;
	raise: RaiseRow;
	criteria: CriteriaRow;
	pipeline: PipeRow[];
	activity: Record<string, PipelineActivity[]>;
	marketUpdatedAt: string;
}

const STATE_KEY = 'raiseWorkspace';
/** Bump to discard workspaces saved by older builds of this file. v3: ready-made Fanloop raise. */
const VERSION = 3;
const RAISE_ID = 'sbx-raise';
const PIPELINE_SEED_COUNT = 8;
const MATCH_CAP = 10;
const COMPETITOR_COUNT = 9;
const INVESTOR_FETCH = PIPELINE_SEED_COUNT + MATCH_CAP;

/** The sample company (the core's sample deck is Fanloop's too). */
const SAMPLE = {
	company: 'Fanloop', city: 'Berlin', country: 'Germany',
	target: 1_500_000, committed: 300_000,
	/** Taxonomy names to look for, leaf first; the whole list is the fallback path. */
	sector: ['Fans', 'Fan Engagement'],
	/** Used when /api/sectors has no fan-engagement sector (or can't be reached). */
	sectorIdFallback: 'sbx-sector-fan-engagement',
} as const;

const dateOnly = (n: number) => daysFromNow(n).slice(0, 10);
const money = (v: unknown): string | null => (v == null || v === '' || Number.isNaN(Number(v)) ? null : String(Number(v)));
const roundTo = (n: number, step: number) => Math.max(step, Math.round(n / step) * step);
const notFound = (message: string) => json({ error: { code: 'NOT_FOUND', message } }, 404);
const badRequest = (message: string) => json({ error: { code: 'VALIDATION_ERROR', message } }, 400);

// ─── Public reference data (real backend), cached per page load ─────────────

async function getJson<T>(path: string): Promise<T | null> {
	try {
		const res = await fetch(path);
		return res.ok ? ((await res.json()) as T) : null;
	} catch { return null; }
}

const slimInvestor = (i: InvestorRef): InvestorRef => ({
	id: i.id, name: i.name, slug: i.slug ?? null, website: i.website ?? null, logo_url: i.logo_url ?? null,
	hq_country: i.hq_country ?? null, category: i.category ?? null,
	description: i.description ? i.description.slice(0, 280) : null, deals_count: i.deals_count ?? null,
});

const cache = new Map<string, Promise<unknown>>();
function once<T>(key: string, load: () => Promise<T>): Promise<T> {
	if (!cache.has(key)) cache.set(key, load());
	return cache.get(key) as Promise<T>;
}

/** Investors with the most deals — in the sample company's sector first, topped up from the whole directory. */
const loadInvestors = (sectorId: string | null) => once(`inv:${sectorId ?? ''}`, async (): Promise<InvestorRef[]> => {
	const base = `/api/investors?limit=${INVESTOR_FETCH}&page=1&sort=-deals`;
	const inSector = sectorId ? (await getJson<{ data?: InvestorRef[] }>(`${base}&sector_id=${sectorId}`))?.data ?? [] : [];
	const all = inSector.length >= INVESTOR_FETCH ? [] : (await getJson<{ data?: InvestorRef[] }>(base))?.data ?? [];
	const seen = new Set<string>();
	const combined = [...inSector, ...all].filter((i) => !seen.has(i.id) && seen.add(i.id)).slice(0, INVESTOR_FETCH).map(slimInvestor);
	return combined.length ? combined : FALLBACK_INVESTORS;
});

// Accept a bare list or a `{data}` envelope; anything else means "no taxonomy" (fallback sector) rather than a crash.
const loadSectors = () => once('sectors', async () => {
	const body = await getJson<SectorRef[] | { data?: SectorRef[] }>('/api/sectors');
	const list = Array.isArray(body) ? body : body?.data;
	return Array.isArray(list) ? list.filter((s) => s && typeof s.id === 'string' && typeof s.name === 'string') : [];
});

const loadCompetitors = (sectorId: string) => once(`co:${sectorId}`, async () => {
	const page = await getJson<{ data?: CompanyRef[]; total?: number }>(`/api/companies?sector_id=${sectorId}&sort=-total_funding&limit=${COMPETITOR_COUNT}&page=1`);
	const list = (page?.data ?? []).map((c): CompanyRef => ({
		id: c.id, name: c.name, slug: c.slug ?? null, website: c.website ?? null, custom_logo_url: c.custom_logo_url ?? null,
		hq_country: c.hq_country ?? null, total_funding_usd: Number(c.total_funding_usd) || 0,
	}));
	return { list: list.length ? list : FALLBACK_COMPETITORS, tracked: page?.total ?? 214 };
});

/** The real fan-engagement sector (id + root → leaf names), or the fallback when the taxonomy has none. */
async function sampleSector(): Promise<{ id: string; path: string[] }> {
	const list = await loadSectors();
	const byId = new Map(list.map((s) => [s.id, s]));
	const leaf = list.find((s) => /fan\s*engagement/i.test(s.name)) ?? list.find((s) => /\bfans?\b/i.test(s.name));
	if (!leaf) return { id: SAMPLE.sectorIdFallback, path: [...SAMPLE.sector] };
	const path: string[] = [];
	for (let s: SectorRef | undefined = leaf; s; s = s.parent_id ? byId.get(s.parent_id) : undefined) path.unshift(s.name);
	return { id: leaf.id, path };
}

const FALLBACK_COMPETITORS: CompanyRef[] = [
	['Stadion Pulse', 'United Kingdom', 18_500_000], ['Matchday Loop', 'Spain', 9_200_000], ['Curva Labs', 'Italy', 6_400_000],
	['Terrace', 'Netherlands', 4_100_000], ['Kickoff Rewards', 'France', 3_300_000], ['Clubhaus', 'Germany', 2_100_000],
].map(([name, hq_country, total], i) => ({
	id: `sbx-competitor-${i + 1}`, name: String(name), slug: null, website: null, custom_logo_url: null,
	hq_country: String(hq_country), total_funding_usd: Number(total),
}));

const FALLBACK_INVESTOR_NAMES = ['Northline Ventures', 'Fieldhouse Capital', 'Halftime Partners', 'Kinetic Sports Fund', 'Brightside Angels', 'Overlap VC', 'Stoppage Time Capital', 'Grandstand Ventures'];

/** Same reasoning as FALLBACK_COMPETITORS: `/api/investors` is real-backend
 *  reference data with no local route (lib/sandbox/interceptor.ts never
 *  reaches it for an anonymous preview visitor — see app/preview/), so
 *  without this, the "investors who fit" step has nothing to show. */
const FALLBACK_INVESTORS: InvestorRef[] = [
	['Northline Ventures', 'United Kingdom', 'Seed · Series A', 14],
	['Fieldhouse Capital', 'Germany', 'Seed', 9],
	['Halftime Partners', 'France', 'Seed · Series A', 11],
	['Kinetic Sports Fund', 'Netherlands', 'Series A', 7],
	['Brightside Angels', 'Spain', 'Pre-seed · Seed', 22],
	['Overlap VC', 'Sweden', 'Seed', 6],
	['Stoppage Time Capital', 'Italy', 'Seed · Series A', 8],
	['Grandstand Ventures', 'Belgium', 'Seed', 5],
].map(([name, hq_country, category, deals_count], i) => ({
	id: `sbx-investor-${i + 1}`, name: String(name), slug: null, website: null, logo_url: null,
	hq_country: String(hq_country), category: String(category),
	description: `Backs early-stage sports tech, with a focus on fan engagement and recurring-revenue platforms.`,
	deals_count: Number(deals_count),
}));

// ─── The ready-made Fanloop raise ───────────────────────────────────────────

/** A fully set-up raise_profiles row for the sample company. */
const sampleRaise = (sector: { id: string; path: string[] }): RaiseRow => ({
	id: RAISE_ID, profile_id: 'sandbox',
	company_id: null, company_name: SAMPLE.company, company_website: null,
	hq_country: SAMPLE.country, hq_city: SAMPLE.city,
	company_description: 'Fanloop turns match-day moments into a loyalty loop: clubs reward fans for showing up, watching and sharing, and learn who their most valuable supporters are.',
	company_category: sector.path, company_sector_id: sector.id,
	company_stage: 'seed', revenue_status: 'generating', fundraising_process: 'approaching', round_type: 'seed',
	target_amount: String(SAMPLE.target), committed_amount: String(SAMPLE.committed), currency_code: 'EUR',
	target_close_date: dateOnly(75), valuation: null, structure: 'equity', lead_investor_status: 'in_discussion',
	prior_capital_raised: '400000', last_round_date: dateOnly(-420), annual_revenue: '480000', revenue_growth_pct: '200',
	paying_customers: 14, monthly_burn: '65000', runway_months: 9,
	strongest_traction: '14 clubs live across Germany and Austria; ARR up 3x in the last 12 months.',
	pitch_deck_status: 'have', financial_model_status: 'ready', data_room_status: 'in_progress', has_target_list: true,
	status: 'active', stage: null, setup_completed_at: daysFromNow(-21), dealflow_opt_in: false, dealflow_status: null,
	created_at: daysFromNow(-60), updated_at: daysFromNow(-2),
});

const sampleCriteria = (): CriteriaRow => ({
	raise_id: RAISE_ID,
	investor_types: ['VC', 'Angel', 'Strategic'], geographies: ['Europe', 'UK'],
	cheque_min: '100000', cheque_max: '750000', lead_preference: 'both', strategic_ok: true,
	excluded_investor_ids: [], desired_expertise: ['Commercial partnerships', 'Sports rights'],
	biggest_concern: 'Finding a lead who understands sports media.',
});

// ─── Sample watchlist ───────────────────────────────────────────────────────

interface SeedTemplate {
	stage: PipelineStage; contact: string | null; amountShare: number | 'committed' | null; lastContact: number | null;
	nextStep: string | null; due: number | null; notes: string | null; addedDay: number; lastMoveDay: number;
}
const SEED: SeedTemplate[] = [
	{ stage: 'committed', contact: 'Lena Fischer', amountShare: 'committed', lastContact: -3, nextStep: 'Return signed SHA and send wire details', due: 5, notes: 'Verbal commit at partner meeting; wants a board observer seat.', addedDay: -58, lastMoveDay: -2 },
	{ stage: 'due_diligence', contact: 'Marco Bellini', amountShare: 0.33, lastContact: -1, nextStep: 'Share data room and customer cohort retention', due: 3, notes: 'Could lead. Asked for churn by cohort and unit economics.', addedDay: -51, lastMoveDay: -4 },
	{ stage: 'in_conversation', contact: 'Sophie Laurent', amountShare: 0.17, lastContact: -11, nextStep: 'Follow up on partner meeting feedback', due: -4, notes: 'Liked the traction; worried about customer concentration.', addedDay: -44, lastMoveDay: -6 },
	{ stage: 'in_conversation', contact: 'Jonas Berg', amountShare: null, lastContact: -5, nextStep: 'Intro call with a portfolio founder', due: 8, notes: null, addedDay: -36, lastMoveDay: -9 },
	{ stage: 'contacted', contact: 'Amelia Grant', amountShare: null, lastContact: -9, nextStep: null, due: null, notes: 'Sent deck via a warm intro from an existing angel.', addedDay: -30, lastMoveDay: -9 },
	{ stage: 'contacted', contact: null, amountShare: null, lastContact: -12, nextStep: 'Send updated deck after the warm intro', due: -2, notes: null, addedDay: -25, lastMoveDay: -12 },
	{ stage: 'target', contact: null, amountShare: null, lastContact: null, nextStep: 'Ask Lena for a warm intro', due: 10, notes: null, addedDay: -14, lastMoveDay: -14 },
	{ stage: 'target', contact: null, amountShare: null, lastContact: null, nextStep: null, due: null, notes: 'Strong sector fit; check where they are in their fund cycle.', addedDay: -8, lastMoveDay: -8 },
];

function seedAmount(t: SeedTemplate): string | null {
	if (t.amountShare == null) return null;
	if (t.amountShare === 'committed') return String(SAMPLE.committed);
	return String(roundTo(SAMPLE.target * t.amountShare, 25_000));
}

/** created → each stage in order up to the current one (+ a commitment), newest first. */
function seedActivity(t: SeedTemplate, amount: string | null): PipelineActivity[] {
	const target = PIPELINE_STAGES.indexOf(t.stage);
	const out: PipelineActivity[] = [{ type: 'created', payload: { stage: 'target' }, occurred_at: daysFromNow(t.addedDay) }];
	for (let k = 1; k <= target; k++) {
		const day = t.addedDay + ((t.lastMoveDay - t.addedDay) * k) / target;
		out.push({ type: 'stage_change', payload: { from: PIPELINE_STAGES[k - 1], to: PIPELINE_STAGES[k] }, occurred_at: daysFromNow(day) });
	}
	if (amount) out.push({ type: 'commitment', payload: { amount: Number(amount) }, occurred_at: daysFromNow(t.lastMoveDay) });
	return out.reverse();
}

function seedPipeline(investors: InvestorRef[]): Pick<Workspace, 'pipeline' | 'activity'> {
	const activity: Record<string, PipelineActivity[]> = {};
	const pipeline = SEED.map((t, i): PipeRow => {
		const inv = investors[i];
		const id = `sbx-pipe-${i + 1}`;
		const amount = seedAmount(t);
		activity[id] = seedActivity(t, amount);
		return {
			id, raise_id: RAISE_ID,
			investor_id: inv?.id ?? null, custom_name: inv ? null : FALLBACK_INVESTOR_NAMES[i] ?? 'Investor',
			investor_name: inv?.name ?? null, investor_slug: inv?.slug ?? null,
			investor_logo_url: inv?.logo_url ?? null, investor_website: inv?.website ?? null,
			stage: t.stage, contact_name: t.contact, potential_amount: amount,
			last_contact_at: t.lastContact == null ? null : dateOnly(t.lastContact),
			next_step: t.nextStep, next_step_due: t.due == null ? null : dateOnly(t.due), notes: t.notes,
			is_archived: false, added_at: daysFromNow(t.addedDay), updated_at: daysFromNow(t.lastMoveDay),
		};
	});
	return { pipeline, activity };
}

// ─── Workspace state ────────────────────────────────────────────────────────

let sample: Promise<Workspace> | null = null;
/** Built once per page load: concurrent first requests (Home fires several) share it. */
function buildSample(): Promise<Workspace> {
	sample ??= (async () => {
		const sector = await sampleSector();
		const investors = await loadInvestors(sector.id);
		return {
			v: VERSION, raise: sampleRaise(sector), criteria: sampleCriteria(),
			...seedPipeline(investors), marketUpdatedAt: daysFromNow(-1),
		};
	})();
	return sample;
}

/** The saved workspace, or the ready-made Fanloop one on first use (or after a VERSION bump). */
async function workspace(ctx: SandboxCtx): Promise<Workspace> {
	const cur = ctx.state[STATE_KEY] as Workspace | undefined;
	if (cur?.v === VERSION) return cur;
	return commit(ctx, await buildSample());
}

function commit(ctx: SandboxCtx, ws: Workspace): Workspace {
	ctx.state[STATE_KEY] = ws;
	ctx.save();
	return ws;
}

// ─── Raise profile + criteria writes (Settings; mirror raise.repository.ts) ─

const RAISE_MONEY: (keyof RaiseUpsert)[] = ['target_amount', 'committed_amount', 'prior_capital_raised', 'annual_revenue', 'revenue_growth_pct', 'monthly_burn'];
const RAISE_INT: (keyof RaiseUpsert)[] = ['paying_customers', 'runway_months'];
const RAISE_KEYS: (keyof RaiseUpsert)[] = [
	'company_id', 'company_name', 'company_website', 'hq_country', 'hq_city', 'company_description', 'company_category',
	'company_sector_id', 'company_stage', 'revenue_status', 'fundraising_process', 'round_type', 'currency_code',
	'target_close_date', 'valuation', 'structure', 'lead_investor_status', 'last_round_date', 'strongest_traction',
	'pitch_deck_status', 'financial_model_status', 'data_room_status', 'has_target_list', 'status',
	...RAISE_MONEY, ...RAISE_INT,
];

function coerce(k: keyof RaiseUpsert, v: unknown): unknown {
	if (RAISE_MONEY.includes(k)) return money(v);
	if (RAISE_INT.includes(k)) return v == null || v === '' ? null : Math.trunc(Number(v));
	return v ?? null;
}

/** POST/PATCH /api/raise: patch only the provided keys (the sample raise is already set up). */
async function upsertRaise(ctx: SandboxCtx) {
	const ws = await workspace(ctx);
	const body = (ctx.body ?? {}) as RaiseUpsert;
	const patch = Object.fromEntries(RAISE_KEYS.filter((k) => k in body).map((k) => [k, coerce(k, body[k])]));
	const raise: RaiseRow = { ...ws.raise, ...patch, updated_at: daysFromNow(0) };
	return commit(ctx, { ...ws, raise }).raise;
}

const CRITERIA_MONEY: (keyof RaiseCriteria)[] = ['cheque_min', 'cheque_max'];
const CRITERIA_KEYS: (keyof RaiseCriteria)[] = ['investor_types', 'geographies', 'cheque_min', 'cheque_max', 'lead_preference', 'strategic_ok', 'excluded_investor_ids', 'desired_expertise', 'biggest_concern'];

/** PUT semantics, like raise.repository.ts putCriteria: every column is written (absent → null). */
async function putCriteria(ctx: SandboxCtx) {
	const ws = await workspace(ctx);
	const body = (ctx.body ?? {}) as RaiseCriteria;
	const next = Object.fromEntries(CRITERIA_KEYS.map((k) => [k, CRITERIA_MONEY.includes(k) ? money(body[k]) : body[k] ?? null]));
	const criteria = { ...next, raise_id: RAISE_ID } as CriteriaRow;
	return commit(ctx, { ...ws, criteria }).criteria;
}

// ─── Home (mirror raise-home.service.ts) ────────────────────────────────────

function pipelineStats(rows: PipeRow[]) {
	const live = rows.filter((r) => !r.is_archived);
	const today = dateOnly(0);
	const count = (f: (r: PipeRow) => boolean) => live.filter(f).length;
	return {
		total: live.length,
		contacted_plus: count((r) => r.stage !== 'target'),
		in_conversation_plus: count((r) => r.stage !== 'target' && r.stage !== 'contacted'),
		due_diligence_plus: count((r) => ['due_diligence', 'term_sheet', 'committed'].includes(r.stage)),
		term_or_committed: count((r) => r.stage === 'term_sheet' || r.stage === 'committed'),
		active_conversations: count((r) => r.stage === 'in_conversation'),
		overdue: count((r) => !!r.next_step_due && r.next_step_due < today),
		no_next_step: count((r) => !['target', 'passed', 'closed'].includes(r.stage) && !r.next_step),
		committed_no_amount: count((r) => r.stage === 'committed' && r.potential_amount == null),
	};
}

function deriveStage(raise: RaiseRow, s: ReturnType<typeof pipelineStats>): string {
	if (raise.status === 'funded' || raise.status === 'paused' || raise.status === 'closed') return raise.status;
	if (s.term_or_committed > 0) return 'closing';
	if (s.due_diligence_plus > 0) return 'due_diligence';
	if (s.in_conversation_plus > 0) return 'in_conversations';
	if (s.contacted_plus > 0) return 'outreach';
	return 'preparing';
}

function momentum(ws: Workspace): string {
	const since = daysFromNow(-7);
	const events = Object.values(ws.activity).flat().filter((a) => a.occurred_at >= since).length;
	return events >= 9 ? 'Exceptional' : events >= 4 ? 'Strong' : events >= 1 ? 'Steady' : 'Weak';
}

/** The core's sample deck (core-routes.ts) is always listed and analysed (score 71). */
const DECK = { score: 71, status: 'done' } as const;

const strategySteps = (total: number) => [
	{ label: 'Raise profile completed', done: true },
	{ label: 'Pitch deck analysed', done: true },
	{ label: 'Five investors added', done: total >= 5 },
];

type AttentionCard = { id: string; title: string; why: string; cta_label: string; cta_href: string; count?: number };

/** Attention cards in the server's priority order; Home shows the first three (overdue leads for the sample). */
function attentionFor(raise: RaiseRow, s: ReturnType<typeof pipelineStats>): AttentionCard[] {
	const out: AttentionCard[] = [];
	if (s.overdue > 0) out.push({ id: 'overdue', title: `Follow up with ${s.overdue} overdue investor${s.overdue > 1 ? 's' : ''}`, why: 'These conversations have a next step that is past due.', cta_label: 'Review overdue', cta_href: '/pipeline?filter=overdue', count: s.overdue });
	if (s.total < 5) out.push({ id: 'add-first', title: 'Add your first investors to the pipeline', why: 'Build a target list of at least five relevant investors to get moving.', cta_label: 'Find investors', cta_href: '/investors' });
	if (s.no_next_step > 0) out.push({ id: 'next-steps', title: 'Add next steps to your active investors', why: 'Some active conversations have no next action — they will stall.', cta_label: 'Review investors', cta_href: '/pipeline?filter=no_next_step', count: s.no_next_step });
	if (s.committed_no_amount > 0) out.push({ id: 'amounts', title: 'Record committed investment amounts', why: 'A committed investor has no amount entered yet.', cta_label: 'Add amounts', cta_href: '/pipeline?filter=committed', count: s.committed_no_amount });
	if (raise.status === 'active' && !raise.dealflow_opt_in && raise.dealflow_status == null) {
		out.push({ id: 'dealflow', title: 'Share your round with the Investor Circle', why: 'Opt in and STX verifies your round, then shows it to vetted investors in Atlas Scout. Off by default, withdrawable any time.', cta_label: 'See how it works', cta_href: '/settings' });
	}
	if (s.total >= 5) out.push({ id: 'strategy', title: 'Book your strategy session', why: 'You have unlocked a session with STX leadership to pressure-test the raise.', cta_label: 'Book call', cta_href: '/strategy' });
	return out;
}

function buildHome(ws: Workspace) {
	const { raise } = ws;
	const s = pipelineStats(ws.pipeline);
	return {
		needs_setup: false,
		raise: {
			round_type: raise.round_type, target_amount: raise.target_amount, committed_amount: raise.committed_amount,
			currency_code: raise.currency_code, target_close_date: raise.target_close_date, status: raise.status,
			stage: deriveStage(raise, s), momentum: momentum(ws),
		},
		snapshot: { deck: DECK, pipeline_count: s.total, active_conversations: s.active_conversations },
		attention: attentionFor(raise, s).slice(0, 3),
		strategy: {
			status: s.total >= 5 ? 'available' : 'locked', scheduled_at: null, next_eligible_at: null,
			steps: strategySteps(s.total),
		},
	};
}

// ─── Pipeline ───────────────────────────────────────────────────────────────

function listPipeline(ws: Workspace, url: URL): PipeRow[] {
	const filter = url.searchParams.get('filter');
	const stage = url.searchParams.get('stage');
	const today = dateOnly(0);
	return ws.pipeline
		.filter((r) => (filter === 'archived' ? r.is_archived : !r.is_archived))
		.filter((r) => !stage || r.stage === stage)
		.filter((r) => filter !== 'overdue' || (!!r.next_step_due && r.next_step_due < today))
		.filter((r) => filter !== 'no_next_step' || (!['target', 'passed', 'closed'].includes(r.stage) && !r.next_step))
		.filter((r) => filter !== 'committed' || r.stage === 'committed')
		.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

async function investorRef(raise: RaiseRow, id: string): Promise<InvestorRef | null> {
	const known = (await loadInvestors(raise.company_sector_id)).find((i) => i.id === id);
	if (known) return known;
	const fetched = await getJson<InvestorRef>(`/api/investors/${encodeURIComponent(id)}`);
	return fetched?.id ? slimInvestor(fetched) : null;
}

/**
 * `GET /api/investors/:id` has no local route — list + profile used to share
 * the same public /api/investors passthrough, which a logged-in sandbox user
 * could still reach for real. An anonymous preview visitor can't reach it at
 * all (lib/sandbox/interceptor.ts), so without this the profile page (step 5,
 * "Check the fit, then add") never loads. Fields types/api.ts's `Investor`
 * doesn't carry sample values for (socials, employee count, exits…) are null —
 * nothing on the page reads them as anything but optional.
 */
function expandInvestor(i: InvestorRef): Record<string, unknown> {
	return {
		id: i.id, name: i.name, website: i.website, slug: i.slug, description: i.description,
		status: 'active', category: i.category, year_launched: null, location_id: null, social_profile_id: null,
		is_verified: true, actively_investing: true, keywords: null, num_employees: null, logo_url: i.logo_url,
		total_funding: null, latest_funding: null, latest_funding_amount: null, last_raised_at: null,
		annual_revenue: null, num_exits: null, num_investments: i.deals_count, analyst_notes: null,
		added_by_profile_id: null, created_at: daysFromNow(-900), updated_at: daysFromNow(-30),
		deals_count: i.deals_count, hq_city: null, hq_country: i.hq_country,
		hq_region: null, twitter_url: null, instagram_url: null, facebook_url: null, linkedin_url: null,
		youtube_url: null, contact_email: null,
	};
}

async function addToPipeline(ctx: SandboxCtx) {
	const ws = await workspace(ctx);
	const body = (ctx.body ?? {}) as PipelineAdd;
	if (!body.investor_id && !body.custom_name?.trim()) return badRequest('investor_id or custom_name required');
	const dup = body.investor_id ? ws.pipeline.find((r) => r.investor_id === body.investor_id) : undefined;
	if (dup) return dup;
	const inv = body.investor_id ? await investorRef(ws.raise, body.investor_id) : null;
	const now = daysFromNow(0);
	const stage = body.stage ?? 'target';
	const row: PipeRow = {
		id: `sbx-pipe-${Date.now().toString(36)}`, raise_id: RAISE_ID,
		investor_id: body.investor_id ?? null, custom_name: body.custom_name?.trim() || null,
		investor_name: inv?.name ?? (body.investor_id ? 'Investor' : null), investor_slug: inv?.slug ?? null,
		investor_logo_url: inv?.logo_url ?? null, investor_website: inv?.website ?? null,
		stage, contact_name: body.contact_name ?? null, potential_amount: money(body.potential_amount),
		last_contact_at: null, next_step: body.next_step ?? null, next_step_due: body.next_step_due ?? null,
		notes: body.notes ?? null, is_archived: false, added_at: now, updated_at: now,
	};
	const activity = { ...ws.activity, [row.id]: [{ type: 'created', payload: { stage }, occurred_at: now }] };
	commit(ctx, { ...ws, pipeline: [row, ...ws.pipeline], activity });
	return row;
}

const UPDATABLE: (keyof PipelineUpdate)[] = ['stage', 'contact_name', 'potential_amount', 'last_contact_at', 'next_step', 'next_step_due', 'notes', 'is_archived'];

async function updatePipeline(ctx: SandboxCtx) {
	const ws = await workspace(ctx);
	const before = ws.pipeline.find((r) => r.id === ctx.params.id);
	if (!before) return notFound('pipeline entry not found');
	const body = (ctx.body ?? {}) as PipelineUpdate;
	const provided = UPDATABLE.filter((k) => k in body);
	if (provided.length === 0) return before;

	const patch = Object.fromEntries(provided.map((k) => [k, k === 'potential_amount' ? money(body[k]) : body[k] ?? null]));
	const now = daysFromNow(0);
	const row: PipeRow = { ...before, ...patch, is_archived: body.is_archived ?? before.is_archived, stage: body.stage ?? before.stage, updated_at: now };
	const events: PipelineActivity[] = [];
	if (body.stage && body.stage !== before.stage) events.push({ type: 'stage_change', payload: { from: before.stage, to: body.stage }, occurred_at: now });
	if (row.potential_amount != null && before.potential_amount == null) events.push({ type: 'commitment', payload: { amount: Number(row.potential_amount) }, occurred_at: now });

	commit(ctx, {
		...ws,
		pipeline: ws.pipeline.map((r) => (r.id === row.id ? row : r)),
		activity: { ...ws.activity, [row.id]: [...events, ...(ws.activity[row.id] ?? [])] },
	});
	return row;
}

// ─── Market, matches, benchmarks ────────────────────────────────────────────

const fmtUsd = (n: number) => (!n ? '—' : n >= 1e9 ? `$${(n / 1e9).toFixed(1)}b raised` : n >= 1e6 ? `$${(n / 1e6).toFixed(0)}m raised` : `$${(n / 1e3).toFixed(0)}k raised`);

/** Root → … → leaf names: the raise's own `company_category`, else the taxonomy. */
function sectorPath(raise: RaiseRow): string[] {
	return Array.isArray(raise.company_category) && raise.company_category.length ? raise.company_category : [...SAMPLE.sector];
}

/** raise-market.service.ts:31 — no sector → `{ unavailable, reason: 'no_sector' }` (only after a Settings edit clears it). */
async function buildMarket(ctx: SandboxCtx, force: boolean) {
	const ws = await workspace(ctx);
	const { raise } = ws;
	if (!raise.company_sector_id) return { unavailable: true, reason: 'no_sector' };

	const competitors = await loadCompetitors(raise.company_sector_id);
	const path = sectorPath(raise);
	const updatedAt = force ? commit(ctx, { ...ws, marketUpdatedAt: daysFromNow(0) }).marketUpdatedAt : ws.marketUpdatedAt;
	const sector = path.at(-1) ?? SAMPLE.sector[1];
	const home = raise.hq_country || 'your home market';
	const topFunding = competitors.list.reduce((sum, c) => sum + c.total_funding_usd, 0);
	const tracked = Math.max(competitors.tracked, competitors.list.length);
	const funded = Math.max(competitors.list.filter((c) => c.total_funding_usd > 0).length, Math.round(tracked * 0.41));
	return {
		raise_id: RAISE_ID,
		tam: '6800000000', sam: '540000000', cagr: '11.8',
		classification: path.join(' → '),
		insight_md: `Clubs and leagues in ${sector} are moving budget from one-off campaigns to recurring software tied to their own fan data. Funding in the category sits with a few later-stage players, which leaves room for a seed-stage company that proves ROI in ${home} before expanding.`,
		methodology: {
			approach: `TAM sized bottom-up from the number of potential customers for ${sector} products across Europe × average annual contract value; SAM narrowed to ${home} and neighbouring markets reachable within 24 months. Funding, competitor counts and CAGR come from SportsTechX data.`,
			grounded: { sector, total_funding_usd: Math.round(topFunding * 1.6), funded_companies: funded, companies_tracked: tracked, deals: Math.round(funded * 1.7), funding_cagr_pct: 14.2 },
			assumptions: [
				'Roughly 2,400 professional and semi-professional clubs, leagues and rights holders in Europe',
				'Average annual software spend of €280k per top-tier customer',
				`SAM limited to customers reachable from ${home} within 24 months`,
				'Digital budgets grow in line with media-rights revenue',
			],
			sources: ['SportsTechX proprietary deals & companies dataset', 'UEFA European Club Finance and Investment Landscape'],
		},
		competitors: competitors.list.map((c) => ({ id: c.id, name: c.name, website: c.website, custom_logo_url: c.custom_logo_url, hq_country: c.hq_country, funding: fmtUsd(c.total_funding_usd) })),
		updated_at: updatedAt,
	};
}

const EUROPE = /germany|austria|switzerland|uk|united kingdom|france|spain|italy|netherlands|belgium|sweden|denmark|norway|finland|ireland|portugal|luxembourg|poland/i;
/** investor-matching.service.ts:95/315 — no sector → no company to match. */
const NO_MATCH = { company: null, reason: 'no_company_claim', results: [] };

/** Matches, with investors not yet on the watchlist first (so the top match can be added). */
async function buildMatches(ws: Workspace, url: URL) {
	const { raise } = ws;
	if (!raise.company_sector_id) return NO_MATCH;
	const limit = Math.min(Number(url.searchParams.get('limit')) || 12, MATCH_CAP);
	const excluded = new Set(ws.criteria.excluded_investor_ids ?? []);
	const inPipeline = new Set(ws.pipeline.map((r) => r.investor_id));
	const pool = (await loadInvestors(raise.company_sector_id)).filter((i) => !excluded.has(i.id));
	const ordered = [...pool.filter((i) => !inPipeline.has(i.id)), ...pool.filter((i) => inPipeline.has(i.id))];
	const country = String(raise.hq_country ?? '').trim().toLowerCase();
	const results = ordered.slice(0, limit).map((inv, i) => {
		const deals = Math.max(1, Math.min(6, Math.round((inv.deals_count ?? 4) / 8)));
		const sameCountry = !!country && inv.hq_country?.trim().toLowerCase() === country;
		const european = !!inv.hq_country && EUROPE.test(inv.hq_country);
		const reasons = [
			i % 3 === 2 ? 'Thesis targets your broader sector' : 'Thesis targets your sector',
			`${deals} prior deal${deals === 1 ? '' : 's'} in your sector`,
			...(sameCountry ? [`Targets your country (${raise.hq_country})`] : european ? ['Invests in your target geographies'] : []),
			...(i % 2 === 0 && raise.round_type ? ['Backs your funding stage'] : []),
			'Actively investing',
		];
		return {
			id: inv.id, name: inv.name, slug: inv.slug, website: inv.website, logo_url: inv.logo_url,
			hq_country: inv.hq_country, category: inv.category, description: inv.description,
			score: 84 - i * 4, match_reasons: reasons,
		};
	});
	return { company: { id: raise.company_id, name: raise.company_name ?? SAMPLE.company }, results };
}

/** benchmarks.service.ts:45 — no company → empty result. */
const NO_BENCHMARKS = { company: null, reason: 'no_company_claim', cohort: { sector: null, n: 0 }, metrics: [], peers: [] };

async function buildBenchmarks(ws: Workspace) {
	const { raise } = ws;
	if (!raise.company_sector_id) return NO_BENCHMARKS;
	const competitors = await loadCompetitors(raise.company_sector_id);
	const raised = Number(raise.prior_capital_raised) || 0;
	const peers = competitors.list.slice(0, 6).map((c, i) => ({
		id: c.id, name: c.name, slug: c.slug, total_raised: c.total_funding_usd,
		last_round: dateOnly(-120 - i * 75), country: c.hq_country,
	}));
	return {
		company: { id: raise.company_id ?? 'sbx-company', name: raise.company_name ?? SAMPLE.company },
		cohort: { sector: sectorPath(raise).at(-1) ?? null, n: Math.max(competitors.tracked, peers.length) },
		metrics: [
			{ key: 'total_raised', label: 'Total raised', unit: 'usd', value: raised, median: 1_250_000, percentile: raised >= 1_250_000 ? 62 : 38 },
			{ key: 'rounds', label: 'Funding rounds', unit: 'count', value: raised > 0 ? 1 : 0, median: 2, percentile: raised > 0 ? 41 : 12 },
			{ key: 'latest_round', label: 'Latest round size', unit: 'usd', value: raised || null, median: 900_000, percentile: raised ? (raised >= 900_000 ? 58 : 44) : null },
			{ key: 'age', label: 'Company age', unit: 'years', value: null, median: 6, percentile: null },
		],
		peers,
	};
}

// ─── Routes ─────────────────────────────────────────────────────────────────

const DEALFLOW_MSG = 'Sharing your round with the Investor Circle is part of Atlas Raise. In the sandbox you can see how it works.';

/** Run a handler against the (lazily built) workspace. */
const withWs = <T>(fn: (ws: Workspace, ctx: SandboxCtx) => T) => async (ctx: SandboxCtx) => fn(await workspace(ctx), ctx);

export const raiseSandboxRoutes: SandboxRoute[] = [
	// Investor profile (step 5, "Check the fit, then add"). See expandInvestor's doc.
	['GET', '/api/investors/:id', withWs(async (ws, ctx) => {
		const inv = await investorRef(ws.raise, ctx.params.id);
		return inv ? expandInvestor(inv) : notFound('investor not found');
	})],
	['GET', '/api/investors/:id/thesis', () => ({
		thesis: { amount_min_usd: '250000', amount_max_usd: '2000000' },
		round_types: [{ name: 'Seed' }, { name: 'Series A' }],
		geo: [{ scope_type: 'continent', scope_value: 'Europe' }],
	})],

	// Raise profile + criteria (Settings, Investors → criteria summary).
	['GET', '/api/raise', withWs((ws) => ({ raise: ws.raise, criteria: ws.criteria }))],
	['POST', '/api/raise', upsertRaise],
	['PATCH', '/api/raise', upsertRaise],
	['GET', '/api/raise/home', withWs(buildHome)],
	['GET', '/api/raise/criteria', withWs((ws) => ws.criteria)],
	['PUT', '/api/raise/criteria', putCriteria],
	['POST', '/api/raise/strategy/book', () => gated('raise', 'Strategy sessions with SportsTechX leadership are part of Atlas Raise. Upgrade to book your quarterly call.')],

	// Market → My market.
	['GET', '/api/raise/market', (ctx) => buildMarket(ctx, ctx.url.searchParams.get('force') === '1')],

	// Watchlist (pipeline): stateful, so moves / adds / edits persist.
	['GET', '/api/raise/pipeline', withWs((ws, ctx) => ({ data: listPipeline(ws, ctx.url) }))],
	['POST', '/api/raise/pipeline', addToPipeline],
	['PATCH', '/api/raise/pipeline/:id', updatePipeline],
	['GET', '/api/raise/pipeline/:id/activity', withWs((ws, ctx) => (
		ws.pipeline.some((r) => r.id === ctx.params.id) ? { data: ws.activity[ctx.params.id] ?? [] } : notFound('pipeline entry not found')
	))],

	// Deal Flow opt-in (Settings): readable, writes are an upgrade.
	['GET', '/api/raise/dealflow/opt-in', withWs(({ raise }) => (
		{ opted_in: raise.dealflow_opt_in, status: raise.dealflow_status, review_notes: null, submitted_at: null, has_raise: true }
	))],
	['POST', '/api/raise/dealflow/opt-in', () => gated('raise', DEALFLOW_MSG)],
	['DELETE', '/api/raise/dealflow/opt-in', () => gated('raise', DEALFLOW_MSG)],

	// Founder recommendations (raise-gated on the server).
	['GET', '/api/recommendations/investors', withWs((ws, ctx) => buildMatches(ws, ctx.url))],
	['GET', '/api/recommendations/benchmarks', withWs(buildBenchmarks)],
];
