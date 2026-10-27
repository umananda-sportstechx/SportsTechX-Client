import type { ClaimForm } from '../claim/claim-form';
import { CONTINENTS, FUNDING_STAGES, RAISE_AMOUNTS, THESIS_SECTORS } from '../claim/claim-form';
import type { Thesis } from './sample-data';
import { parseMoney } from './thesis-codec';

/**
 * The investor claim and the Scout thesis ask for most of the same things
 * (fund, location, type, AUM, cheque, stages, continents, sectors). An investor
 * who verified first used to retype all of it in the thesis wizard, and one who
 * filled the thesis first retyped it in the claim. These map one onto the other
 * so whichever is filled second opens pre-filled. Pure — `claim-thesis.check.ts`.
 *
 * Only labels both sides offer are carried; anything else is left blank, never
 * guessed.
 */

/** Claim category ↔ thesis investor type (claim-only kinds have no thesis chip). */
const CATEGORY_TO_TYPE: Record<string, string> = {
	'Venture Capital': 'Venture capital',
	'Private Equity': 'Growth / PE',
	'Corporate VC': 'Corporate VC',
	'Angel / Syndicate': 'Angel investor',
	'Family Office': 'Family office',
	Accelerator: 'Accelerator / studio',
};
/** Claim funding stage ↔ thesis stage (a `funding_round_types` name). */
const STAGE_TO_ROUND: Record<string, string> = {
	'Pre-Seed': 'Pre Seed Round',
	Seed: 'Seed Round',
	'Series A': 'Series A',
	'Series B': 'Series B',
	'Series C+': 'Late Stage Venture',
};
const flip = (m: Record<string, string>) => Object.fromEntries(Object.entries(m).map(([k, v]) => [v, k]));
const TYPE_TO_CATEGORY = flip(CATEGORY_TO_TYPE);
const ROUND_TO_STAGE = flip(STAGE_TO_ROUND);

const digits = (s: string | undefined) => { const n = parseMoney(s ?? ''); return n == null ? '' : String(n); };
const bucket = (s: string) => { const n = parseMoney(s); return RAISE_AMOUNTS.find((l) => parseMoney(l) === n) ?? ''; };

/** Claim answers → thesis fields. */
export function thesisFromClaim(c: Partial<ClaimForm>): Partial<Thesis> {
	return {
		fundName: c.name ?? '',
		website: c.website ?? '',
		country: c.coCountry ?? '',
		city: c.coCity ?? '',
		investorType: CATEGORY_TO_TYPE[c.invCategory ?? ''] ?? '',
		aum: digits(c.aum),
		chequeMin: digits(c.minInv),
		chequeMax: digits(c.maxInv),
		stages: (c.fundingStages ?? []).map((s) => STAGE_TO_ROUND[s]).filter(Boolean),
		regions: [...(c.continents ?? [])],
		sectors: [...(c.thesisSectors ?? [])],
	};
}

/** Thesis fields → claim prefill, for "Verify ownership" after the thesis is filled. */
export function claimFromThesis(t: Thesis): Partial<ClaimForm> {
	const [first = '', ...rest] = t.name.trim().split(/\s+/);
	const continents = t.regions.filter((r) => CONTINENTS.includes(r));
	const sectors = t.sectors.filter((s) => THESIS_SECTORS.includes(s));
	const stages = t.stages.map((s) => ROUND_TO_STAGE[s]).filter((s): s is string => !!s && FUNDING_STAGES.includes(s));
	const minInv = bucket(t.chequeMin);
	const maxInv = bucket(t.chequeMax);
	const p: Partial<ClaimForm> = {
		first, last: rest.join(' '), email: t.email, position: t.role, linkedin: t.linkedin,
		name: t.fundName, website: t.website.replace(/^https?:\/\//, ''),
		// The claimant's own location defaults to the fund's — almost always the
		// same for an investor, and editable in the modal if not.
		city: t.city, country: t.country, coCity: t.city, coCountry: t.country,
		invCategory: TYPE_TO_CATEGORY[t.investorType] ?? '',
		aum: digits(t.aum),
		continents, thesisSectors: sectors, fundingStages: stages, minInv, maxInv,
		buildThesis: continents.length + sectors.length + stages.length > 0 || !!minInv || !!maxInv,
	};
	// Drop blanks so they never overwrite what the claim modal seeds from the entity.
	return Object.fromEntries(Object.entries(p).filter(([, v]) => (Array.isArray(v) ? v.length : v !== '' && v !== false))) as Partial<ClaimForm>;
}

/** Overlay `p` onto `t`, filling only fields the user hasn't set. */
export function fillEmpty(t: Thesis, p: Partial<Thesis>): Thesis {
	const out = { ...t };
	for (const [k, v] of Object.entries(p) as [keyof Thesis, Thesis[keyof Thesis]][]) {
		const cur = out[k];
		const empty = Array.isArray(cur) ? cur.length === 0 : !cur;
		const has = Array.isArray(v) ? v.length > 0 : !!v;
		if (empty && has) (out as Record<keyof Thesis, unknown>)[k] = v;
	}
	return out;
}
