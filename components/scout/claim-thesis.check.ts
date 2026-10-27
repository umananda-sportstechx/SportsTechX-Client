/**
 * Self-check for the claim ↔ thesis mapping. Run it with:
 *   npx tsx components/scout/claim-thesis.check.ts
 *
 * Whichever of the two forms an investor fills second opens pre-filled from the
 * first; a wrong label here silently re-asks a question (or answers it wrongly).
 */
import assert from 'node:assert/strict';
import { claimFromThesis, fillEmpty, thesisFromClaim } from './claim-thesis.ts';
import { DEFAULT_THESIS, THESIS_OPTIONS, PILLAR_SECTORS } from './sample-data.ts';

// ── Claim → thesis (the ticket: verified first, then the wizard) ────────────
const t = thesisFromClaim({
	name: 'Shnu VC', website: 'shnuvc.com', coCountry: 'India', coCity: 'Bengaluru',
	invCategory: 'Corporate VC', aum: '20000000', minInv: '$250K', maxInv: '$2M',
	fundingStages: ['Seed', 'Series A', 'Angel'], continents: ['Asia', 'Europe'],
	thesisSectors: ['Fan Experiences'],
});
assert.equal(t.fundName, 'Shnu VC');
assert.equal(t.country, 'India');
assert.equal(t.city, 'Bengaluru');
assert.equal(t.investorType, 'Corporate VC');
assert.equal(t.aum, '20000000');
assert.equal(t.chequeMin, '250000', 'plain digits for the number input');
assert.equal(t.chequeMax, '2000000');
assert.deepEqual(t.stages, ['Seed Round', 'Series A'], 'Angel has no thesis chip — dropped, not guessed');
assert.deepEqual(t.regions, ['Asia', 'Europe']);
assert.deepEqual(t.sectors, ['Fan Experiences']);
// Every mapped value is one the wizard can actually show selected.
for (const s of t.stages ?? []) assert.ok(THESIS_OPTIONS.stages.includes(s), `stage chip ${s}`);
assert.ok(THESIS_OPTIONS.investorType.includes(t.investorType!), 'investor type chip');
assert.ok(Object.values(PILLAR_SECTORS).flat().includes('Fan Experiences'));
assert.equal(thesisFromClaim({ invCategory: 'Sovereign Fund' }).investorType, '', 'no thesis chip → blank');
console.log('  ok    claim answers map onto thesis fields the wizard can show');

// ── fillEmpty never overwrites what the user already set ────────────────────
const mine = { ...DEFAULT_THESIS, country: 'Germany', stages: ['Series B'] };
const merged = fillEmpty(mine, t);
assert.equal(merged.country, 'Germany', 'typed value wins');
assert.deepEqual(merged.stages, ['Series B'], 'chosen chips win');
assert.equal(merged.city, 'Bengaluru', 'blank filled');
assert.equal(merged.aum, '20000000');
assert.equal(fillEmpty(mine, {}).country, 'Germany');
console.log('  ok    fillEmpty only fills blanks');

// ── Thesis → claim (the ticket's other ask: verify after the form) ──────────
const c = claimFromThesis({
	...DEFAULT_THESIS, name: 'Asha Rao', email: 'asha@shnuvc.com', role: 'Principal',
	fundName: 'Shnu VC', website: 'https://shnuvc.com', country: 'India', city: 'Bengaluru',
	investorType: 'Accelerator / studio', aum: '20000000', chequeMin: '250000', chequeMax: '3000000',
	stages: ['Pre Seed Round', 'Late Stage Venture'], regions: ['Asia', 'DACH'], sectors: ['Content Platforms'],
});
assert.equal(c.first, 'Asha');
assert.equal(c.last, 'Rao');
assert.equal(c.website, 'shnuvc.com', 'scheme stripped like the claim form expects');
assert.equal(c.invCategory, 'Accelerator');
assert.equal(c.minInv, '$250K', 'exact bucket');
assert.equal('maxInv' in c, false, '3m is not a bucket — left for the user, never rounded');
assert.deepEqual(c.fundingStages, ['Pre-Seed', 'Series C+']);
assert.deepEqual(c.continents, ['Asia'], 'DACH is a region, not a claim continent');
assert.deepEqual(c.thesisSectors, ['Content Platforms']);
assert.equal(c.buildThesis, true);
assert.equal('linkedin' in claimFromThesis(DEFAULT_THESIS), false, 'blanks are omitted so they never clobber the modal seed');
console.log('  ok    thesis answers pre-fill the claim');

console.log('\nPASS');
