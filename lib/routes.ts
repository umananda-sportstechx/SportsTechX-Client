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
 * `/raise/investors/abc` inherits the gate from `/raise/investors`.
 */

import type { LucideIcon } from 'lucide-react';
import {
	House, LayoutGrid, Files, Newspaper, ChartPie, CalendarDays, Building2, CalendarRange,
	Presentation, SlidersHorizontal, FileCheck, Ticket, Sparkles, Radar, Target, TrendingUp,
	Bookmark, List, BookOpen, Settings, CreditCard, Layers, Star, BadgeCheck, Users,
	MessageSquare, Rocket, Wrench,
} from 'lucide-react';
import { access, type Tier, type TierReq } from './access.ts';

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
	icon: LucideIcon;
	/** Built to the design, no backend yet — shows a "Not connected" pill. */
	placeholder?: PerTier<boolean>;
	/** Supported by `pickActive`; no route uses it today. */
	soon?: boolean;
	isDefault?: boolean;
}

export const ROUTES: RouteDef[] = [
	// ── Shared: the free Explore base, open to every signed-in user ──────────
	{
		id: 'home', icon: House, name: 'Home',
		path: { explore: '/explore', raise: '/raise', scout: '/scout' },
	},
	{
		id: 'companies', icon: Building2, name: 'Companies',
		path: '/app/discover/companies',
	},
	{
		id: 'signals', icon: Radar, name: 'Signals',
		path: '/app/discover/signals',
	},
	{
		// One URL, two different domain objects: recommended investors for a
		// founder, recommended companies for an investor. Dispatched inside the
		// page — a user only ever holds one paid tier.
		id: 'recommended', icon: Sparkles, name: 'Recommended',
		path: '/app/discover/recommended', tier: ['raise', 'scout'],
		placeholder: { scout: true },
	},
	{
		// Three names for one screen.
		id: 'analytics', icon: ChartPie,
		name: { explore: 'Analysis', raise: 'Analytics', scout: 'Market' },
		path: '/app/intelligence/analytics',
	},
	{
		id: 'roundup', icon: CalendarDays, name: 'Monthly Roundup',
		path: '/app/intelligence/roundup',
	},
	{
		id: 'recently-funded', icon: TrendingUp, name: 'Recently Funded',
		path: '/app/intelligence/recently-funded',
	},
	{
		id: 'watchlists', icon: List, name: 'All watchlists',
		path: '/app/watchlists',
	},
	{
		id: 'framework', icon: LayoutGrid, name: 'Framework',
		path: '/app/resources/framework',
	},
	{
		id: 'reports', icon: Files, name: 'Reports',
		path: '/app/resources/reports',
	},
	{
		id: 'newsletter', icon: Newspaper, name: 'Newsletter',
		path: '/app/resources/newsletter',
	},
	{
		id: 'events', icon: CalendarRange, name: 'Events',
		path: '/app/resources/events',
	},
	{
		// Reached from the account badge, which AtlasShell renders separately.
		// Listed so the gate and `pickActive` know about it.
		id: 'account', icon: Settings, name: 'Account',
		path: { explore: '/explore/account', raise: '/raise/account', scout: '/scout/account' },
	},
	{ id: 'billing', icon: CreditCard, name: 'Subscription', path: '/billing' },
	{
		// Both paid products include this: a founder checks their own pitch, an
		// investor screens someone else's. Same backend and component, different
		// copy and a different name in each sidebar.
		id: 'deck', icon: FileCheck,
		name: { raise: 'Pitch Deck', scout: 'Deck Screener' },
		path: '/app/deck', tier: ['raise', 'scout'],
	},
	{ id: 'interests', icon: SlidersHorizontal, name: 'Interests', path: '/app/interests', tier: 'explore', placeholder: true },

	// ── Raise ───────────────────────────────────────────────────────────────
	{ id: 'investors', icon: Presentation, name: 'Investors', path: '/app/discover/investors', tier: 'raise' },
	{ id: 'programs', icon: Ticket, name: 'Programs', path: '/app/programs', tier: 'raise' },
	{ id: 'my-market', icon: Target, name: 'My Market', path: '/app/my-market', tier: 'raise' },
	{ id: 'pipeline', icon: Bookmark, name: 'Main watchlist', path: '/app/pipeline', tier: 'raise' },
	{ id: 'guide', icon: BookOpen, name: 'Fundraising Guide', path: '/app/resources/guide', tier: 'raise', placeholder: true },
	{ id: 'raise-settings', icon: Settings, name: 'Thesis Settings', path: '/app/settings', tier: 'raise' },
	// Gated, never listed.
	{ id: 'setup', icon: Wrench, name: 'Setup', path: '/app/setup', tier: 'raise' },
	{ id: 'chat', icon: MessageSquare, name: 'Chat', path: '/app/chat', tier: 'raise' },
	{ id: 'strategy', icon: Rocket, name: 'Strategy', path: '/app/strategy', tier: 'raise' },

	// ── Scout ───────────────────────────────────────────────────────────────
	{ id: 'deal-flow', icon: Layers, name: 'All', path: '/app/deal-flow', tier: 'scout', placeholder: true },
	{ id: 'deal-flow-featured', icon: Star, name: 'Featured', path: '/app/deal-flow/featured', tier: 'scout', placeholder: true },
	{ id: 'deal-flow-verified', icon: BadgeCheck, name: 'Verified Raises', path: '/app/deal-flow/verified', tier: 'scout', placeholder: true },
	{ id: 'deal-flow-circle', icon: Users, name: 'From the Circle', path: '/app/deal-flow/circle', tier: 'scout', placeholder: true },
	{ id: 'thesis', icon: Settings, name: 'Thesis Settings', path: '/app/thesis', tier: 'scout', placeholder: true },
];

export const ROUTE_BY_ID = new Map(ROUTES.map((r) => [r.id, r]));

/** A sidebar group. `title: null` renders its items at the top, ungrouped. */
export interface NavGroup {
	title: string | null;
	/** Bottom nav rather than the main list. */
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
		{ title: null, items: ['home'] },
		{ title: 'Intelligence', items: ['framework', 'reports', 'newsletter'] },
		{ title: 'Market', items: ['analytics', 'roundup', 'companies', 'events'] },
		{ title: null, bottom: true, items: ['interests'] },
	],
	raise: [
		{ title: null, items: ['home'] },
		{ title: 'Raise', items: ['deck', 'investors', 'programs'] },
		{ title: 'Discover', items: ['companies', 'recommended', 'signals'] },
		{ title: 'Intelligence', items: ['analytics', 'roundup', 'my-market', 'recently-funded'] },
		{ title: 'Watchlists', items: ['pipeline', 'watchlists'] },
		{ title: 'Resources', items: ['guide', 'framework', 'reports', 'events', 'newsletter'] },
		{ title: null, bottom: true, items: ['raise-settings', 'billing'] },
	],
	scout: [
		{ title: null, items: ['home'] },
		{ title: 'Discover', items: ['companies', 'recommended', 'signals'] },
		{ title: 'Intelligence', items: ['analytics', 'roundup', 'recently-funded'] },
		{ title: 'Watchlists', items: ['watchlists'] },
		{ title: 'Deal Flow', items: ['deal-flow', 'deal-flow-featured', 'deal-flow-verified', 'deal-flow-circle', 'deck'] },
		{ title: 'Resources', items: ['framework', 'reports', 'events', 'newsletter'] },
		{ title: null, bottom: true, items: ['thesis', 'billing'] },
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
	return p;
}

/** Profile URL for a company. Replaces the per-product `*CompanyHref` helpers. */
export const companyHref = (idOrSlug: string) => `${hrefOf('companies')}/${encodeURIComponent(idOrSlug)}`;

/** The route a product's logo and account badge point at. */
export const pathOf = (id: string, tier: Tier): string =>
	forTier(ROUTE_BY_ID.get(id)?.path, tier) ?? '/';

/**
 * The route a URL belongs to, by longest-prefix match — so
 * `/raise/investors/abc` resolves through `/raise/investors` and detail pages
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
