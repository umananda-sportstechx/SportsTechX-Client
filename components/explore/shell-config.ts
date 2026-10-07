/**
 * Explore's product constants. The nav, section copy, home and account paths
 * that used to live here now come from the route manifest (`lib/routes.ts`);
 * what is left is the things the manifest has no opinion about.
 */

/** Explore's product colour (logo tag) — the Atlas pink used on the landing page. */
export const EXPLORE_COLOR = 'var(--a-pink)';

/**
 * Where an in-app "tell me about Raise/Scout" link goes.
 *
 * Both used to be `/#how-to-join`, the public landing page's anchor — which
 * sent a signed-in user out of the product to marketing copy that never named
 * the plan they already had, and had no way to buy. They now point at the
 * in-app plans page. Kept as named constants because three surfaces use them
 * (the sidebar cards, Account's product access tiles and onboarding), and one
 * of them should not be able to drift from the others again.
 */
import { hrefOf } from '@/lib/routes';

export const PLANS_HREF = hrefOf('plans');
