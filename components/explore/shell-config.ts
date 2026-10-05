import { House, LayoutGrid, Files, Newspaper, ChartPie, CalendarDays, Building2, CalendarRange, Presentation, SlidersHorizontal } from 'lucide-react';
import type { ShellNavEntry, ShellNavItem } from '@/components/atlas';

/**
 * Explore's sidebar (the base product, a lighter Raise) — same model as Raise
 * and Scout: each section is also a page whose title is the heading and whose
 * items are the tabs (see ExploreSectionHeader).
 */
export const EXPLORE_HOME = '/explore';
export const EXPLORE_ACCOUNT = '/explore/account';
/** Explore's product colour (logo tag) — the Atlas pink used for Explore on the landing page. */
export const EXPLORE_COLOR = 'var(--a-pink)';

/** Public landing section describing Raise and Scout (reachable logged out). */
export const LANDING_RAISE = '/#how-to-join';
export const LANDING_SCOUT = '/#how-to-join';

export const EXPLORE_NAV: ShellNavEntry[] = [
	{ name: 'Home', icon: House, path: '/explore' },
	{ title: 'Intelligence', items: [
		{ name: 'Framework', icon: LayoutGrid, path: '/explore/intelligence/framework' },
		{ name: 'Reports', icon: Files, path: '/explore/intelligence/reports', placeholder: true },
		{ name: 'Newsletter', icon: Newspaper, path: '/explore/intelligence/newsletter' },
	] },
	{ title: 'Market', items: [
		{ name: 'Analysis', icon: ChartPie, path: '/explore/market/analysis' },
		{ name: 'Monthly Roundup', icon: CalendarDays, path: '/explore/market/roundup' },
		{ name: 'Companies', icon: Building2, path: '/explore/market/companies' },
		{ name: 'Events', icon: CalendarRange, path: '/explore/market/events' },
		{ name: 'Investors', icon: Presentation, path: '/explore/market/investors' },
	] },
];

/** Sub-line under each section's page title (copy from the Claude Design). */
export const EXPLORE_SECTION_SUBS: Record<string, string> = {
	Intelligence: 'Understand how sports tech is structured and read SportsTechX research.',
	Market: 'A current, navigable view of the sports-tech market.',
};

export const EXPLORE_BOTTOM_NAV: ShellNavItem[] = [
	{ name: 'Interests', icon: SlidersHorizontal, path: '/explore/interests', placeholder: true },
];

/** Profile URL for a company inside Explore. */
export const exploreCompanyHref = (idOrSlug: string) => `/explore/market/companies/${encodeURIComponent(idOrSlug)}`;
