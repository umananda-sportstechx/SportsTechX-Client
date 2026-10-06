/**
 * Scout's product constants. The nav, section copy, home and account paths that
 * used to live here now come from the route manifest (`lib/routes.ts`).
 */

/** Scout's product colour (logo tag), from the Claude Design. */
export const SCOUT_COLOR = '#0FB86A';

/** Profile URL for a company inside Scout. */
export const scoutCompanyHref = (idOrSlug: string) => `/scout/discover/companies/${encodeURIComponent(idOrSlug)}`;
