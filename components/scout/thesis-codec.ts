/**
 * Translation between the thesis the form edits and the thesis the server stores.
 *
 * The form is label-shaped ("Seed", "Europe", "€250k") because that is what the
 * chip controls render. The API is id-shaped: `round_type_ids` and `sector_ids`
 * are taxonomy UUIDs, geography is `{scope_type, scope_value}` pairs, cheque
 * sizes are plain numbers and `invest_style` / `investor_type` are enums.
 *
 * Keeping the codec here is what lets `thesis-form.tsx`, `thesis-fields.tsx`,
 * `thesis-settings.tsx` and `onboarding.tsx` stay exactly as they are — the
 * alternative was threading ids through every chip set.
 *
 * Taxonomy matching is by **name**, case-insensitively. That is the only join
 * available: the prototype's option lists were written as display strings and
 * never carried ids. A label with no matching row is dropped rather than sent,
 * because the server would drop it anyway (it filters ids through the reference
 * table) and a silent 400 would lose the user's whole save.
 */
import type { Thesis } from './sample-data';

export interface TaxonomyRef { id: string; name: string | null }
export interface GeoScope { scope_type: string; scope_value: string }

export interface ServerThesis {
	sectors: TaxonomyRef[];
	sports: TaxonomyRef[];
	round_types: TaxonomyRef[];
	geo: GeoScope[];
	business_models: string[];
	cheque_min: number | null;
	cheque_max: number | null;
	traction_floor: string | null;
	invest_style: string | null;
	exclusions: string | null;
}

export interface ScoutProfile {
	full_name: string | null;
	role_title: string | null;
	linkedin_url: string | null;
	fund_name: string | null;
	investor_type: string | null;
	fund_website: string | null;
	aum: string | null;
	setup_completed_at: string | null;
}

/** `investor_category` in the database, against the labels the form offers. */
const INVESTOR_TYPE: Record<string, string> = {
	'Venture capital': 'venture_capital',
	'Growth / PE': 'private_equity',
	'Family office': 'family_investment_office',
	'Angel investor': 'angel',
	'Corporate VC': 'other',
	'Accelerator / studio': 'other',
};
/** `business_model` in the database. The attributes picker also offers revenue
 *  models, technologies, customers and themes, none of which the schema has a
 *  column for — those stay local. See `use-thesis.ts`. */
const BUSINESS_MODEL: Record<string, string> = {
	B2B: 'b2b', B2C: 'b2c', B2B2C: 'b2b2c', D2C: 'd2c', B2G: 'b2g',
};

const CONTINENTS = new Set(['Europe', 'North America', 'South America', 'Asia', 'Africa', 'Oceania', 'Global']);
/** Everything in the picker's "Regions" group — multi-country blocs. */
const REGIONS = new Set([
	'USA & Canada', 'DACH', 'APAC', 'UK & Ireland', 'Nordics', 'France & Benelux',
	'Southern Europe', 'CEE', 'Baltics', 'Latin America', 'Middle East', 'MENA',
	'Sub-Saharan Africa', 'Southeast Asia',
]);

/** Which granularity a geography label is. Anything else is a country. */
export const scopeTypeOf = (label: string): GeoScope['scope_type'] =>
	CONTINENTS.has(label) ? 'continent' : REGIONS.has(label) ? 'region' : 'country';

const flip = (m: Record<string, string>) =>
	Object.fromEntries(Object.entries(m).map(([k, v]) => [v, k]));

/** "€250k" / "2m" / "250,000" → 250000. Null when there is no number in it. */
export function parseMoney(s: string): number | null {
	const m = /([\d.,]+)\s*([km]?)/i.exec(s ?? '');
	if (!m) return null;
	const n = Number(m[1].replace(/,/g, ''));
	if (!Number.isFinite(n)) return null;
	const mult = m[2].toLowerCase() === 'm' ? 1e6 : m[2].toLowerCase() === 'k' ? 1e3 : 1;
	return n * mult;
}

/** 250000 → "€250k". The inverse of `parseMoney` for the values it produces. */
export function formatMoney(n: number | null): string {
	if (n == null) return '';
	if (n >= 1e6) return `€${+(n / 1e6).toFixed(2)}m`;
	if (n >= 1e3) return `€${+(n / 1e3).toFixed(0)}k`;
	return `€${n}`;
}

/** Case-insensitive name → id, for a reference list. */
export const indexByName = (rows: TaxonomyRef[]) =>
	new Map(rows.filter((r) => r.name).map((r) => [r.name!.toLowerCase(), r.id]));

const names = (rows: TaxonomyRef[]) => rows.map((r) => r.name).filter((n): n is string => !!n);

/** Server → form. */
export function toForm(
	t: ServerThesis | undefined,
	p: ScoutProfile | null | undefined,
	fallback: Thesis,
): Thesis {
	const bm = flip(BUSINESS_MODEL);
	return {
		...fallback,
		name: p?.full_name ?? fallback.name,
		role: p?.role_title ?? fallback.role,
		linkedin: p?.linkedin_url ?? '',
		fundName: p?.fund_name ?? '',
		investorType: p?.investor_type ? (flip(INVESTOR_TYPE)[p.investor_type] ?? '') : '',
		website: p?.fund_website ?? '',
		aum: p?.aum ?? '',
		sectors: names(t?.sectors ?? []),
		stages: names(t?.round_types ?? []),
		regions: (t?.geo ?? []).map((g) => g.scope_value),
		chequeMin: formatMoney(t?.cheque_min ?? null),
		chequeMax: formatMoney(t?.cheque_max ?? null),
		traction: t?.traction_floor ?? '',
		invStyle: (t?.invest_style
			? ((t.invest_style[0].toUpperCase() + t.invest_style.slice(1)) as Thesis['invStyle'])
			: fallback.invStyle),
		// Business models come back as enum values; sports as taxonomy names.
		// Both live in one "include" chip list in the form.
		include: [...(t?.business_models ?? []).map((v) => bm[v] ?? v), ...names(t?.sports ?? [])],
		exclude: t?.exclusions ? t.exclusions.split(',').map((s) => s.trim()).filter(Boolean) : [],
	};
}

/** Form → `PUT /api/scout/thesis`. Unmatched labels are dropped, not sent. */
export function toThesisDto(t: Thesis, idx: { sectors: Map<string, string>; rounds: Map<string, string>; sports: Map<string, string> }) {
	const ids = (labels: string[], m: Map<string, string>) =>
		labels.map((l) => m.get(l.toLowerCase())).filter((v): v is string => !!v);
	return {
		sector_ids: ids(t.sectors, idx.sectors),
		round_type_ids: ids(t.stages, idx.rounds),
		sport_ids: ids(t.include, idx.sports),
		geo: t.regions.map((r) => ({ scope_type: scopeTypeOf(r), scope_value: r })),
		business_models: t.include.map((i) => BUSINESS_MODEL[i]).filter(Boolean),
		cheque_min: parseMoney(t.chequeMin),
		cheque_max: parseMoney(t.chequeMax),
		traction_floor: t.traction || null,
		invest_style: t.invStyle.toLowerCase(),
		exclusions: t.exclude.length ? t.exclude.join(', ') : null,
	};
}

/** Form → `PATCH /api/scout` (wizard steps 1-2). */
export function toProfileDto(t: Thesis) {
	return {
		full_name: t.name || null,
		role_title: t.role || null,
		linkedin_url: t.linkedin?.trim() ? t.linkedin.trim() : null,
		fund_name: t.fundName || null,
		investor_type: INVESTOR_TYPE[t.investorType] ?? null,
		// The schema demands a URL; the form collects "northline.vc".
		fund_website: t.website?.trim() ? absolute(t.website.trim()) : null,
		aum: t.aum || null,
	};
}

const absolute = (s: string) => (/^https?:\/\//i.test(s) ? s : `https://${s}`);
