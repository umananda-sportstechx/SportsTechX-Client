import {
	House, Building2, Sparkles, Radar, ChartPie, CalendarDays, TrendingUp, List, Layers, Star, BadgeCheck, Users,
	FileSearch, LayoutGrid, Files, CalendarRange, Newspaper, Settings, CreditCard,
} from 'lucide-react';
import type { ShellNavEntry, ShellNavItem } from '@/components/atlas';

/**
 * Scout's sidebar (investor workspace) — same model as Raise: each section is
 * also a page whose title is the heading and whose items are the tabs (see
 * ScoutSectionHeader). The user's company watchlists are inserted under
 * Watchlists at runtime (use-scout-nav.ts).
 */
export const SCOUT_HOME = '/scout';
export const SCOUT_ACCOUNT = '/scout/account';
/** Scout's product colour (logo tag), from the Claude Design. */
export const SCOUT_COLOR = '#0FB86A';

export const SCOUT_NAV: ShellNavEntry[] = [
	{ name: 'Home', icon: House, path: '/scout' },
	{ title: 'Discover', items: [
		{ name: 'Companies', icon: Building2, path: '/scout/discover/companies' },
		{ name: 'Recommended', icon: Sparkles, path: '/scout/discover/recommended', placeholder: true },
		{ name: 'Signals', icon: Radar, path: '/scout/discover/signals', placeholder: true },
	] },
	{ title: 'Intelligence', items: [
		{ name: 'Market', icon: ChartPie, path: '/scout/intelligence/market' },
		{ name: 'Monthly Roundup', icon: CalendarDays, path: '/scout/intelligence/roundup' },
		{ name: 'Recently Funded', icon: TrendingUp, path: '/scout/intelligence/recently-funded' },
	] },
	{ title: 'Watchlists', items: [
		{ name: 'All watchlists', icon: List, path: '/scout/watchlists' },
	] },
	{ title: 'Deal Flow', items: [
		{ name: 'All', icon: Layers, path: '/scout/deal-flow', placeholder: true },
		{ name: 'Featured', icon: Star, path: '/scout/deal-flow/featured', placeholder: true },
		{ name: 'Verified Raises', icon: BadgeCheck, path: '/scout/deal-flow/verified', placeholder: true },
		{ name: 'From the Circle', icon: Users, path: '/scout/deal-flow/circle', placeholder: true },
		{ name: 'Deck Screener', icon: FileSearch, path: '/scout/deal-flow/screener' },
	] },
	{ title: 'Resources', items: [
		{ name: 'Framework', icon: LayoutGrid, path: '/scout/resources/framework' },
		{ name: 'Reports', icon: Files, path: '/scout/resources/reports' },
		{ name: 'Events', icon: CalendarRange, path: '/scout/resources/events' },
		{ name: 'Newsletter', icon: Newspaper, path: '/scout/resources/newsletter' },
	] },
];

/** Sub-line under each section's page title (copy from the Claude Design). */
export const SCOUT_SECTION_SUBS: Record<string, string> = {
	Discover: 'Find companies worth knowing.',
	Intelligence: 'Understand what’s happening across the sports-tech market.',
	Watchlists: 'Track companies you care about.',
	'Deal Flow': 'Companies actively raising and accessible through the SportsTechX ecosystem.',
	Resources: 'Understand how sports tech is structured and read SportsTechX research.',
};

export const SCOUT_BOTTOM_NAV: ShellNavItem[] = [
	{ name: 'Thesis Settings', icon: Settings, path: '/scout/thesis', placeholder: true },
	{ name: 'Subscription', icon: CreditCard, path: '/billing' },
];

/** Profile URL for a company inside Scout. */
export const scoutCompanyHref = (idOrSlug: string) => `/scout/discover/companies/${encodeURIComponent(idOrSlug)}`;
