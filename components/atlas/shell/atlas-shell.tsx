'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useState, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { MenuIcon } from '../brand/menu-icon';
import { PLACEHOLDER_LABEL } from '../patterns/placeholder-tag';
import { AtlasLogo, AtlasMark } from '../brand/atlas-logo';
import { FigmaIcon } from '../icons/figma-icons';
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
	/**
	 * The bar across the top of the content column (breadcrumbs, search, account).
	 * A slot rather than something built here: the navbar needs the route manifest
	 * and the signed-in profile, and this component is deliberately manifest-free —
	 * it only ever receives `ShellNavEntry[]`.
	 */
	topbar?: ReactNode;
	/** Rendered after the sidebar as a sibling (e.g. a floating assistant button). */
	overlay?: ReactNode;
	/** Extra sidebar content above the account footer (e.g. Explore's upgrade cards). Hidden when the rail is collapsed. */
	railExtra?: ReactNode;
	/**
	 * The rail's footer: avatar, name and log out. A slot for the same reason
	 * `topbar` is one — it needs the signed-in profile, and this component is
	 * deliberately manifest- and session-free.
	 */
	railAccount?: ReactNode;
	/** Force the rail collapsed (e.g. during Walk the Pitch, for room beside the coach panel) without touching the user's own saved preference. */
	forceCollapsed?: boolean;
	children: ReactNode;
}

export function AtlasShell({ product, productColor, homePath, nav, topbar, overlay, railExtra, railAccount, forceCollapsed, children }: AtlasShellProps) {
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const railKey = `stx:${product.toLowerCase()}-rail-collapsed`;
	const sectionsKey = `stx:${product.toLowerCase()}-nav-closed`;
	const storedCollapsed = useSyncExternalStore(subscribe, () => readStored(railKey) === '1', () => false);
	const collapsed = forceCollapsed || storedCollapsed;
	// Closed sections, stored as a JSON array of titles (default: all open).
	const closedRaw = useSyncExternalStore(subscribe, () => readStored(sectionsKey) ?? '[]', () => '[]');
	const closed = parseList(closedRaw);
	const toggleSection = (title: string) =>
		writeStored(sectionsKey, JSON.stringify(closed.includes(title) ? closed.filter((t) => t !== title) : [...closed, title]));
	// The mobile drawer, stored as the route it was opened on rather than a
	// boolean. Any navigation then closes it by definition — including from a
	// link inside `railExtra`, which a nav item's own onClick would have missed.
	// Resetting it from an effect instead is a cascading render, and React lints
	// it as one.
	const [openOn, setOpenOn] = useState<string | null>(null);
	const open = openOn === pathname;
	const setOpen = (v: boolean) => setOpenOn(v ? pathname : null);

	const allItems = nav.flatMap((e) => (isSection(e) ? e.items : [e]));
	const activePath = pickActive(allItems, homePath, pathname, searchParams);
	const isActive = (path: string) => path === activePath;

	// Collapsed, the labels are hidden, so the only thing identifying an icon
	// was the native `title` — slow to appear and unstyled. The rail and the
	// nav both clip their overflow (one hides the collapsed h-scrollbar, the
	// other is the scroll container), so the tooltip cannot live inside either
	// and is positioned against the viewport instead.
	const [tip, setTip] = useState<{ label: string; top: number } | null>(null);
	const tipProps = (label: string) => (collapsed ? {
		onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
			const r = e.currentTarget.getBoundingClientRect();
			setTip({ label, top: r.top + r.height / 2 });
		},
		onMouseLeave: () => setTip(null),
	} : {});

	const renderItem = (item: ShellNavItem) => {
		const cls = 'atlas-nav-item';
		if (item.soon) {
			return (
				<span key={item.path} className={`${cls} is-soon`} aria-disabled="true" {...tipProps(`${item.name} (soon)`)}>
					<span className="atlas-nav-ico"><FigmaIcon name={item.icon} /></span>
					<span className="atlas-nav-label">{item.name}</span>
					<span className="atlas-soon" aria-label="coming soon">Soon</span>
				</span>
			);
		}
		return (
			<Link key={item.path} href={item.path} className={`${cls} ${isActive(item.path) ? 'active' : ''}`} aria-current={isActive(item.path) ? 'page' : undefined} {...tipProps(item.name)} onClick={() => { setOpen(false); setTip(null); }}>
				<span className="atlas-nav-ico"><FigmaIcon name={item.icon} /></span>
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
					<span className="atlas-nav-caret"><FigmaIcon name="nav-caret" /></span>
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
					{/* Collapsed, the mark IS the expand control. The design put a bare
					    hamburger here, which left no sign of which product you were in.
					    Forced collapsed (Walk the Pitch) it's just the mark: expanding
					    would only be overridden straight back by `forceCollapsed`. */}
					{collapsed ? (
						forceCollapsed ? (
							<Link href={homePath} className="atlas-rail-mark" aria-label={homeLabel}>
								<span className="atlas-rail-mark__logo"><AtlasMark size={26} /></span>
							</Link>
						) : (
							<button type="button" className="atlas-rail-mark" aria-label="Expand sidebar" aria-expanded={false} onClick={() => writeStored(railKey, '0')}>
								<span className="atlas-rail-mark__logo"><AtlasMark size={26} /></span>
								<span className="atlas-rail-mark__menu"><MenuIcon /></span>
							</button>
						)
					) : (
						<Link href={homePath} className="atlas-brand" aria-label={homeLabel}><AtlasLogo height={24} product={product} productColor={productColor} /></Link>
					)}
					{!collapsed && (
						<button className="atlas-rail-toggle" aria-label="Collapse sidebar" aria-expanded title="Collapse sidebar" onClick={() => writeStored(railKey, '1')}><MenuIcon /></button>
					)}
					<button className="atlas-rail-close" aria-label="Close menu" onClick={() => setOpen(false)}><X size={18} strokeWidth={1.5} /></button>
				</div>
				<nav className="atlas-nav">{nav.map(renderEntry)}</nav>
				{railExtra && !collapsed && <div className="atlas-rail-extra">{railExtra}</div>}
				{/* Thesis Settings and Subscription used to sit here as nav items.
				    They are account settings, not places, so they moved into the
				    Account page's tabs and the footer is the account itself. */}
				{railAccount && <div className="atlas-rail-account">{railAccount}</div>}
			</aside>

			<div className="atlas-main">
				<header className="atlas-topbar">
					<Link href={homePath} aria-label={homeLabel} style={{ color: 'var(--a-ink)' }}><AtlasLogo height={26} product={product} productColor={productColor} /></Link>
					<button className="atlas-hamburger" aria-label="Open menu" aria-expanded={open} onClick={() => setOpen(true)}><MenuIcon /></button>
				</header>
				{topbar}
				<div className="atlas-content">{children}</div>
			</div>

			{collapsed && tip && (
				<div className="atlas-tip" style={{ top: tip.top }} role="tooltip">{tip.label}</div>
			)}

			{open && <div className="atlas-backdrop" onClick={() => setOpen(false)} aria-hidden="true" />}
			{overlay}
		</div>
	);
}

/** Up to two initials from a name, for the account badge. Used by the navbar's avatar. */
export function initialsOf(name: string | null | undefined): string {
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
