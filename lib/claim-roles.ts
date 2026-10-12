import type { ClaimRole } from './claim-events.ts';

/**
 * Which claim forms a tier may use, when the caller has not already decided.
 *
 *   Explore  founder + operator + investor — any of the three could be true
 *   Raise    founder + operator            — Raise owns events and programmes,
 *                                            and those are operator claims
 *   Scout    investor                      — one option, so the chooser is
 *                                            skipped entirely
 *
 * This used to return ONE role and force it (`raise → founder`,
 * `scout → investor`, `explore → null`), which meant a Raise user could only
 * ever claim a company. There was no door to verifying an event or a
 * programme, even though the operator form and its `ecosystem_entity` backend
 * have always existed.
 */
export function rolesForTier(tier: string): ClaimRole[] {
	if (tier === 'raise') return ['founder', 'operator'];
	if (tier === 'scout') return ['investor'];
	return ['founder', 'operator', 'investor'];
}

/**
 * A single permitted role is not a choice.
 *
 * Returning it lets the modal open straight on that role's search step, which
 * is what Scout did before this became a set — showing a one-card "chooser"
 * would be a regression dressed up as consistency.
 */
export function soleRoleOf(roles: readonly ClaimRole[]): ClaimRole | null {
	return roles.length === 1 ? roles[0] : null;
}
