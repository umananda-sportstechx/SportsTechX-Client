/**
 * Who can see what.
 *
 * The important thing this encodes, which nothing in the app encoded before:
 * **Raise and Scout are sibling products, not rungs on a ladder.** Explore is
 * the free base that everyone gets; Raise and Scout sit beside each other on
 * top of it. A user holds one of them, not a level.
 *
 * So "can this user see this page" has three answers, not two:
 *   - `allow`   render it
 *   - `upsell`  they could buy this — show them what it is
 *   - `hidden`  this belongs to the other paid product — 404
 *
 * That matches the server, which has always worked this way: `TierGuard` tests
 * `required.includes(user.tier)`, set membership rather than a threshold, so
 * `@RequireTier('raise')` already refuses a Scout user.
 *
 * One function, three consumers: the route gate (`TierGate`), the nav (items
 * resolving to anything but `allow` are hidden), and the 402 handler. They
 * disagreed with each other before because each improvised its own rule.
 */

import type { UserType } from '@/hooks/use-user-profile';

export type Tier = UserType;
export type Access = 'allow' | 'upsell' | 'hidden';

/**
 * What a page requires: one tier, several, or nothing.
 *
 * A list is not a special case — it is the server's shape. `@RequireTier` takes
 * varargs and `TierGuard` tests `required.includes(user.tier)`, so a screen both
 * paid products share (the deck analyser, the recommendations feed) is
 * `['raise', 'scout']` on both sides.
 */
export type TierReq = Tier | Tier[];

const requires = (req: TierReq, user: Tier) => (Array.isArray(req) ? req.includes(user) : req === user);

/**
 * @param pageTier  the tier(s) a page requires; `undefined` means the Explore
 *                  base, which is free to every signed-in user. Note the
 *                  asymmetry: `undefined` is "everyone", `'explore'` is
 *                  "Explore only" — a page that makes no sense for a paid
 *                  profile, which is why it 404s for them rather than upselling.
 * @param user      the viewer's tier (`getUserType` already falls back to
 *                  'explore' for an unknown or retired label).
 * @param isAdmin   admins bypass everything, matching `TierGuard`.
 */
export function access(pageTier: TierReq | undefined, user: Tier, isAdmin: boolean): Access {
	if (isAdmin || !pageTier) return 'allow';
	if (requires(pageTier, user)) return 'allow';
	// A free user is a prospect for either product, so show them the pitch.
	if (user === 'explore') return 'upsell';
	// Paid, but for the other product. Not a sale we can make and not a page
	// they should know exists — 404 rather than an upsell for something they
	// would have to switch plans to get.
	return 'hidden';
}

/**
 * The cheapest tier that unlocks something, for a lock badge or an upgrade CTA.
 *
 * Returns null when there is nothing to sell — either they already have it, or
 * it belongs to the product they didn't buy. The old ladder version of this
 * (`UPGRADE_PATH.slice(indexOf(user) + 1)`) returned an empty list for a Scout
 * user locked out of a Raise feature, so the badge could not name a tier.
 */
export function upgradeTarget(pageTier: TierReq | undefined, user: Tier): Tier | null {
	if (access(pageTier, user, false) !== 'upsell' || !pageTier) return null;
	// A screen both products include (`['raise','scout']`) has two possible
	// sales. Pitch the first — it only picks which product the gate describes,
	// and both of its CTAs go to the landing section that lists both plans.
	return Array.isArray(pageTier) ? pageTier[0] ?? null : pageTier;
}
