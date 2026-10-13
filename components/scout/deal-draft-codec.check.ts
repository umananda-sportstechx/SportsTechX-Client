/**
 * Self-check for the deal-submission codec. Run it with:
 *   node components/scout/deal-draft-codec.check.ts
 *
 * The decode direction is new and its failures are quiet: a label that does not
 * map back silently resets a chip to the blank default, so resuming a returned
 * deal would change what the submitter had already agreed with the founder —
 * the instrument, who can see the deck, whether a lead is confirmed — without
 * anything looking wrong on screen.
 */
import { BLANK, fromRow, toPayload, type Draft } from './deal-draft-codec.ts';

let failures = 0;
const check = (ok: boolean, msg: string) => {
	console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${msg}`);
	if (!ok) failures += 1;
};

const FILLED: Draft = {
	company: 'Goalbound', companyId: '', website: 'goalbound.io', hq: 'Lisbon, Portugal',
	sectorId: '7f1c0a2e-1111-2222-3333-444444444444', desc: 'Match analytics for academies.',
	founderName: 'Ana Silva', founderEmail: 'ana@goalbound.io', founderPhone: '+351 900 000 000',
	round: 'Series A', instrument: 'SAFE', currency: 'USD',
	target: '1500000', committed: '500000', close: '2027-03-31',
	valuationAmount: '8000000', valuationBasis: 'pre_money', valuationUndisclosed: false,
	leadStatus: 'Seeking lead', lead: '',
	notes: 'Strong retention.', relation: 'Existing investor', myCommit: '100000',
	access: 'Circle members', consent: true,
	deckPath: 'user-uploads/uid/deals/abc.pdf', onePagerPath: '',
};

// ── The round trip, which is the whole point ────────────────────────────────
// `toPayload` keys ARE the column names, so its output stands in for the row.
const back = fromRow(toPayload(FILLED));
for (const k of Object.keys(FILLED) as (keyof Draft)[]) {
	check(back[k] === FILLED[k], `${k} survives encode → decode (${JSON.stringify(back[k])})`);
}

// ── Enum ⇄ label, both directions ───────────────────────────────────────────
check(toPayload({ ...FILLED, instrument: 'Priced Equity' })['instrument'] === 'priced_equity', 'instrument label encodes to its enum');
check(fromRow({ instrument: 'convertible_note' }).instrument === 'Convertible Note', 'instrument enum decodes to its label');
check(fromRow({ materials_access: 'immediate' }).access === 'Circle members', 'immediate access decodes to the member-visible label');
check(fromRow({ materials_access: 'on_request' }).access === 'Only after intro request', 'on_request decodes to the restricted label');
check(fromRow({ lead_status: 'not_required' }).leadStatus === 'No lead required', 'lead status decodes');
check(fromRow({ member_relationship: 'advisor_or_board' }).relation === 'Advisor / board', 'relationship decodes');

// An enum the form has no chip for must not silently pick a neighbour.
check(fromRow({ materials_access: 'something_new' }).access === BLANK.access, 'an unknown enum falls back to the restrictive default');

// ── What pg actually sends back ─────────────────────────────────────────────
check(fromRow({ target_amount: '1500000.00' }).target === '1500000', 'a numeric string loses its trailing decimals');
check(fromRow({ committed_amount: null }).committed === '', 'a null amount decodes to an empty field, not "0"');
check(fromRow({ member_commitment: 0 }).myCommit === '', 'a zero amount decodes to empty (the API rejects 0)');
check(fromRow({ target_close_date: '2027-03-31T00:00:00.000Z' }).close === '2027-03-31', 'a date column is cut back to what a date input accepts');
check(fromRow({}).consent === false, 'a missing consent flag is never assumed true');
check(fromRow({ founder_consent: 'yes' }).consent === false, 'only a real boolean true counts as consent');

// ── Lead investor is conditional on purpose ─────────────────────────────────
check(toPayload({ ...FILLED, leadStatus: 'Seeking lead', lead: 'Leftovers VC' })['lead_investor'] === null,
	'a lead name is dropped unless the lead is confirmed');
check(toPayload({ ...FILLED, leadStatus: 'Lead confirmed', lead: 'Leftovers VC' })['lead_investor'] === 'Leftovers VC',
	'a confirmed lead keeps its name');

console.log(failures === 0 ? '\nPASS' : `\nFAIL — ${failures} check(s)`);
process.exitCode = failures === 0 ? 0 : 1;
