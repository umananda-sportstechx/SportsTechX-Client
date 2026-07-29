'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Home, FileText, Globe, Heart, Grid3x3, BookOpen, Settings, User, Menu, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Brand } from '@/components/ui/brand';
import './raise-shell.css';

/**
 * Atlas Raise founder workspace shell — clean sidebar + content (raise mock-ups).
 * Desktop: fixed 220px rail. Mobile (≤720px): a top bar with the logo (left) + a
 * hamburger (right); tapping it slides the rail in from the left as an overlay
 * drawer (with its own logo + close). Rendered by AppShell for `/raise` routes.
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
	const [open, setOpen] = useState(false);
	// Close the mobile drawer whenever the route changes (i.e. a nav item was tapped).
	useEffect(() => { setOpen(false); }, [pathname]);

	const isActive = (path: string) =>
		path === '/raise' ? pathname === '/raise' : pathname === path || pathname.startsWith(path + '/');

	const renderItem = (item: RaiseNavItem) => {
		const Icon = item.icon;
		return (
			<Link key={item.path} href={item.path} className={`raise-nav-item ${isActive(item.path) ? 'active' : ''}`} onClick={() => setOpen(false)}>
				<Icon size={18} />
				<span className="raise-label">{item.name}</span>
			</Link>
		);
	};

	return (
		<div className="atlas raise-shell">
			<aside className={`raise-rail ${open ? 'open' : ''}`}>
				<div className="raise-rail-head">
					<div className="raise-brand"><Brand variant="horizontal" height={34} /></div>
					<button className="raise-rail-close" aria-label="Close menu" onClick={() => setOpen(false)}><X size={20} /></button>
				</div>
				<nav className="raise-nav">{NAV.map(renderItem)}</nav>
				<nav className="raise-nav-bottom">{BOTTOM_NAV.map(renderItem)}</nav>
			</aside>

			<div className="raise-main">
				<header className="raise-topbar">
					<Brand variant="horizontal" height={32} />
					<button className="raise-hamburger" aria-label="Open menu" aria-expanded={open} onClick={() => setOpen(true)}><Menu size={22} /></button>
				</header>
				<div className="raise-content">{children}</div>
			</div>

			{open && <div className="raise-backdrop" onClick={() => setOpen(false)} aria-hidden="true" />}
		</div>
	);
}
