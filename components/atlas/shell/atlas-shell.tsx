'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useState, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import { X, ChevronUp } from 'lucide-react';
import { MenuIcon } from '../brand/menu-icon';
import { PLACEHOLDER_LABEL } from '../patterns/placeholder-tag';
import { AtlasLogo } from '../brand/atlas-logo';
import { ThemeToggle } from './theme-toggle';
import { isSection, pickActive, type ShellNavEntry, type ShellNavItem } from './nav';
import './atlas-shell.css';

/**
 * AtlasShell — the product-agnostic app frame (Atlas Product UX v3 "Side Bar"):
 * sidebar with the Atlas wordmark + product tag, main nav, bottom nav, theme
 * toggle and account badge; collapsible to an icon rail on desktop; top bar +
 * slide-in drawer on mobile (≤720px). Each product (Raise, Scout, Explore…)
 * renders it with its own config — see components/raise/shell-config.ts.
 *
 * `nav` mixes plain items and collapsible sections (Figma "Menu Section Title /
 * Toggle"). Every item shows its icon + label (icon only in the collapsed rail).
 * An item with `soon` renders greyed with a SOON pill and no link.
 * Item paths may carry a query (e.g. `/app/analytics?tab=roundup`) to deep-link a
 * tab; `isDefault` marks the item that's active when that query key is absent.
 */

export interface AtlasShellProps {
	/** Product tag shown on the wordmark, e.g. "Raise". */
	product: string;
	/** Colour of the product tag (default Raise blue). */
	productColor?: string;
	/** Where the logo links to (the product home). */
	homePath: string;
	nav: ShellNavEntry[];
	bottomNav: ShellNavItem[];
	accountPath: string;
	/** Name used for the account initials badge. */
	accountName?: string | null;
	/** Rendered after the sidebar as a sibling (e.g. a floating assistant button). */
	overlay?: ReactNode;
	/** Extra sidebar content above the bottom nav (e.g. Explore's upgrade cards). Hidden when the rail is collapsed. */
	railExtra?: ReactNode;
	children: ReactNode;
}

export function AtlasShell({ product, productColor, homePath, nav, bottomNav, accountPath, accountName, overlay, railExtra, children }: AtlasShellProps) {
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const railKey = `stx:${product.toLowerCase()}-rail-collapsed`;
	const sectionsKey = `stx:${product.toLowerCase()}-nav-closed`;
	const collapsed = useSyncExternalStore(subscribe, () => readStored(railKey) === '1', () => false);
	// Closed sections, stored as a JSON array of titles (default: all open).
	const closedRaw = useSyncExternalStore(subscribe, () => readStored(sectionsKey) ?? '[]', () => '[]');
	const closed = parseList(closedRaw);
	const toggleSection = (title: string) =>
		writeStored(sectionsKey, JSON.stringify(closed.includes(title) ? closed.filter((t) => t !== title) : [...closed, title]));
	const [open, setOpen] = useState(false);
	// Close the mobile drawer whenever the route changes (i.e. a nav item was tapped).
	useEffect(() => { setOpen(false); }, [pathname]);

	const allItems = [...nav.flatMap((e) => (isSection(e) ? e.items : [e])), ...bottomNav];
	const activePath = pickActive(allItems, homePath, pathname, searchParams);
	const isActive = (path: string) => path === activePath;

	const renderItem = (item: ShellNavItem) => {
		const Icon = item.icon;
		const cls = 'atlas-nav-item';
		if (item.soon) {
			return (
				<span key={item.path} className={`${cls} is-soon`} aria-disabled="true" title={collapsed ? `${item.name} (soon)` : undefined}>
					<Icon size={17} strokeWidth={1.25} />
					<span className="atlas-nav-label">{item.name}</span>
					<span className="atlas-soon" aria-label="coming soon">Soon</span>
				</span>
			);
		}
		return (
			<Link key={item.path} href={item.path} className={`${cls} ${isActive(item.path) ? 'active' : ''}`} aria-current={isActive(item.path) ? 'page' : undefined} title={collapsed ? item.name : undefined} onClick={() => setOpen(false)}>
				<Icon size={17} strokeWidth={1.25} />
				<span className="atlas-nav-label">{item.name}</span>
				{item.placeholder && <span className="atlas-soon" title={PLACEHOLDER_LABEL}>Not connected</span>}
			</Link>
		);
	};
	const renderEntry = (e: ShellNavEntry) => {
		if (!isSection(e)) return renderItem(e);
		// The section holding the current page always stays open.
		const holdsActive = e.items.some((i) => i.path === activePath);
		const isOpen = holdsActive || !closed.includes(e.title);
		const id = `nav-sec-${e.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
		return (
			<div key={e.title} className={`atlas-nav-section${isOpen ? '' : ' is-closed'}`}>
				<button type="button" className="atlas-nav-section__head" aria-expanded={isOpen} aria-controls={id} onClick={() => toggleSection(e.title)} disabled={holdsActive}>
					<span>{e.title}</span>
					<ChevronUp size={14} strokeWidth={1.5} aria-hidden="true" />
				</button>
				<div id={id} className="atlas-nav-section__items">{e.items.map((i) => renderItem(i))}</div>
			</div>
		);
	};
	const homeLabel = `Atlas ${product} home`;

	return (
		<div className={`atlas atlas-shell${collapsed ? ' is-collapsed' : ''}`}>
			<aside className={`atlas-rail ${open ? 'open' : ''}`}>
				<div className="atlas-rail-head">
					<Link href={homePath} className="atlas-brand" aria-label={homeLabel}><AtlasLogo height={31} product={product} productColor={productColor} /></Link>
					<button className="atlas-rail-toggle" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} aria-expanded={!collapsed} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} onClick={() => writeStored(railKey, collapsed ? '0' : '1')}><MenuIcon /></button>
					<button className="atlas-rail-close" aria-label="Close menu" onClick={() => setOpen(false)}><X size={18} strokeWidth={1.5} /></button>
				</div>
				<nav className="atlas-nav">{nav.map(renderEntry)}</nav>
				{railExtra && !collapsed && <div className="atlas-rail-extra">{railExtra}</div>}
				<nav className="atlas-nav-bottom">{bottomNav.map(renderItem)}<ThemeToggle collapsed={collapsed} /></nav>
				<Link href={accountPath} className={`atlas-account ${isActive(accountPath) ? 'active' : ''}`} title={collapsed ? 'Account' : undefined} onClick={() => setOpen(false)}>
					<span className="atlas-account-badge" aria-hidden="true">{initialsOf(accountName)}</span>
					<span className="atlas-nav-label">Account</span>
				</Link>
			</aside>

			<div className="atlas-main">
				<header className="atlas-topbar">
					<Link href={homePath} aria-label={homeLabel} style={{ color: 'var(--a-ink)' }}><AtlasLogo height={26} product={product} productColor={productColor} /></Link>
					<div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
						<ThemeToggle compact />
						<button className="atlas-hamburger" aria-label="Open menu" aria-expanded={open} onClick={() => setOpen(true)}><MenuIcon /></button>
					</div>
				</header>
				<div className="atlas-content">{children}</div>
			</div>

			{open && <div className="atlas-backdrop" onClick={() => setOpen(false)} aria-hidden="true" />}
			{overlay}
		</div>
	);
}

/** Up to two initials from a name, for the account badge. */
function initialsOf(name: string | null | undefined): string {
	const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
	if (parts.length === 0) return '·';
	return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

function parseList(raw: string): string[] {
	try { const v: unknown = JSON.parse(raw); return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []; } catch { return []; }
}

// Per-browser UI prefs (rail collapsed, closed nav sections). Read via
// useSyncExternalStore so SSR renders the defaults and the client adopts saved values.
const listeners = new Set<() => void>();
function readStored(key: string): string | null {
	try { return localStorage.getItem(key); } catch { return null; }
}
function writeStored(key: string, v: string) {
	try { localStorage.setItem(key, v); } catch { /* storage unavailable — change is not persisted */ }
	listeners.forEach((l) => l());
}
function subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; }
