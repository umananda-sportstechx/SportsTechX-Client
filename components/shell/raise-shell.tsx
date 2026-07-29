'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, FileText, Globe, Heart, Grid3x3, BookOpen, Settings, User } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Brand } from '@/components/ui/brand';
import './raise-shell.css';

/**
 * Atlas Raise founder workspace shell — the clean sidebar + content layout from
 * the raise mock-ups (no topbar / ticker / AI panel). Rendered by AppShell in
 * place of the standard chrome for `/raise` routes. The `.atlas-raise` scope
 * on the wrapper re-colours the design-system tokens (see raise-shell.css).
 */

interface RaiseNavItem { name: string; icon: LucideIcon; path: string }

// Order follows the mock-ups: Home · Pitch deck · Market · Investors · Pipeline · Resources.
const NAV: RaiseNavItem[] = [
	{ name: 'Home', icon: Home, path: '/raise' },
	{ name: 'Pitch deck', icon: FileText, path: '/raise/pitch' },
	{ name: 'Market', icon: Globe, path: '/raise/market' },
	{ name: 'Investors', icon: Heart, path: '/raise/investors' },
	{ name: 'Pipeline', icon: Grid3x3, path: '/raise/pipeline' },
	{ name: 'Resources', icon: BookOpen, path: '/raise/resources' },
];

const BOTTOM_NAV: RaiseNavItem[] = [
	{ name: 'Raise settings', icon: Settings, path: '/raise/settings' },
	{ name: 'Account', icon: User, path: '/raise/account' },
];

export function RaiseShell({ children }: { children: React.ReactNode }) {
	const pathname = usePathname();
	const isActive = (path: string) =>
		path === '/raise' ? pathname === '/raise' : pathname === path || pathname.startsWith(path + '/');

	const renderItem = (item: RaiseNavItem) => {
		const Icon = item.icon;
		return (
			<Link key={item.path} href={item.path} className={`raise-nav-item ${isActive(item.path) ? 'active' : ''}`}>
				<Icon size={18} />
				<span className="raise-label">{item.name}</span>
			</Link>
		);
	};

	return (
		// `.atlas` supplies the kit tokens (atlas.css) for the shell + all founder pages.
		<div className="atlas raise-shell">
			<aside className="raise-rail">
				<div className="raise-brand">
					<Brand variant="horizontal" height={24} />
				</div>
				<nav className="raise-nav">{NAV.map(renderItem)}</nav>
				<nav className="raise-nav-bottom">{BOTTOM_NAV.map(renderItem)}</nav>
			</aside>
			<div className="raise-content">{children}</div>
		</div>
	);
}
