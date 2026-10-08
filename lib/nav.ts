/**
 * Builds a product's sidebar from the route manifest.
 *
 * Replaces `EXPLORE_NAV` / `useRaiseNav()` / `useScoutNav()`. Keeping this a
 * plain function of (tier, isAdmin, watchlists) rather than a hook is what lets
 * the nav be diffed against the old arrays without rendering anything — see
 * `lib/nav.check.ts`.
 */

import type { ShellNavEntry, ShellNavItem } from '@/components/atlas/shell/nav';
import { access, type Tier } from './access.ts';
import { NAV_LAYOUT, ROUTE_BY_ID, forTier, pathOf, type RouteDef } from './routes.ts';

/** A user watchlist, spliced into the Watchlists section at runtime. */
export interface NavWatchlist { id: string; name: string }

/**
 * Can this viewer actually be *sent* to `routeId`?
 *
 * Deliberately stricter than the sidebar. `buildNav` keeps `upsell` items,
 * because showing a locked page is how the product sells itself — but an agent
 * chip or a programmatic push is an action, so it must only offer routes that
 * really open. Two ways one goes dead, and the chat agent can know neither:
 * the route belongs to the other product (Investors, Programs, Pipeline and the
 * Fundraising Guide are `tier: 'raise'`), or it is still coming soon (every Deal
 * Flow route, and Scout's view of the Deck Screener, are `placeholder`).
 *
 * `isAdmin` is not taken: an admin bypasses `access()` entirely, and a chip is a
 * suggestion for *this* workspace, not proof of what they may open directly.
 */
export function navigable(routeId: string, tier: Tier): boolean {
	const r = ROUTE_BY_ID.get(routeId);
	if (!r || !forTier(r.path, tier) || forTier(r.placeholder, tier)) return false;
	return access(r.tier, tier, false) === 'allow';
}


function toItem(r: RouteDef, tier: Tier): ShellNavItem | null {
	const path = forTier(r.path, tier);
	const name = forTier(r.name, tier);
	// A route with no path for this tier simply does not exist here.
	if (!path || !name) return null;
	return {
		name, path, icon: r.icon,
		...(forTier(r.placeholder, tier) ? { placeholder: true } : {}),
		...(r.soon ? { soon: true } : {}),
		...(r.isDefault ? { isDefault: true } : {}),
	};
}

/**
 * The user's own watchlists, immediately before "All watchlists".
 *
 * Raise used to insert them after "Main watchlist" and Scout before its only
 * item, with two different slices — but both reduce to this one rule, so the
 * positional `const [main, ...rest] = e.items` that depended on "Main
 * watchlist" being index 0 is gone.
 */
function withWatchlists(items: ShellNavItem[], tier: Tier, lists: NavWatchlist[], icon: RouteDef['icon']): ShellNavItem[] {
	if (lists.length === 0) return items;
	const anchor = pathOf('watchlists', tier);
	const at = items.findIndex((i) => i.path === anchor);
	const dynamic = lists.map((l) => ({ name: l.name, icon, path: `${anchor}/${l.id}` }));
	return at === -1 ? [...items, ...dynamic] : [...items.slice(0, at), ...dynamic, ...items.slice(at)];
}

export function buildNav(tier: Tier, isAdmin: boolean, lists: NavWatchlist[] = [], watchlistIcon?: RouteDef['icon']): {
	nav: ShellNavEntry[];
	bottomNav: ShellNavItem[];
} {
	const nav: ShellNavEntry[] = [];
	const bottomNav: ShellNavItem[] = [];

	for (const group of NAV_LAYOUT[tier]) {
		const items = group.items
			.map((id) => ROUTE_BY_ID.get(id))
			// The layout says what a product *shows*; access says whether this
			// viewer can open it. Only `hidden` — the other paid product's
			// screens — is dropped. An `upsell` item stays listed and the page
			// behind it renders the TierGate, which is how the design wants
			// Explore's "Investors" to behave.
			.filter((r): r is RouteDef => !!r && access(r.tier, tier, isAdmin) !== 'hidden')
			.map((r) => toItem(r, tier))
			.filter((i): i is ShellNavItem => i !== null);
		if (items.length === 0) continue;

		if (group.bottom) { bottomNav.push(...items); continue; }
		if (group.title === null) { nav.push(...items); continue; }
		nav.push({
			title: group.title,
			items: group.title === 'Watchlists' && watchlistIcon
				? withWatchlists(items, tier, lists, watchlistIcon)
				: items,
		});
	}

	return { nav, bottomNav };
}
