/**
 * The deal-submission form's state ⇄ the `scout_deals` row.
 *
 * This exists because the wizard now has to decode as well as encode. A deal
 * comes back `changes_requested` with a note from the review team, and until
 * the row can be loaded back into the form there is nothing the submitter can
 * do about it — the note was readable and the deal was not editable.
 *
 * Encoding was always lossy in one direction on purpose, and the asymmetry is
 * where the bugs live:
 *   - The form holds **design labels** ("Priced Equity", "Circle members") and
 *     the columns hold enums (`priced_equity`, `immediate`), so every map needs
 *     its inverse.
 *   - Amounts are typed as text, stored as `numeric`, and come back from pg as
 *     strings like `"1500000.00"` — which must not be put straight into a
 *     number input.
 *   - `valuation` is a text column on purpose ("€8m pre-money" is not a
 *     number), so it is the one amount that round-trips verbatim.
 */

export interface Draft {
	company: string; website: string; hq: string; sectorId: string; desc: string;
	/** Set when the company was picked from the Atlas directory; empty for a new
	 *  company (which the server routes into the startups-to-add pipeline). */
	companyId: string;
	founderName: string; founderEmail: string; founderPhone: string;
	round: string; instrument: string; currency: string;
	target: string; committed: string; close: string;
	// Structured valuation: amount (in `currency`) + basis, or "undisclosed".
	valuationAmount: string; valuationBasis: string; valuationUndisclosed: boolean;
	leadStatus: string; lead: string;
	notes: string; relation: string; myCommit: string; access: string; consent: boolean;
	/** `bucket/key`, set once the file is in storage. Not a URL — the column rejects those. */
	deckPath: string; onePagerPath: string;
}

export const BLANK: Draft = {
	company: '', website: '', hq: '', sectorId: '', desc: '', companyId: '',
	founderName: '', founderEmail: '', founderPhone: '',
	round: 'Seed', instrument: 'Priced Equity', currency: 'EUR',
	target: '', committed: '', close: '',
	valuationAmount: '', valuationBasis: 'pre_money', valuationUndisclosed: false,
	leadStatus: 'Lead confirmed', lead: '',
	notes: '', relation: 'Investing in this round', myCommit: '', access: 'Only after intro request', consent: false,
	deckPath: '', onePagerPath: '',
};

// Design labels → the API's enums.
export const INSTRUMENT: Record<string, string> = {
	'Priced Equity': 'priced_equity', SAFE: 'safe', 'Convertible Note': 'convertible_note',
	ASA: 'asa', Other: 'other',
};
export const LEAD: Record<string, string> = {
	'Lead confirmed': 'confirmed', 'Seeking lead': 'seeking', 'No lead required': 'not_required',
};
export const RELATION: Record<string, string> = {
	'Investing in this round': 'investing_this_round', 'Existing investor': 'existing_investor',
	'Advisor / board': 'advisor_or_board', 'Referral only': 'referral',
};
export const ACCESS: Record<string, string> = {
	'Circle members': 'immediate', 'Only after intro request': 'on_request',
};

/** A typed amount → a number the API will accept, or null. */
export const num = (v: string): number | null => {
	const n = Number(String(v).replace(/[^0-9.]/g, ''));
	return Number.isFinite(n) && n > 0 ? n : null;
};

/** `"1500000.00"` → `"1500000"`. A number input rejects trailing-zero decimals visually. */
const amount = (v: string | number | null | undefined): string => {
	if (v === null || v === undefined || v === '') return '';
	const n = Number(v);
	return Number.isFinite(n) && n > 0 ? String(n) : '';
};

const str = (v: unknown): string => (typeof v === 'string' ? v : v === null || v === undefined ? '' : String(v));

/** The enum a label maps to, read backwards. Falls back to the blank default. */
function labelFor(map: Record<string, string>, value: unknown, fallback: string): string {
	const found = Object.entries(map).find(([, v]) => v === value);
	return found ? found[0] : fallback;
}

const VALUATION_BASIS_LABEL: Record<string, string> = { pre_money: 'pre-money', post_money: 'post-money', cap: 'cap' };

/** Human-readable valuation for display/back-compat (the `valuation` text column). */
export function fmtValuation(d: Draft): string {
	if (d.valuationUndisclosed) return 'Undisclosed';
	const n = num(d.valuationAmount);
	if (!n) return '';
	const sym = d.currency === 'USD' ? '$' : '€';
	const basis = VALUATION_BASIS_LABEL[d.valuationBasis] ?? '';
	return `${sym}${n.toLocaleString()}${basis ? ` ${basis}` : ''}`;
}

/** The submission body for POST /scout/dealflow and PATCH /scout/dealflow/:id. */
export function toPayload(d: Draft): Record<string, unknown> {
	return {
		company_id: d.companyId || null,
		company_name: d.company.trim(),
		company_website: d.website.trim() || null,
		company_hq: d.hq.trim() || null,
		company_description: d.desc.trim(),
		sector_id: d.sectorId || null,
		founder_contact_name: d.founderName.trim() || null,
		founder_contact_email: d.founderEmail.trim() || null,
		founder_contact_phone: d.founderPhone.trim() || null,
		round_type: d.round,
		instrument: INSTRUMENT[d.instrument] ?? 'other',
		currency_code: d.currency,
		target_amount: num(d.target),
		committed_amount: num(d.committed),
		valuation: fmtValuation(d) || null,
		valuation_amount: d.valuationUndisclosed ? null : num(d.valuationAmount),
		valuation_basis: d.valuationUndisclosed ? null : (d.valuationBasis || null),
		valuation_undisclosed: d.valuationUndisclosed,
		target_close_date: d.close || null,
		lead_status: LEAD[d.leadStatus] ?? null,
		lead_investor: d.leadStatus === 'Lead confirmed' ? (d.lead.trim() || null) : null,
		member_relationship: RELATION[d.relation] ?? null,
		member_commitment: num(d.myCommit),
		member_perspective: d.notes.trim() || null,
		deck_path: d.deckPath || null,
		one_pager_path: d.onePagerPath || null,
		materials_access: ACCESS[d.access] ?? 'on_request',
		founder_consent: d.consent,
	};
}

/** A `scout_deals` row (from `GET /scout/dealflow/mine`, unredacted) → form state. */
export function fromRow(r: Record<string, unknown>): Draft {
	return {
		company: str(r['company_name']),
		companyId: str(r['company_id']),
		website: str(r['company_website']),
		hq: str(r['company_hq']),
		sectorId: str(r['sector_id']),
		desc: str(r['company_description']),
		founderName: str(r['founder_contact_name']),
		founderEmail: str(r['founder_contact_email']),
		founderPhone: str(r['founder_contact_phone']),
		round: str(r['round_type']) || BLANK.round,
		instrument: labelFor(INSTRUMENT, r['instrument'], BLANK.instrument),
		currency: str(r['currency_code']) || BLANK.currency,
		target: amount(r['target_amount'] as string | number | null),
		committed: amount(r['committed_amount'] as string | number | null),
		valuationAmount: amount(r['valuation_amount'] as string | number | null),
		valuationBasis: str(r['valuation_basis']) || 'pre_money',
		valuationUndisclosed: r['valuation_undisclosed'] === true,
		// A `date` column arrives as an ISO timestamp once it has been through JSON.
		close: str(r['target_close_date']).slice(0, 10),
		leadStatus: labelFor(LEAD, r['lead_status'], BLANK.leadStatus),
		lead: str(r['lead_investor']),
		notes: str(r['member_perspective']),
		relation: labelFor(RELATION, r['member_relationship'], BLANK.relation),
		myCommit: amount(r['member_commitment'] as string | number | null),
		access: labelFor(ACCESS, r['materials_access'], BLANK.access),
		consent: r['founder_consent'] === true,
		deckPath: str(r['deck_path']),
		onePagerPath: str(r['one_pager_path']),
	};
}
