/**
 * Self-check for the Deal Flow view logic. Run it with:
 *   node components/scout/deal-types.check.ts
 *
 * These three functions have to agree with SQL in another repository, which is
 * the kind of agreement that rots silently. The document predicate is the one
 * that matters most: the server answers a single uniform 404 for "no deck
 * uploaded" and "you may not have this deck", so a UI that offers the button
 * wrongly produces something indistinguishable from a bug.
 */
import assert from 'node:assert/strict';
import {
	canOpenDocs, closeLabel, committedPct, companyLabel, money, submitterLabel, type DealRow,
} from './deal-types.ts';

let failures = 0;
const check = (ok: boolean, msg: string) => {
	console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${msg}`);
	if (!ok) failures += 1;
};

const base: DealRow = {
	id: 'd1', source: 'circle', status: 'live', is_featured: false,
	company_name: 'Acme', company_website: 'acme.com', company_id: null, company_anonymous: false,
	company_hq: 'Berlin, Germany', company_description: 'Does things.', sector: 'Activity & Performance',
	round_type: 'Seed', instrument: 'priced_equity', currency_code: 'EUR',
	target_amount: '8000000', committed_amount: '5100000', ticket_min: null, ticket_max: null,
	valuation: '€38m pre-money', target_close_date: '2026-12-01',
	lead_status: 'confirmed', lead_investor: 'Big Fund',
	submitter_name: 'Some Fund', submitter_anonymous: false, member_perspective: 'Strong team.',
	member_relationship: 'existing_investor', member_commitment: '250000',
	has_deck: true, has_one_pager: false, materials_access: 'immediate',
	disclosed: false, interest_status: null,
};
const row = (over: Partial<DealRow>): DealRow => ({ ...base, ...over });

// ── documents ───────────────────────────────────────────────────────────────
check(canOpenDocs(base), 'immediate + named company → viewer may open documents');
check(!canOpenDocs(row({ materials_access: 'on_request' })),
	'on_request alone does not release documents');
// The non-obvious rule, and the whole reason this helper exists.
check(!canOpenDocs(row({ company_anonymous: true, materials_access: 'immediate' })),
	'an anonymous company overrides `immediate` — a deck names the company');
check(canOpenDocs(row({ company_anonymous: true, materials_access: 'immediate', disclosed: true })),
	'disclosure to this viewer releases an anonymous deal’s documents');
check(canOpenDocs(row({ materials_access: 'on_request', disclosed: true })),
	'disclosure also overrides on_request');

// ── labels never leak ───────────────────────────────────────────────────────
check(companyLabel(row({ company_name: null, company_anonymous: true })) === 'Undisclosed company',
	'a withheld company name reads as undisclosed');
check(companyLabel(base) === 'Acme', 'a named company reads as itself');
check(submitterLabel(row({ submitter_name: null, submitter_anonymous: true })) === 'An anonymous Circle member',
	'a withheld submitter reads as anonymous');
// The two flags are independent: an anonymous submitter may share a named company.
check(companyLabel(row({ submitter_anonymous: true, submitter_name: null })) === 'Acme',
	'submitter anonymity does not hide the company');

// ── formatting ──────────────────────────────────────────────────────────────
check(committedPct(base) === 64, 'committed/target → 64%');
check(committedPct(row({ target_amount: '0' })) === null, 'a zero target has no percentage, not Infinity');
check(committedPct(row({ committed_amount: null })) === null, 'no committed figure → no bar');
check(committedPct(row({ committed_amount: '99000000' })) === 100, 'over-subscribed clamps to 100');
check(money(null, 'EUR') === null, 'no amount formats to nothing, not "€0"');
check(money('abc', 'EUR') === null, 'a non-numeric string does not render as NaN');
check((money('8000000', null) ?? '').includes('8'), 'a missing currency still formats');
check(closeLabel('2026-12-01')?.includes('2026') === true, 'a date renders as month + year');
check(closeLabel(null) === null, 'no close date renders nothing');

console.log(failures === 0 ? '\nPASS' : `\nFAIL — ${failures} check(s)`);
process.exitCode = failures === 0 ? 0 : 1;
