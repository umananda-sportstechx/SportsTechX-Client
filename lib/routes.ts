/**
 * Every navigable route in one place, and how each product arranges them.
 *
 * This replaces three hand-maintained nav arrays (EXPLORE_NAV / RAISE_NAV /
 * SCOUT_NAV) that between them listed the same screens at three different URLs,
 * in different sections, sometimes under different labels. Keeping three lists
 * in sync by hand is what let them drift.
 *
 * ## Two tables, because they answer different questions
 *
 * `ROUTES` says **what a route is** — its URL, which product owns it, its label
 * and icon. Each fact lives once, so a path or a flag cannot disagree between
 * products any more.
 *
 * `NAV_LAYOUT` says **how one product arranges them** — section titles and the
 * order of items inside them. That genuinely is per-product design (Raise lists
 * Companies under "Discover", Explore under "Market") and is not derivable from
 * anything, so it stays explicit. It references routes by id, so it carries no
 * paths and cannot drift from `ROUTES`.
 *
 * ## Per-tier values
 *
 * `path`, `name` and `placeholder` accept either one value or a per-tier map.
 * All three really do vary:
 *
 *   - `path`    one screen, three URLs — temporary, collapses to a single
 *               string when the routes are consolidated
 *   - `name`    the market-analytics screen is "Analysis" in Explore,
 *               "Analytics" in Raise and "Market" in Scout
 *   - `placeholder`  Recommended has a backend in Raise but not in Scout
 *
 * Routes listed in `ROUTES` but in no `NAV_LAYOUT` are real pages that are
 * gated but never listed — detail pages, wizards, the chat. A route's tier is
 * resolved for an arbitrary URL by longest-prefix match, so
 * `/app/investors/abc` inherits the gate from `/app/investors`.
 */

import { access, type Tier, type TierReq } from './access.ts';
import { previewBasePath } from './preview-mode.ts';

/** One value, or a different value per tier. */
export type PerTier<T> = T | Partial<Record<Tier, T>>;

const isMap = <T,>(v: PerTier<T>): v is Partial<Record<Tier, T>> =>
	typeof v === 'object' && v !== null;

/** Resolve a possibly-per-tier value. `undefined` = not applicable to this tier. */
export function forTier<T>(value: PerTier<T> | undefined, tier: Tier): T | undefined {
	if (value === undefined) return undefined;
	return isMap<T>(value) ? value[tier] : value;
}

export interface RouteDef {
	/** Stable id. Referenced by NAV_LAYOUT, and survives the URL change. */
	id: string;
	/** Today: one URL per tier. After consolidation: a single string. */
	path: PerTier<string>;
	/**
	 * Which product owns it, as one tier or a list of them.
	 *
	 * Mind the asymmetry: **omitted means "everyone"** (the free Explore base),
	 * while `'explore'` means **"Explore only"** — a screen that makes no sense
	 * for a paid profile, so it 404s for Raise and Scout rather than upselling.
	 * `interests` is the only route that wants that.
	 */
	tier?: TierReq;
	name: PerTier<string>;
	/** A Figma icon name from components/atlas/icons/figma-icons.tsx. */
	icon: string;
	/** Built to the design, no backend yet — shows a "Not connected" pill. */
	placeholder?: PerTier<boolean>;
	/** Supported by `pickActive`; no route uses it today. */
	soon?: boolean;
	isDefault?: boolean;
}

export const ROUTES: RouteDef[] = [
	// ── Shared: the free Explore base, open to every signed-in user ──────────
	{
		id: 'home', icon: 'nav-home', name: 'Home',
		path: '/home',
	},
	{
		id: 'companies', icon: 'nav-companies', name: 'Companies',
		path: '/companies',
	},
	{
		// Not an Explore screen: the design lists neither this nor Recently
		// Funded for Explore, and leaving them ungated rendered them with no
		// heading and no tab strip, because NavSectionHeader can only find a
		// section the viewer's sidebar actually has.
		id: 'signals', icon: 'nav-signals', name: 'Signals',
		path: '/signals', tier: ['raise', 'scout'],
	},
	{
		// One URL, two different domain objects: recommended investors for a
		// founder, recommended companies for an investor. Dispatched inside the
		// page — a user only ever holds one paid tier.
		id: 'recommended', icon: 'nav-recommended', name: 'Recommended',
		path: '/recommended', tier: ['raise', 'scout'],
	},
	{
		// Three names for one screen.
		id: 'analytics', icon: 'nav-analysis',
		name: { explore: 'Analysis', raise: 'Analytics', scout: 'Market' },
		path: '/analytics',
	},
	{
		id: 'roundup', icon: 'nav-roundup', name: 'Monthly Roundup',
		path: '/roundup',
	},
	{
		id: 'recently-funded', icon: 'nav-funded', name: 'Recently Funded',
		path: '/recently-funded', tier: ['raise', 'scout'],
	},
	{
		id: 'watchlists', icon: 'nav-list', name: 'All watchlists',
		path: '/watchlists',
	},
	{
		id: 'framework', icon: 'nav-framework', name: 'Framework',
		path: '/framework',
	},
	{
		id: 'reports', icon: 'nav-reports', name: 'Reports',
		path: '/reports',
	},
	{
		id: 'newsletter', icon: 'nav-newsletter', name: 'Newsletter',
		path: '/newsletter',
	},
	{
		id: 'events', icon: 'nav-events', name: 'Events',
		path: '/events',
	},
	{
		// Reached from the account badge, which AtlasShell renders separately.
		// Listed so the gate and `pickActive` know about it.
		id: 'account', icon: 'nav-thesis', name: 'Account',
		path: '/account',
	},
	{ id: 'billing', icon: 'nav-subscription', name: 'Subscription', path: '/billing' },
	// Deliberately untiered. Claiming your company or fund is how the
	// directory stays accurate, so a free user must be able to do it — the
	// API never gated it and the UI used to have no door at all.
	{ id: 'verify', icon: 'nav-onboarding', name: 'Get verified', path: '/verify' },
	// Reachable from the sidebar upgrade cards, the tier gate and billing, but
	// never listed in a sidebar — it is a destination, not a section.
	{ id: 'plans', icon: 'nav-subscription', name: 'Plans', path: '/plans' },
	{
		// Both paid products include this: a founder checks their own pitch, an
		// investor screens someone else's. Same backend and component, different
		// copy and a different name in each sidebar.
		// Explore is included because the feature is bounded by credits, not by
		// tier: the welcome grant pays for about four analyses. It used to resolve
		// to `upsell` here while the service refused base-tier callers outright,
		// so a free user got a sales page for something their credits covered.
		id: 'deck', icon: 'nav-screener',
		name: { explore: 'Pitch Deck', raise: 'Pitch Deck', scout: 'Deck Screener' },
		// The Deck Screener is live now: Scout runs the same engine in investor
		// mode (snapshot, thesis fit, red flags, diligence questions). It carried
		// a `placeholder: { scout: true }` "Not connected" flag while that was
		// still a founder critique; the flag is gone with the real feature.
		path: '/deck', tier: ['explore', 'raise', 'scout'],
	},
	{ id: 'interests', icon: 'nav-interests', name: 'Interests', path: '/interests', tier: 'explore' },

	// ── Raise ───────────────────────────────────────────────────────────────
	{ id: 'investors', icon: 'nav-circle', name: 'Investors', path: '/investors', tier: 'raise' },
	{ id: 'programs', icon: 'nav-dealflow', name: 'Programs', path: '/programs', tier: 'raise' },
	{ id: 'my-market', icon: 'nav-analysis', name: 'My Market', path: '/my-market', tier: 'raise' },
	{ id: 'pipeline', icon: 'nav-list', name: 'Main watchlist', path: '/pipeline', tier: 'raise' },
	{ id: 'raise-settings', icon: 'nav-thesis', name: 'Thesis Settings', path: '/settings', tier: 'raise' },
	// No tier: every plan gets the assistant, bounded by credits rather than by a
	// locked door (see chat.controller.ts). Still unlisted in NAV_LAYOUT — it is
	// reached from the home composer and the FAB.
	{ id: 'chat', icon: 'nav-watchlist', name: 'Chat', path: '/chat' },
	{ id: 'strategy', icon: 'nav-onboarding', name: 'Strategy', path: '/strategy', tier: 'raise' },

	// ── Scout ───────────────────────────────────────────────────────────────
	{ id: 'deal-flow', icon: 'nav-dealflow', name: 'All', path: '/deal-flow', tier: 'scout' },
	{ id: 'deal-flow-featured', icon: 'nav-recommended', name: 'Featured', path: '/deal-flow/featured', tier: 'scout' },
	{ id: 'deal-flow-verified', icon: 'nav-dealflow', name: 'Verified Raises', path: '/deal-flow/verified', tier: 'scout' },
	{ id: 'deal-flow-circle', icon: 'nav-circle', name: 'From the Circle', path: '/deal-flow/circle', tier: 'scout' },
	{ id: 'thesis', icon: 'nav-thesis', name: 'Thesis Settings', path: '/thesis', tier: 'scout' },
];

export const ROUTE_BY_ID = new Map(ROUTES.map((r) => [r.id, r]));

/** A sidebar group. `title: null` renders its items at the top, ungrouped. */
export interface NavGroup {
	title: string | null;
	/** Bottom nav rather than the main list. */
	/**
	 * Pinned to the foot of the rail. No group uses it any more: Thesis
	 * Settings and Subscription moved into the Account page's tabs, and the
	 * rail's footer is the account block. Kept because `nav.check.ts` asserts
	 * the foot stays empty, which is the thing worth guarding.
	 */
	bottom?: boolean;
	/** Route ids, in render order. */
	items: string[];
}

/**
 * Each product's sidebar, verbatim from the three configs it replaces. Order
 * matters and is design, not derivable — see the file header.
 */
export const NAV_LAYOUT: Record<Tier, NavGroup[]> = {
	explore: [
		// Interests sits with Home, per the Figma Side Nav (31:15195). The HTML
		// mockup puts it in the bottom group with Account; Figma is the newer
		// file and the one named as the UI source, so it wins.
		{ title: null, items: ['home', 'interests', 'deck'] },
		{ title: 'Intelligence', items: ['framework', 'reports', 'newsletter'] },
		// Investors is a Raise feature listed in Explore's sidebar on purpose —
		// the design surfaces it unlocked-looking and lets the page do the
		// selling (ATLAS Base.dc.html `navMarket`, which has a lock flag
		// available and deliberately does not pass it). `buildNav` keeps
		// upsellable items; only `hidden` ones are dropped.
		{ title: 'Market', items: ['analytics', 'roundup', 'companies', 'events', 'investors'] },
	],
	raise: [
		{ title: null, items: ['home'] },
		{ title: 'Raise', items: ['deck', 'investors', 'programs'] },
		{ title: 'Discover', items: ['companies', 'recommended', 'signals'] },
		{ title: 'Intelligence', items: ['analytics', 'roundup', 'my-market', 'recently-funded'] },
		{ title: 'Watchlists', items: ['pipeline', 'watchlists'] },
		{ title: 'Resources', items: ['framework', 'reports', 'events', 'newsletter'] },
	],
	scout: [
		{ title: null, items: ['home'] },
		{ title: 'Discover', items: ['companies', 'recommended', 'signals'] },
		{ title: 'Intelligence', items: ['analytics', 'roundup', 'recently-funded'] },
		{ title: 'Watchlists', items: ['watchlists'] },
		{ title: 'Deal Flow', items: ['deal-flow', 'deal-flow-featured', 'deal-flow-verified', 'deal-flow-circle', 'deck'] },
		{ title: 'Resources', items: ['framework', 'reports', 'events', 'newsletter'] },
	],
};

/** Sub-line under each section heading. Per tier: the same heading carries
 *  different copy in different products. */
export const SECTION_SUBS: Record<Tier, Record<string, string>> = {
	explore: {
		Intelligence: 'Understand how sports tech is structured and read SportsTechX research.',
		Market: 'A current, navigable view of the sports-tech market.',
	},
	raise: {
		Raise: 'Your fundraise: pitch deck, investors and programs.',
		Discover: 'Companies and investors worth your attention.',
		Intelligence: 'A current, navigable view of the sports-tech market.',
		Watchlists: 'The investors you are tracking, stage by stage.',
		Resources: 'Understand how sports tech is structured and read SportsTechX research.',
	},
	scout: {
		Discover: 'Find companies worth knowing.',
		Intelligence: 'Understand what’s happening across the sports-tech market.',
		Watchlists: 'Track companies you care about.',
		'Deal Flow': 'Companies actively raising and accessible through the SportsTechX ecosystem.',
		Resources: 'Understand how sports tech is structured and read SportsTechX research.',
	},
};

/**
 * Prefixes a canonical path for the pre-signup `/preview/[product]/*` tour
 * (app/preview/, lib/preview-mode.ts) so every link generated while it's
 * running — sidebar nav, in-page links, breadcrumbs — stays inside the
 * preview tree instead of bouncing an anonymous visitor to /login. A no-op
 * (returns `p` unchanged) everywhere else, including the entire real app.
 */
const withPreview = (p: string): string => {
	const base = previewBasePath();
	return base ? `${base}${p}` : p;
};

/**
 * A route's canonical path.
 *
 * Throws while that route still carries per-tier paths, which is the guard an
 * incremental migration wants: during the flip half the manifest is still a
 * map, and a component reaching for a path that has not moved yet should fail
 * loudly rather than render a dead link.
 */
export function hrefOf(id: string): string {
	const p = ROUTE_BY_ID.get(id)?.path;
	if (typeof p !== 'string') throw new Error(`route '${id}' still has per-tier paths`);
	return withPreview(p);
}

/**
 * `hrefOf`, deliberately NOT preview-aware — for the one caller that must
 * never be: lib/sandbox/tours/*.ts, which calls this at module scope to build
 * each TourStep's `path`/pattern once, the first time the module loads. That
 * first load always happens while already inside `/preview/<product>/*` (the
 * coach only ever mounts there or in the real signed-in app), so a preview-
 * aware `hrefOf('home')` bakes `/preview/raise/home` into the step forever —
 * then the coach's own navigation effect prefixes it a second time on every
 * push, landing on `/preview/raise/preview/raise/home`, a 404. The coach
 * (components/features/walkthrough/walkthrough-coach.tsx) already strips and
 * re-adds the prefix itself at render time; it needs the canonical path here,
 * not a prefix baked in at the wrong moment.
 */
export function canonicalHrefOf(id: string): string {
	const p = ROUTE_BY_ID.get(id)?.path;
	if (typeof p !== 'string') throw new Error(`route '${id}' still has per-tier paths`);
	return p;
}

/** Profile URL for a company. Replaces the per-product `*CompanyHref` helpers. */
export const companyHref = (idOrSlug: string) => `${hrefOf('companies')}/${encodeURIComponent(idOrSlug)}`;

/** The route a product's logo and account badge point at. */
export const pathOf = (id: string, tier: Tier): string =>
	withPreview(forTier(ROUTE_BY_ID.get(id)?.path, tier) ?? '/');

/**
 * The route a URL belongs to, by longest-prefix match — so
 * `/app/investors/abc` resolves through `/app/investors` and detail pages
 * inherit their parent's gate without needing their own entry.
 */
export function routeForPath(pathname: string, tier: Tier): RouteDef | undefined {
	let best: RouteDef | undefined;
	let bestLen = -1;
	for (const r of ROUTES) {
		const p = forTier(r.path, tier);
		if (!p) continue;
		if ((pathname === p || pathname.startsWith(p + '/')) && p.length > bestLen) {
			best = r;
			bestLen = p.length;
		}
	}
	return best;
}

/** The tier(s) that own a URL. Undefined means the free base. */
export const tierForPath = (pathname: string, tier: Tier): TierReq | undefined =>
	routeForPath(pathname, tier)?.tier;

/** Can this viewer open this URL? */
export function accessForPath(pathname: string, tier: Tier, isAdmin: boolean) {
	return access(tierForPath(pathname, tier), tier, isAdmin);
}
