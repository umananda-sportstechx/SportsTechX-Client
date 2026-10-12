import { flattenNav, isSection, pickActive, type ShellNavEntry } from '../atlas/shell/nav.ts';

export interface Crumb {
	label: string;
	/** Absent for the current page, and for a section (a grouping label, not a page). */
	href?: string;
}

/**
 * The breadcrumb trail, ending on the page you are actually on.
 *
 * It used to stop one short — deliberately, so the trail would not repeat the
 * `H1` on the ~28 pages whose heading is their section title. The result read
 * as broken rather than tidy: every page showed "Home › Discover" and nothing
 * else, so the trail never told you where you were, only roughly where you
 * had come from. Repeating a heading is normal for breadcrumbs; saying nothing
 * is not.
 *
 * The leaf of a detail page (`/companies/acme-sports`) has no title to read —
 * nothing publishes one where a navbar could reach it — so the slug is
 * de-slugged for display. An opaque id is dropped instead of shown, because
 * "Companies › 7f1c0a2e-…" is worse than stopping at "Companies".
 *
 * Pure, so `breadcrumbs.check.ts` can exercise it without React.
 */
export interface CrumbOptions {
	/**
	 * The manifest route for the current path, used when no sidebar item
	 * matches. Pages that are reachable but deliberately unlisted (Chat, Get
	 * verified, the account tabs) otherwise had no trail beyond "Home".
	 */
	route?: { name: string; path: string };
	/**
	 * A real title for the detail leaf, when the caller has one (a chat's
	 * conversation title). Beats the de-slugged segment, and is shown even when
	 * the segment is an opaque id that would otherwise be dropped.
	 */
	leafLabel?: string | null;
}

export function crumbsFor(
	nav: ShellNavEntry[],
	homePath: string,
	pathname: string,
	params: { get(k: string): string | null; has(k: string): boolean },
	opts: CrumbOptions = {},
): Crumb[] {
	// On home there is no trail — the "Home" crumb the navbar always renders is
	// the page itself.
	if (pathname === homePath) return [];

	const items = flattenNav(nav);
	const activePath = pickActive(items, homePath, pathname, params);
	const out: Crumb[] = [];

	const section = nav.filter(isSection).find((s) => s.items.some((i) => i.path === activePath));
	if (section) out.push({ label: section.title });

	const active = items.find((i) => i.path === activePath)
		?? (opts.route && (pathname === opts.route.path || pathname.startsWith(`${opts.route.path}/`)) ? opts.route : undefined);
	if (!active) return out;

	const base = active.path.split('?')[0];
	// Below the item (e.g. /companies/acme) it is an ancestor and links back;
	// on the item itself it is the current page and does not.
	const below = pathname.startsWith(`${base}/`);
	out.push({ label: active.name, href: below ? active.path : undefined });

	if (below) {
		const leaf = pathname.slice(base.length + 1).split('/')[0];
		const label = opts.leafLabel?.trim() || (leaf ? deslug(leaf) : '');
		if (label) out.push({ label });
	}
	return out;
}

/** Looks like a uuid or another opaque key rather than a readable slug. */
function isOpaqueId(seg: string): boolean {
	if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(seg)) return true;
	if (/^\d+$/.test(seg)) return true;
	// A long unbroken run of hex with no word breaks is an id, not a name.
	return seg.length >= 16 && !seg.includes('-') && /^[0-9a-z]+$/i.test(seg) && /\d/.test(seg);
}

/** `acme-sports` → `Acme Sports`. Returns '' for anything that is really an id. */
export function deslug(seg: string): string {
	const s = decodeURIComponent(seg).trim();
	if (!s || isOpaqueId(s)) return '';
	return s
		.replace(/[-_]+/g, ' ')
		.replace(/\s+/g, ' ')
		.trim()
		// Title case, but an existing all-caps word (an acronym someone typed
		// that way) is left alone rather than flattened to "Mls".
		.split(' ')
		.map((w) => (w.length > 1 && w === w.toUpperCase() ? w : w.charAt(0).toUpperCase() + w.slice(1)))
		.join(' ');
}
