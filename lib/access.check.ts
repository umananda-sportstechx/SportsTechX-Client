/**
 * Self-check for `access()`. Run it with:  node lib/access.check.ts
 *
 * No test framework on purpose — this is one pure function and Node strips the
 * types natively, so a dependency would cost more than it buys. If the client
 * ever grows a real runner, this moves into it unchanged.
 */
import assert from 'node:assert/strict';
import { access, upgradeTarget, type Access, type Tier, type TierReq } from './access.ts';
import { safeRedirect } from './safe-redirect.ts';

// Every combination, written out rather than generated — the point is to be
// able to read the policy off the table.
const CASES: [pageTier: TierReq | undefined, user: Tier, expected: Access][] = [
	// Explore base: free to everyone, including the paid tiers.
	[undefined, 'explore', 'allow'],
	[undefined, 'raise', 'allow'],
	[undefined, 'scout', 'allow'],
	// A Raise page.
	['raise', 'explore', 'upsell'],  // prospect — show the pitch
	['raise', 'raise', 'allow'],
	['raise', 'scout', 'hidden'],    // sibling product — 404, not an upsell
	// A Scout page.
	['scout', 'explore', 'upsell'],
	['scout', 'raise', 'hidden'],
	['scout', 'scout', 'allow'],
	// A screen both paid products include — the deck analyser, the
	// recommendations feed. Same shape the server already uses:
	// `@RequireTier('raise','scout')` over `required.includes(user.tier)`.
	[['raise', 'scout'], 'explore', 'upsell'],
	[['raise', 'scout'], 'raise', 'allow'],
	[['raise', 'scout'], 'scout', 'allow'],
	// A single-element list must behave exactly like the bare tier.
	[['raise'], 'scout', 'hidden'],
];

let failures = 0;
for (const [pageTier, user, expected] of CASES) {
	const got = access(pageTier, user, false);
	const label = `${user} user → ${pageTier ?? 'base'} page`;
	if (got === expected) {
		console.log(`  ok    ${label.padEnd(28)} ${got}`);
	} else {
		console.error(`  FAIL  ${label.padEnd(28)} expected ${expected}, got ${got}`);
		failures++;
	}
}

// Admins bypass everything, matching the server's TierGuard.
for (const [pageTier, user] of CASES) {
	assert.equal(access(pageTier, user, true), 'allow', `admin blocked on ${pageTier}/${user}`);
}
console.log(`  ok    admin bypasses all ${CASES.length}`);

// The upgrade target is the thing to sell, or nothing.
assert.equal(upgradeTarget('raise', 'explore'), 'raise');
assert.equal(upgradeTarget('scout', 'explore'), 'scout');
assert.equal(upgradeTarget('raise', 'scout'), null, 'nothing to sell across siblings');
assert.equal(upgradeTarget('raise', 'raise'), null, 'already owned');
assert.equal(upgradeTarget(undefined, 'explore'), null, 'base tier is free');
assert.equal(upgradeTarget(['raise', 'scout'], 'explore'), 'raise', 'shared screen pitches the first');
assert.equal(upgradeTarget(['raise', 'scout'], 'scout'), null, 'already owned via the list');
console.log('  ok    upgradeTarget names a tier only when there is a sale');


// ── Post-auth redirect safety ────────────────────────────────────────────────
//
// Here rather than in its own file so `npm run check` covers it without a third
// entry. `?redirectTo=` is attacker-controllable and followed immediately after
// sign-in; the check it replaced was `startsWith('/')`, which accepts
// `//evil.example` — a protocol-relative URL that navigates off-origin.
{
	const BS = String.fromCharCode(92);
	const reject: (string | null | undefined)[] = [
		'//evil.example', '///evil.example', '//evil.example/path',
		'/' + BS + 'evil.example', BS + BS + 'evil.example',
		'https://evil.example', 'javascript:alert(1)', 'app', '', null, undefined,
	];
	// `/evil.example` is a legitimate same-origin path, not an attack.
	const accept = ['/app', '/app/companies', '/billing?x=1', '/app#frag', '/evil.example'];
	for (const r of reject) assert.equal(safeRedirect(r), '/app', `redirect should be rejected: ${JSON.stringify(r)}`);
	for (const a of accept) assert.equal(safeRedirect(a), a, `redirect should be accepted: ${a}`);
	console.log(`  ok    safeRedirect rejects ${reject.length} off-origin forms, accepts ${accept.length} paths`);
}

console.log(failures === 0 ? '\nPASS' : `\nFAIL — ${failures} case(s)`);
// `exitCode` rather than `exit()`: on Windows, exiting while stdout still has
// buffered writes aborts inside libuv, so the check crashes *after* printing
// PASS and reports a false failure. Setting the code lets Node flush first.
process.exitCode = failures === 0 ? 0 : 1;
