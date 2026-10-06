/**
 * Self-check for `access()`. Run it with:  node lib/access.check.ts
 *
 * No test framework on purpose — this is one pure function and Node strips the
 * types natively, so a dependency would cost more than it buys. If the client
 * ever grows a real runner, this moves into it unchanged.
 */
import assert from 'node:assert/strict';
import { access, upgradeTarget, type Access, type Tier } from './access.ts';

// Every combination, written out rather than generated — the point is to be
// able to read the policy off the table.
const CASES: [pageTier: Tier | undefined, user: Tier, expected: Access][] = [
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
console.log('  ok    admin bypasses all 9');

// The upgrade target is the thing to sell, or nothing.
assert.equal(upgradeTarget('raise', 'explore'), 'raise');
assert.equal(upgradeTarget('scout', 'explore'), 'scout');
assert.equal(upgradeTarget('raise', 'scout'), null, 'nothing to sell across siblings');
assert.equal(upgradeTarget('raise', 'raise'), null, 'already owned');
assert.equal(upgradeTarget(undefined, 'explore'), null, 'base tier is free');
console.log('  ok    upgradeTarget names a tier only when there is a sale');

console.log(failures === 0 ? '\nPASS' : `\nFAIL — ${failures} case(s)`);
process.exit(failures === 0 ? 0 : 1);
