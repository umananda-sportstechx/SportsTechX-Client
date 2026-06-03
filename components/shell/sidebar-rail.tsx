'use client';

import { usePathname, useRouter } from 'next/navigation';
import {
	Home, Network, FileText, Mail, Building2, DollarSign, Shield,
	Wallet, Zap, CalendarDays, TrendingUp, CreditCard, Settings, LogOut,
	ChevronRight, Heart, BadgeCheck,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase/client';
import { useFeatureAccessContext } from '@/contexts/feature-access-context';

/**
 * SportsTechX rail navigation. Ported from ui_design/app/nav.jsx.
 *
 * Behavior:
 * - Two states: collapsed (64px) showing icons only with hover tooltips,
 *   expanded (220px) showing icons + labels.
 * - Active route gets the accent left-border indicator.
 * - Brand mark in the header doubles as the expand toggle on hover.
 *
 * The CSS classes (`.rail`, `.rail-item`, `.rail-section`, etc.) are defined
 * in `app/design-system.css` — kept there so the design system is updateable
 * in one place, not scattered through component files.
 */

interface NavItem {
	id: string;
	name: string;
	icon: LucideIcon;
	path: string;
	/** Feature-catalog slug used to compute the tier badge / locked state.
	 *  Omit for always-free items (dashboard, framework, events, etc.). */
	slug?: string;
}

interface NavGroup {
	label: string;
	items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
	{
		label: 'Core', items: [
			{ id: 'dashboard', name: 'Dashboard', icon: Home, path: '/dashboard' },
			{ id: 'framework', name: 'Framework', icon: Network, path: '/framework' },
			{ id: 'reports', name: 'Reports', icon: FileText, path: '/reports' },
			{ id: 'newsletter', name: 'Newsletter', icon: Mail, path: '/newsletter' },
			{ id: 'analytics', name: 'Analytics', icon: TrendingUp, path: '/analytics', slug: 'analytics_access' },
		]
	},
	{
		label: 'Data', items: [
			{ id: 'companies', name: 'Companies', icon: Building2, path: '/companies' },
			{ id: 'funding', name: 'Funding Tracker', icon: DollarSign, path: '/funding', slug: 'deals_full' },
			{ id: 'mna', name: 'M&A Tracker', icon: Shield, path: '/ma', slug: 'acquisitions_full' },
		]
	},
	{
		label: 'Eco', items: [
			{ id: 'investors', name: 'Investors', icon: Wallet, path: '/investors', slug: 'investors_full' },
			{ id: 'programs', name: 'Programs', icon: Zap, path: '/programs' },
			{ id: 'events', name: 'Events', icon: CalendarDays, path: '/events' },
		]
	},
	{
		// `lists` (My lists) is a client addition retained per the keep-behavior
		// rule — the prototype reaches lists via the "My Lists" button instead.
		label: 'Account', items: [
			{ id: 'getverified', name: 'Get Verified', icon: BadgeCheck, path: '/get-verified' },
			{ id: 'lists', name: 'My lists', icon: Heart, path: '/lists' },
			{ id: 'subscriptions', name: 'Subscriptions', icon: CreditCard, path: '/subscriptions' },
			{ id: 'settings', name: 'Settings', icon: Settings, path: '/settings' },
		]
	},
];

interface SidebarRailProps {
	expanded: boolean;
	onToggleExpand: () => void;
	/**
	 * Fired when the pointer enters / leaves the rail. Parent uses this to
	 * implement hover-to-expand on top of the sticky click state; the rail
	 * itself doesn't track hover.
	 */
	onHoverChange?: (hovering: boolean) => void;
}

export function SidebarRail({ expanded, onToggleExpand, onHoverChange }: SidebarRailProps) {
	const router = useRouter();
	const pathname = usePathname();
	const [signingOut, setSigningOut] = useState(false);
	// Server-driven tier matrix — drives the PRO/GROWTH badge + locked state on
	// gated nav items. `checkAccess` is a plain function (not a hook), safe to
	// call per item inside the render loop.
	const { checkAccess, isLoading: accessLoading } = useFeatureAccessContext();

	const handleNav = (path: string) => {
		router.push(path);
	};

	const handleLogout = async () => {
		if (signingOut) return;
		setSigningOut(true);
		try {
			const supabase = getSupabaseBrowser();
			await supabase.auth.signOut();
			router.push('/login');
		} catch {
			setSigningOut(false);
		}
	};

	return (
		<aside
			className="rail"
			onMouseEnter={() => onHoverChange?.(true)}
			onMouseLeave={() => onHoverChange?.(false)}
		>
			<div className="rail-logo">
				<button
					className="brand-mark"
					aria-label={expanded ? 'Collapse menu' : 'Expand menu'}
					onClick={onToggleExpand}
					title={expanded ? 'Collapse' : 'Expand'}
				>
					{/* Brand mark — angular X-shape SVG matching ui_design */}
					<svg width="24" height="24" viewBox="0 0 32 32" fill="none">
						<path d="M4 4 L20 4 L28 12 L28 28 L12 28 L4 20 Z" fill="currentColor" />
						<path
							d="M10 11 L21 11 L21 14 L13 14 L13 16 L21 16 L21 22 L10 22 L10 19 L18 19 L18 17 L10 17 Z"
							fill="var(--bg-1)"
						/>
					</svg>
					<span className="brand-word">
						SPORTS<span className="brand-x">TECH</span><b>X</b>
					</span>
				</button>
				<button className="rail-toggle" onClick={onToggleExpand} title="Collapse">
					<ChevronRight size={16} />
				</button>
			</div>

			<nav className="rail-nav">
				{NAV_GROUPS.map((group) => (
					<div key={group.label}>
						<div className="rail-section">{group.label}</div>
						{group.items.map((item) => {
							const Icon = item.icon;
							// Active when pathname exactly matches OR is a sub-route (e.g., /companies/abc).
							const isActive = pathname === item.path || pathname.startsWith(item.path + '/');
							// Tier badge: only when the matrix has loaded and the item is
							// locked for the current plan. Label = the tier that unlocks it.
							const access = item.slug && !accessLoading ? checkAccess(item.slug) : null;
							const locked = !!access?.isLocked;
							const tierBadge = locked && access?.requiredTier
								? access.requiredTier.toUpperCase()
								: null;
							return (
								<button
									key={item.id}
									className={`rail-item ${isActive ? 'active' : ''} ${locked ? 'locked' : ''}`}
									onClick={() => handleNav(item.path)}
								>
									<Icon size={18} />
									<span className="rail-label">{item.name}</span>
									{tierBadge && (
										<span className={`rail-tier rail-tier-${tierBadge}`}>{tierBadge}</span>
									)}
									<span className="rail-tip">
										{item.name}{tierBadge ? ` · ${tierBadge}` : ''}
									</span>
								</button>
							);
						})}
					</div>
				))}
			</nav>

			<div style={{ padding: 8, borderTop: '1px solid var(--border)' }}>
				<button
					className="rail-item"
					title="Logout"
					onClick={handleLogout}
					disabled={signingOut}
				>
					<LogOut size={18} />
					<span className="rail-label">Logout</span>
					<span className="rail-tip">Logout</span>
				</button>
			</div>
		</aside>
	);
}

export { NAV_GROUPS };
export type { NavItem, NavGroup };
