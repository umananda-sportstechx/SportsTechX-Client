/**
 * Navigation model shared by the sidebar (AtlasShell) and section page headers
 * (TabbedPageHeader): a product's nav is a list of items and sections; the
 * section containing the current page supplies that page's title + tabs.
 */

import type { LucideIcon } from 'lucide-react';

export interface ShellNavItem {
	name: string;
	icon: LucideIcon;
	path: string;
	/** Not built yet — shown greyed with a SOON pill, not clickable. */
	soon?: boolean;
	/** Active when the page is open without this item's query (the page's default tab). */
	isDefault?: boolean;
}
export interface ShellNavSection { title: string; items: ShellNavItem[] }
export type ShellNavEntry = ShellNavItem | ShellNavSection;
export const isSection = (e: ShellNavEntry): e is ShellNavSection => 'items' in e;

/**
 * The one active nav path for the current URL. An item matches when its pathname
 * matches (exactly, or as a parent for query-less items) and every query param it
 * carries equals the URL's — or the param is absent and the item is `isDefault`.
 * If nothing matches strictly (e.g. a tab with no nav item), fall back to the
 * page's `isDefault` / query-less item, and for sub-pages of a tabbed page
 * (e.g. /raise/investors/123) to that page's `isDefault` item.
 */
export function pickActive(items: ShellNavItem[], homePath: string, pathname: string, params: { get(k: string): string | null; has(k: string): boolean }): string | null {
	const parsed = items.filter((i) => !i.soon).map((i) => {
		const [p, q] = i.path.split('?');
		return { item: i, p, q: new URLSearchParams(q ?? '') };
	});
	const pathMatches = (p: string, hasQuery: boolean) =>
		p === homePath ? pathname === homePath : pathname === p || (!hasQuery && pathname.startsWith(p + '/'));
	// Most specific first: exact path, then the longest parent (so /raise/resources/framework/x
	// picks "Framework", not "Fundraising Guide" at /raise/resources).
	const candidates = parsed
		.filter((c) => pathMatches(c.p, c.q.size > 0))
		.sort((a, b) => Number(b.p === pathname) - Number(a.p === pathname) || b.p.length - a.p.length);
	const strict = candidates.find((c) => [...c.q].every(([k, v]) => params.get(k) === v || (!params.has(k) && c.item.isDefault)));
	if (strict) return strict.item.path;
	const fallback = candidates.find((c) => c.item.isDefault) ?? candidates.find((c) => c.q.size === 0);
	if (fallback) return fallback.item.path;
	// Sub-pages of a tabbed page (e.g. /raise/investors/123) → that page's default item.
	const parent = parsed.find((c) => c.q.size > 0 && c.item.isDefault && pathname.startsWith(c.p + '/'));
	return parent?.item.path ?? null;
}


/** Every item in a nav, flattened (sections expanded). */
export function flattenNav(nav: ShellNavEntry[]): ShellNavItem[] {
	return nav.flatMap((e) => (isSection(e) ? e.items : [e]));
}
