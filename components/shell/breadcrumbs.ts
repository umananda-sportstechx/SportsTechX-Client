import { flattenNav, isSection, pickActive, type ShellNavEntry } from '../atlas/shell/nav.ts';

export interface Crumb {
	label: string;
	/** Absent for a section, which is a grouping label and not a page. */
	href?: string;
}

/**
 * The breadcrumb trail, **excluding the page you are on**.
 *
 * Deliberate, and it is what makes this derivable at all. Two reasons:
 *
 * 1. ~28 of the 38 authenticated pages render `SectionHeader`, whose `H1` *is*
 *    the section title. A full trail would put "Intelligence / Analytics"
 *    directly above an `<h1>Intelligence</h1>` and its already-active
 *    "Analytics" tab.
 * 2. No detail page publishes its title anywhere a navbar could read it, so a
 *    trailing crumb for `/companies/acme` would have to say "acme". Ending at
 *    "Companies" means the leaf is never needed.
 *
 * Pure, so `breadcrumbs.check.ts` can exercise it without React.
 */
export function crumbsFor(
	nav: ShellNavEntry[],
	homePath: string,
	pathname: string,
	params: { get(k: string): string | null; has(k: string): boolean },
): Crumb[] {
	// On home there is no trail — the "Home" crumb the navbar always renders is
	// the page itself, and this function never includes the current page.
	if (pathname === homePath) return [];

	const items = flattenNav(nav);
	const activePath = pickActive(items, homePath, pathname, params);
	const out: Crumb[] = [];

	const section = nav.filter(isSection).find((s) => s.items.some((i) => i.path === activePath));
	if (section) out.push({ label: section.title });

	// The active item is an ancestor only when the URL sits BELOW it — e.g.
	// /companies/acme under /companies. On /companies itself it is the current
	// page, so it is left out.
	const active = items.find((i) => i.path === activePath);
	if (active) {
		const base = active.path.split('?')[0];
		if (pathname.startsWith(`${base}/`)) out.push({ label: active.name, href: active.path });
	}
	return out;
}
