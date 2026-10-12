/**
 * Self-check for the Get Verified role matrix. Run it with:
 *   node lib/claim-roles.check.ts
 *
 * This earns a test because getting it wrong is silent and tier-specific: you
 * only notice a missing Operator card if you happen to be signed in as Raise,
 * and you only notice an extra Investor card if you happen to be signed in as
 * Raise too. Nothing crashes either way — the wrong claim just lands in the
 * admin queue against the wrong entity table.
 */
import { rolesForTier, soleRoleOf } from './claim-roles.ts';

let failures = 0;
const check = (ok: boolean, msg: string) => {
	console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${msg}`);
	if (!ok) failures += 1;
};
const eq = (a: readonly unknown[], b: readonly unknown[]) => JSON.stringify(a) === JSON.stringify(b);

// ── The matrix, exactly as specified ────────────────────────────────────────
check(eq(rolesForTier('explore'), ['founder', 'operator', 'investor']), 'Explore offers all three roles');
check(eq(rolesForTier('raise'), ['founder', 'operator']), 'Raise offers founder + operator');
check(eq(rolesForTier('scout'), ['investor']), 'Scout offers investor only');

// Raise owns events and programmes, which are operator claims — this is the
// whole reason the rule changed from a single role to a set.
check(rolesForTier('raise').includes('operator'), 'Raise can claim an event or a programme');
check(!rolesForTier('raise').includes('investor'), 'Raise is never offered the investor form');
check(!rolesForTier('scout').includes('founder'), 'Scout is never offered the founder form');
check(!rolesForTier('scout').includes('operator'), 'Scout is never offered the operator form');

// `getUserType` falls back to 'explore' for an unknown or still-loading tier,
// so the permissive set is the right default — a user who should see fewer
// cards is a smaller problem than one who can claim nothing.
check(eq(rolesForTier(''), ['founder', 'operator', 'investor']), 'an unknown tier falls back to all three');

// ── The collapse rule: one option is not a choice ───────────────────────────
check(soleRoleOf(rolesForTier('scout')) === 'investor', 'Scout collapses to investor and skips the chooser');
check(soleRoleOf(rolesForTier('raise')) === null, 'Raise has two options, so the chooser is shown');
check(soleRoleOf(rolesForTier('explore')) === null, 'Explore has three options, so the chooser is shown');
check(soleRoleOf([]) === null, 'an empty set never collapses to a role');

console.log(failures === 0 ? '\nPASS' : `\nFAIL — ${failures} check(s)`);
process.exitCode = failures === 0 ? 0 : 1;
