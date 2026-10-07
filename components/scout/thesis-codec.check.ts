/**
 * Self-check for the thesis codec. Run it with:
 *   node components/scout/thesis-codec.check.ts
 *
 * The codec is the only thing standing between a label-shaped form and an
 * id-shaped API, and every mistake in it is silent: an unmatched label is
 * dropped, a mis-parsed cheque is stored as the wrong number, and a wrong
 * `scope_type` files a country under continents. None of that throws.
 */
import assert from 'node:assert/strict';
import { formatMoney, indexByName, parseMoney, scopeTypeOf, toForm, toThesisDto } from './thesis-codec.ts';
import { DEFAULT_THESIS, type Thesis } from './sample-data.ts';

// ── Money ────────────────────────────────────────────────────────────────────
assert.equal(parseMoney('€250k'), 250_000);
assert.equal(parseMoney('€2m'), 2_000_000);
assert.equal(parseMoney('250,000'), 250_000);
assert.equal(parseMoney('1.5m'), 1_500_000);
assert.equal(parseMoney(''), null, 'empty must be null, not 0 — 0 is a real cheque size');
assert.equal(parseMoney('whatever'), null);
assert.equal(formatMoney(250_000), '€250k');
assert.equal(formatMoney(2_000_000), '€2m');
assert.equal(formatMoney(null), '');
// Round-trip the values the form actually offers.
for (const s of ['€250k', '€2m', '€1.5m']) assert.equal(formatMoney(parseMoney(s)), s, `round-trip ${s}`);
console.log('  ok    money parses and round-trips');

// ── Geography granularity ────────────────────────────────────────────────────
assert.equal(scopeTypeOf('Europe'), 'continent');
assert.equal(scopeTypeOf('DACH'), 'region');
assert.equal(scopeTypeOf('USA & Canada'), 'region');
assert.equal(scopeTypeOf('Germany'), 'country', 'anything unlisted is a country');
console.log('  ok    geography granularity');

// ── Taxonomy matching is by name, case-insensitively ─────────────────────────
const idx = {
	sectors: indexByName([{ id: 'sec-1', name: 'Activity & Performance' }]),
	rounds: indexByName([{ id: 'rt-1', name: 'Seed' }]),
	sports: indexByName([{ id: 'sp-1', name: 'Football' }]),
};
const form: Thesis = {
	...DEFAULT_THESIS,
	sectors: ['activity & performance', 'Not A Real Sector'],
	stages: ['Seed'],
	regions: ['Europe', 'Germany'],
	include: ['B2B', 'Football', 'Computer vision'],
	exclude: ['Web3 & crypto'],
	chequeMin: '€250k', chequeMax: '€2m', invStyle: 'Either', traction: '€500k+ ARR',
};
const dto = toThesisDto(form, idx);
assert.deepEqual(dto.sector_ids, ['sec-1'], 'matches case-insensitively and drops the unknown');
assert.deepEqual(dto.round_type_ids, ['rt-1']);
assert.deepEqual(dto.sport_ids, ['sp-1'], 'sports are picked out of the shared include list');
assert.deepEqual(dto.business_models, ['b2b'], 'only real business models; "Computer vision" is not one');
assert.deepEqual(dto.geo, [
	{ scope_type: 'continent', scope_value: 'Europe' },
	{ scope_type: 'country', scope_value: 'Germany' },
]);
assert.equal(dto.cheque_min, 250_000);
assert.equal(dto.cheque_max, 2_000_000);
assert.equal(dto.invest_style, 'either', 'enum is lower-case');
assert.equal(dto.exclusions, 'Web3 & crypto');
console.log('  ok    form → API drops unmatched labels rather than sending them');

// ── Server → form ────────────────────────────────────────────────────────────
const back = toForm(
	{
		sectors: [{ id: 'sec-1', name: 'Activity & Performance' }],
		sports: [{ id: 'sp-1', name: 'Football' }],
		round_types: [{ id: 'rt-1', name: 'Seed' }],
		geo: [{ scope_type: 'continent', scope_value: 'Europe' }],
		business_models: ['b2b'],
		cheque_min: 250_000, cheque_max: 2_000_000,
		traction_floor: '€500k+ ARR', invest_style: 'either',
		exclusions: 'Web3 & crypto, Betting & prediction',
	},
	{
		full_name: 'A Tester', role_title: 'Partner', linkedin_url: null,
		fund_name: 'Northline', investor_type: 'venture_capital',
		fund_website: 'https://northline.vc', aum: '€100–250m', setup_completed_at: null,
	},
	DEFAULT_THESIS,
);
assert.deepEqual(back.sectors, ['Activity & Performance']);
assert.deepEqual(back.stages, ['Seed']);
assert.deepEqual(back.regions, ['Europe']);
assert.deepEqual(back.include, ['B2B', 'Football'], 'enum back to label, sports appended');
assert.deepEqual(back.exclude, ['Web3 & crypto', 'Betting & prediction']);
assert.equal(back.invStyle, 'Either');
assert.equal(back.investorType, 'Venture capital');
assert.equal(back.chequeMin, '€250k');
console.log('  ok    API → form restores every label');

// An empty thesis must not blow up or invent values.
const empty = toForm(undefined, null, DEFAULT_THESIS);
assert.deepEqual(empty.sectors, []);
assert.deepEqual(empty.regions, []);
assert.equal(empty.chequeMin, '');
console.log('  ok    an unset thesis reads as empty, not as the sample data');

console.log('\nPASS');
