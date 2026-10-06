/**
 * Explore's product constants. The nav, section copy, home and account paths
 * that used to live here now come from the route manifest (`lib/routes.ts`);
 * what is left is the things the manifest has no opinion about.
 */

/** Explore's product colour (logo tag) — the Atlas pink used on the landing page. */
export const EXPLORE_COLOR = 'var(--a-pink)';

/** Public landing section describing Raise and Scout (reachable logged out). */
export const LANDING_RAISE = '/#how-to-join';
export const LANDING_SCOUT = '/#how-to-join';

/** Profile URL for a company inside Explore. */
export const exploreCompanyHref = (idOrSlug: string) => `/explore/market/companies/${encodeURIComponent(idOrSlug)}`;
