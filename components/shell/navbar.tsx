'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useCallback, useMemo, useRef, useState } from 'react';
import useSWR from 'swr';
import { ChevronRight, LogOut, Search, Settings, ShieldCheck, CreditCard } from 'lucide-react';
import { cx, menuEdgeRef, useDismiss } from '@/components/atlas';
import { crumbsFor, type Crumb } from './breadcrumbs';
import { initialsOf } from '@/components/atlas/shell/atlas-shell';
import { ThemeToggle } from '@/components/atlas/shell/theme-toggle';
import { VerifyButton } from '@/components/features/verify/verify-cta';
import { NotificationBell } from './notification-bell';
import { CommandPalette, useCommandShortcut } from './command-palette';
import { useNav } from '@/hooks/use-nav';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useLogout } from '@/hooks/use-logout';
import { forTier, hrefOf, routeForPath } from '@/lib/routes';
import { qk } from '@/lib/query-keys';
import type { ConversationListItem } from '@/components/chat/chat-core';
import type { Tier } from '@/lib/access';
import './navbar.css';

/**
 * The bar across the top of every authenticated page: breadcrumbs and search on
 * the left, Get Verified, notifications and the account menu on the right.
 *
 * Rendered via AtlasShell's `topbar` slot rather than inside AtlasShell, which
 * is deliberately manifest-free — breadcrumbs need `lib/routes` and the account
 * menu needs the signed-in profile.
 */
export function Navbar() {
	const { ready, tier, nav, homePath, accountPath } = useNav();
	if (!ready) return <header className="atlas-navbar" />;
	return <NavbarInner tier={tier} nav={nav} homePath={homePath} accountPath={accountPath} />;
}

function NavbarInner({ tier, nav, homePath, accountPath }: {
	tier: Tier;
	nav: ReturnType<typeof useNav>['nav'];
	homePath: string;
	accountPath: string;
}) {
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const crumbs = useBreadcrumbs(nav, homePath, pathname, searchParams, tier);

	return (
		<header className="atlas-navbar">
			<div className="atlas-navbar__left">
				<nav className="atlas-crumbs" aria-label="Breadcrumb">
					<Link href={homePath} className="atlas-crumb">Home</Link>
					{crumbs.map((c) => (
						<span key={c.label} className="atlas-crumb-wrap">
							<ChevronRight size={12} strokeWidth={1.75} aria-hidden="true" className="atlas-crumb-sep" />
							{c.href
								? <Link href={c.href} className="atlas-crumb">{c.label}</Link>
								: <span className="atlas-crumb is-plain">{c.label}</span>}
						</span>
					))}
				</nav>
			</div>

			<div className="atlas-navbar__right">
				<SearchButton />
				<VerifyButton />
				<ThemeToggle header />
				<NotificationBell />
				<AccountMenu tier={tier} accountPath={accountPath} />
			</div>
		</header>
	);
}

/** Memoised wrapper over the pure `crumbsFor` — see breadcrumbs.ts. */
function useBreadcrumbs(
	nav: ReturnType<typeof useNav>['nav'],
	homePath: string,
	pathname: string,
	searchParams: ReturnType<typeof useSearchParams>,
	tier: Tier,
): Crumb[] {
	const leafLabel = useLeafTitle(pathname);

	return useMemo(() => {
		const r = routeForPath(pathname, tier);
		const route = r ? { name: forTier(r.name, tier) ?? r.id, path: forTier(r.path, tier) ?? pathname } : undefined;
		return crumbsFor(nav, homePath, pathname, searchParams, { route, leafLabel });
	}, [nav, homePath, pathname, searchParams, tier, leafLabel]);
}

/** The id segment below a list route, or null when the path is not a detail page. */
function leafOf(pathname: string, base: string): string | null {
	return pathname.startsWith(`${base}/`) ? decodeURIComponent(pathname.slice(base.length + 1).split('/')[0]) : null;
}

/**
 * A real title for a detail page's last crumb.
 *
 * Each of these is already being fetched by the page itself under the same
 * SWR key, so reading it here costs no extra request, and each lookup only
 * runs on its own URL. A chat's id is opaque and would otherwise be dropped;
 * a report or company slug would otherwise be de-slugged ("bsm-report-english"
 * → "Bsm Report English") instead of reading as its actual title.
 */
function useLeafTitle(pathname: string): string | null {
	const chatId = leafOf(pathname, hrefOf('chat'));
	const reportSlug = leafOf(pathname, hrefOf('reports'));
	const companySlug = leafOf(pathname, hrefOf('companies'));
	const { data: convos } = useSWR<ConversationListItem[]>(chatId ? qk.chat.conversations() : null);
	const { data: report } = useSWR<{ title?: string }>(reportSlug ? qk.reports.detail(reportSlug) : null);
	const { data: company } = useSWR<{ name?: string }>(companySlug ? qk.companies.detail(companySlug) : null);
	if (chatId) return convos?.find((c) => c.id === chatId)?.title ?? 'Conversation';
	if (reportSlug) return report?.title ?? null;
	if (companySlug) return company?.name ?? null;
	return null;
}

/**
 * The search trigger. Opens the palette rather than a menu of its own: search
 * spans pages and records, so it needs the room, and ⌘K is the shortcut people
 * reach for before they look for a button.
 */
function SearchButton() {
	const [open, setOpen] = useState(false);
	const openIt = useCallback(() => setOpen(true), []);
	useCommandShortcut(openIt);
	return (
		<>
			<button type="button" className="atlas-navsearch__btn" aria-haspopup="dialog" aria-expanded={open} onClick={openIt}>
				<Search size={13} strokeWidth={1.75} aria-hidden="true" />
				<span className="atlas-navsearch__label">Search</span>
				<kbd className="atlas-navsearch__kbd">⌘K</kbd>
			</button>
			<CommandPalette open={open} onClose={() => setOpen(false)} />
		</>
	);
}

/**
 * Avatar + account menu. Log out sits here as a first-class item because the
 * only way out of the product used to be navigating to /account and scrolling.
 */
function AccountMenu({ tier, accountPath }: { tier: Tier; accountPath: string }) {
	const { data: profile } = useUserProfile();
	const { logout, signingOut } = useLogout();
	const [open, setOpen] = useState(false);
	const ref = useRef<HTMLDivElement>(null);
	useDismiss(ref, open, () => setOpen(false));

	const name = profile?.display_name ?? profile?.full_name ?? '';
	const avatar = profile?.avatar_url;

	return (
		<div className="atlas-navbar__anchor" ref={ref}>
			<button
				type="button"
				className="atlas-avatar"
				aria-haspopup="dialog"
				aria-expanded={open}
				aria-label="Account menu"
				onClick={() => setOpen(!open)}
			>
				{avatar
					// eslint-disable-next-line @next/next/no-img-element
					? <img src={avatar} alt="" className="atlas-avatar__img" />
					: <span aria-hidden="true">{initialsOf(name)}</span>}
			</button>

			{open && (
				<div ref={menuEdgeRef} className="atlas-menu atlas-menu--end atlas-account-menu" role="dialog" aria-label="Account">
					<div className="atlas-menu__head">
						<span className="atlas-ellipsis">{name || profile?.email || 'Signed in'}</span>
					</div>
					<div className="atlas-menu__list">
						<Link href={accountPath} className="atlas-menu__item atlas-menu__item--plain" onClick={() => setOpen(false)}>
							<Settings size={13} strokeWidth={1.5} aria-hidden="true" /> Account
						</Link>
						{tier !== 'explore' && (
							<Link href={hrefOf('billing')} className="atlas-menu__item atlas-menu__item--plain" onClick={() => setOpen(false)}>
								<CreditCard size={13} strokeWidth={1.5} aria-hidden="true" /> Subscription
							</Link>
						)}
						{/* The only door to `/verify` now that the button beside this menu
						    opens the modal instead. The page is also where a verified
						    claim's market report is listed. */}
						<Link href={hrefOf('verify')} className="atlas-menu__item atlas-menu__item--plain" onClick={() => setOpen(false)}>
							<ShieldCheck size={13} strokeWidth={1.5} aria-hidden="true" /> Get verified
						</Link>
					</div>
					<div className="atlas-account-menu__foot">
						<button
							type="button"
							className={cx('atlas-menu__item', 'atlas-menu__item--plain', 'atlas-account-menu__out')}
							onClick={() => void logout()}
							disabled={signingOut}
						>
							<LogOut size={13} strokeWidth={1.5} aria-hidden="true" /> {signingOut ? 'Logging out…' : 'Log out'}
						</button>
					</div>
				</div>
			)}
		</div>
	);
}
