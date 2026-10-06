import {
	House, FileCheck, ChartPie, Presentation, List, Ticket, BookOpen, Settings, CreditCard,
	Building2, Sparkles, Radar, Target, CalendarDays, TrendingUp, Bookmark, LayoutGrid, Files, CalendarRange, Newspaper,
} from 'lucide-react';
import type { ShellNavEntry, ShellNavItem } from '@/components/atlas';

/**
 * Raise's sidebar — the only product-specific part of the shell. Each section
 * is also a page: its title is the page heading and its items are the page tabs
 * (see RaiseSectionHeader).
 * Items marked `placeholder` are built to the design without a backend yet
 * (sample data) and show a "Not connected" pill; drop it once wired up.
 * (`soon` — greyed, not clickable — is still supported but no longer used.)
 */
export const RAISE_HOME = '/raise';
export const RAISE_ACCOUNT = '/raise/account';

export const RAISE_NAV: ShellNavEntry[] = [
	{ name: 'Home', icon: House, path: '/raise' },
	{ title: 'Raise', items: [
		{ name: 'Pitch Deck', icon: FileCheck, path: '/raise/pitch' },
		{ name: 'Investors', icon: Presentation, path: '/raise/investors' },
		{ name: 'Programs', icon: Ticket, path: '/raise/programs' },
	] },
	{ title: 'Discover', items: [
		{ name: 'Companies', icon: Building2, path: '/raise/discover/companies' },
		{ name: 'Recommended', icon: Sparkles, path: '/raise/discover/recommended' },
		{ name: 'Signals', icon: Radar, path: '/raise/discover/signals' },
	] },
	{ title: 'Intelligence', items: [
		{ name: 'Analytics', icon: ChartPie, path: '/raise/intelligence/analytics' },
		{ name: 'Monthly Roundup', icon: CalendarDays, path: '/raise/intelligence/roundup' },
		{ name: 'My Market', icon: Target, path: '/raise/intelligence/my-market' },
		{ name: 'Recently Funded', icon: TrendingUp, path: '/raise/intelligence/recently-funded' },
	] },
	{ title: 'Watchlists', items: [
		// Formerly "Pipeline" (investor board). The user's company watchlists are inserted
		// between these two at runtime — see use-raise-nav.ts.
		{ name: 'Main watchlist', icon: Bookmark, path: '/raise/pipeline' },
		{ name: 'All watchlists', icon: List, path: '/raise/watchlists' },
	] },
	{ title: 'Resources', items: [
		{ name: 'Fundraising Guide', icon: BookOpen, path: '/raise/resources', placeholder: true },
		{ name: 'Framework', icon: LayoutGrid, path: '/raise/resources/framework' },
		{ name: 'Reports', icon: Files, path: '/raise/resources/reports' },
		{ name: 'Events', icon: CalendarRange, path: '/raise/events' },
		{ name: 'Newsletter', icon: Newspaper, path: '/raise/resources/newsletter' },
	] },
];

/** Sub-line under each section's page title (the section title is the page heading). */
export const RAISE_SECTION_SUBS: Record<string, string> = {
	Raise: 'Your fundraise: pitch deck, investors and programs.',
	Discover: 'Companies and investors worth your attention.',
	Intelligence: 'A current, navigable view of the sports-tech market.',
	Watchlists: 'The investors you are tracking, stage by stage.',
	Resources: 'Understand how sports tech is structured and read SportsTechX research.',
};

export const RAISE_BOTTOM_NAV: ShellNavItem[] = [
	{ name: 'Thesis Settings', icon: Settings, path: '/raise/settings' },
	{ name: 'Subscription', icon: CreditCard, path: '/billing' },
];
