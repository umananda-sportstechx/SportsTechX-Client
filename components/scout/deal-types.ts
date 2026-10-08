/**
 * The shape the Deal Flow API actually returns, plus the three pieces of logic
 * that must agree with the server exactly.
 *
 * Typed from the SQL projection (`SCOUT_COLS` in `scout-dealflow.repository.ts`),
 * **not** from the server's own `DealListRow` interface — that interface is
 * missing five columns the query really selects (`ticket_min`, `ticket_max`,
 * `valuation`, `lead_investor`, `member_commitment`), and rows are not mapped
 * through it at runtime.
 *
 * Two things to keep in mind when reading a row:
 *
 * 1. **Money and dates arrive as strings.** Every numeric is `::text` cast so a
 *    big number cannot lose precision through a float. Parse before formatting.
 * 2. **Redaction is signalled, not inferred.** The row always carries
 *    `company_anonymous`, `submitter_anonymous` and `disclosed`, so the UI shows
 *    "undisclosed" from the flag rather than guessing from a null. Guessing
 *    would also be wrong: `company_hq` and `company_description` are returned
 *    for an anonymous deal on purpose, while `company_name` is withheld.
 */
export type DealTab = 'all' | 'featured' | 'verified' | 'circle';

export interface DealRow {
	id: string;
	source: 'circle' | 'verified_raise';
	status: string;
	is_featured: boolean;

	/** null when `company_anonymous` and this viewer has not been disclosed to. */
	company_name: string | null;
	company_website: string | null;
	company_id: string | null;
	company_anonymous: boolean;
	/** Returned even when anonymous — a region is not identifying. */
	company_hq: string | null;
	company_description: string | null;
	sector: string | null;

	round_type: string | null;
	instrument: string | null;
	currency_code: string | null;
	target_amount: string | null;
	committed_amount: string | null;
	ticket_min: string | null;
	ticket_max: string | null;
	valuation: string | null;
	target_close_date: string | null;
	lead_status: string | null;
	/** Withheld with the company name — a lead investor identifies the round. */
	lead_investor: string | null;

	/** null when `submitter_anonymous` and not disclosed. */
	submitter_name: string | null;
	submitter_anonymous: boolean;
	/** Shown even for an anonymous submitter: it is their view, not their name. */
	member_perspective: string | null;
	member_relationship: string | null;
	member_commitment: string | null;

	/** Presence only. The storage path is never sent to a client. */
	has_deck: boolean;
	has_one_pager: boolean;
	materials_access: 'immediate' | 'on_request' | null;

	/** Per-viewer: has STX released this deal's identity to *me*. */
	disclosed: boolean;
	/** Per-viewer: my own interest request's status, or null if I never asked. */
	interest_status: string | null;
}

const LEAD_LABEL: Record<string, string> = {
	confirmed: 'Lead confirmed', seeking: 'Seeking lead', not_required: 'No lead required',
};
const INSTRUMENT_LABEL: Record<string, string> = {
	priced_equity: 'Priced equity', safe: 'SAFE', convertible_note: 'Convertible note',
	asa: 'ASA', other: 'Other',
};
const RELATIONSHIP_LABEL: Record<string, string> = {
	investing_this_round: 'Investing in this round', existing_investor: 'Existing investor',
	advisor_or_board: 'Advisor / board', referral: 'Referral',
};
export const INTEREST_LABEL: Record<string, string> = {
	received: 'Request received', source_confirmed: 'Confirming with the company',
	shared: 'Details shared', connected: 'Introduced', declined: 'Not proceeding',
};

export const leadLabel = (v: string | null) => (v ? LEAD_LABEL[v] ?? v : null);
export const instrumentLabel = (v: string | null) => (v ? INSTRUMENT_LABEL[v] ?? v : null);
export const relationshipLabel = (v: string | null) => (v ? RELATIONSHIP_LABEL[v] ?? v : null);

/** Money, from the `::text` numeric the API sends. */
export function money(amount: string | null, ccy: string | null): string | null {
	if (!amount) return null;
	const n = Number(amount);
	if (!Number.isFinite(n)) return null;
	return new Intl.NumberFormat(undefined, {
		style: 'currency', currency: (ccy || 'EUR').toUpperCase(),
		notation: n >= 1_000_000 ? 'compact' : 'standard', maximumFractionDigits: n >= 1_000_000 ? 1 : 0,
	}).format(n);
}

/** `2026-12-01` → `Dec 2026`, matching the designed card copy. */
export function closeLabel(date: string | null): string | null {
	if (!date) return null;
	const d = new Date(`${date}T00:00:00`);
	return Number.isNaN(d.getTime()) ? date : d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

/**
 * How far through the round, for the progress bar. Null when unknowable.
 *
 * The null guards are load-bearing: `Number(null)` is **0**, not NaN, so
 * without them a deal with no committed figure rendered a 0% bar — reading as
 * "nothing raised yet" rather than "not disclosed".
 */
export function committedPct(d: DealRow): number | null {
	if (!d.target_amount || !d.committed_amount) return null;
	const t = Number(d.target_amount), c = Number(d.committed_amount);
	if (!Number.isFinite(t) || !Number.isFinite(c) || t <= 0) return null;
	return Math.max(0, Math.min(100, Math.round((c / t) * 100)));
}

/** What to call the company. Never leaks that a name exists but is withheld. */
export const companyLabel = (d: DealRow) =>
	d.company_name ?? (d.company_anonymous ? 'Undisclosed company' : 'Company');

export const submitterLabel = (d: DealRow) =>
	d.submitter_name ?? (d.submitter_anonymous ? 'An anonymous Circle member' : 'A Circle member');

/**
 * Will the document endpoints actually hand this viewer a URL?
 *
 * Mirrors the server's gate exactly (`documentPath` in
 * `scout-dealflow.repository.ts`). The non-obvious half is the anonymity
 * override: **an anonymous company's materials always require disclosure, even
 * when the member chose `immediate`**, because a deck has the company's name on
 * every slide. So `materials_access === 'immediate'` alone does NOT predict a
 * working URL.
 *
 * Getting this wrong in the UI means offering a button that 404s — and the
 * server answers one uniform 404 for "no deck" and "not for you" alike, so the
 * button would be indistinguishable from a bug.
 */
export const canOpenDocs = (d: DealRow): boolean =>
	d.disclosed || (d.materials_access === 'immediate' && !d.company_anonymous);
