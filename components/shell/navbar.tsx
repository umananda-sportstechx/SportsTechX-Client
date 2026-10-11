'use client';

import Link from 'next/link';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { useMemo, useRef, useState } from 'react';
import useSWR from 'swr';
import { ChevronRight, LogOut, Search, Settings, CreditCard, Loader2 } from 'lucide-react';
import { cx, useDismiss, Logo } from '@/components/atlas';
import { crumbsFor, type Crumb } from './breadcrumbs';
import { initialsOf } from '@/components/atlas/shell/atlas-shell';
import { ThemeToggle } from '@/components/atlas/shell/theme-toggle';
import { VerifyButton } from '@/components/features/verify/verify-cta';
import { useNav } from '@/hooks/use-nav';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useLogout } from '@/hooks/use-logout';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { qk } from '@/lib/query-keys';
import { companyHref, hrefOf } from '@/lib/routes';
import type { Tier } from '@/lib/access';
import './navbar.css';

/**
 * The bar across the top of every authenticated page: breadcrumbs and search on
 * the left, Get Verified and the account menu on the right.
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
	const crumbs = useBreadcrumbs(nav, homePath, pathname, searchParams);

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
				<NavSearch tier={tier} />
			</div>

			<div className="atlas-navbar__right">
				<VerifyButton />
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
): Crumb[] {
	return useMemo(
		() => crumbsFor(nav, homePath, pathname, searchParams),
		[nav, homePath, pathname, searchParams],
	);
}

/** Buckets whose results this tier can actually open — see the comment in NavSearch. */
function bucketsFor(tier: Tier): string[] {
	const b = ['companies'];
	if (tier === 'raise') b.push('investors');
	if (tier === 'scout') b.push('deals');
	return b;
}

const BUCKET_LABEL: Record<string, string> = {
	companies: 'Companies', investors: 'Investors', deals: 'Deal Flow',
};

interface SearchHit {
	type: string;
	id: string;
	name: string;
	slug: string | null;
	subtitle?: string | null;
	website?: string | null;
}

/**
 * Typeahead over `GET /search`, which already existed and had no caller — as did
 * `qk.search.typeahead`.
 *
 * Only the buckets this tier can open are requested. `/investors/:id` is
 * Raise-only and `/deal-flow/:id` is Scout-only, so offering either to an
 * Explore user would be a result that leads to a tier wall. Sectors, sports and
 * tech tags are excluded for a blunter reason: they have no detail page at all.
 */
function NavSearch({ tier }: { tier: Tier }) {
	const router = useRouter();
	const [open, setOpen] = useState(false);
	const [q, setQ] = useState('');
	const ref = useRef<HTMLDivElement>(null);
	const close = () => { setOpen(false); setQ(''); };
	useDismiss(ref, open, close);

	const dq = useDebouncedValue(q);
	const term = dq.trim();
	// The endpoint rejects anything under 3 characters (its own comment explains
	// that trigram candidates explode below that), so don't even ask.
	const types = bucketsFor(tier);
	const { data, isLoading } = useSWR<{ q: string; results: Record<string, SearchHit[]> }>(
		open && term.length >= 3 ? qk.search.typeahead(term, types) : null,
	);

	const groups = types
		.map((b) => [b, data?.results?.[b] ?? []] as const)
		.filter(([, hits]) => hits.length > 0);
	const empty = term.length >= 3 && !isLoading && groups.length === 0;

	const hrefFor = (h: SearchHit): string => {
		if (h.type === 'investor') return `${hrefOf('investors')}/${encodeURIComponent(h.id)}`;
		if (h.type === 'deal') return `${hrefOf('deal-flow')}/${encodeURIComponent(h.id)}`;
		return companyHref(h.slug ?? h.id);
	};

	return (
		<div className="atlas-navbar__anchor" ref={ref}>
			<button
				type="button"
				className="atlas-navsearch__btn"
				aria-haspopup="dialog"
				aria-expanded={open}
				onClick={() => (open ? close() : setOpen(true))}
			>
				<Search size={13} strokeWidth={1.75} aria-hidden="true" />
				<span className="atlas-navsearch__label">Search</span>
			</button>

			{open && (
				<div className="atlas-menu atlas-navsearch__menu" role="dialog" aria-label="Search Atlas">
					<div className="atlas-navsearch__field">
						<Search size={11} aria-hidden="true" />
						<input
							className="atlas-menu__search"
							placeholder="Search companies, investors…"
							value={q}
							onChange={(e) => setQ(e.target.value)}
							onKeyDown={(e) => {
								if (e.key !== 'Enter') return;
								const first = groups[0]?.[1][0];
								if (first) { router.push(hrefFor(first)); close(); }
							}}
							autoFocus
							aria-label="Search"
						/>
						{isLoading && <Loader2 className="animate-spin" size={11} aria-hidden="true" />}
					</div>

					<div className="atlas-menu__list atlas-menu__list--scroll">
						{term.length < 3 && <div className="atlas-menu__empty">Type at least 3 characters.</div>}
						{empty && <div className="atlas-menu__empty">No matches for “{term}”.</div>}
						{groups.map(([bucket, hits]) => (
							<section key={bucket}>
								<div className="atlas-menu__head"><span>{BUCKET_LABEL[bucket] ?? bucket}</span></div>
								{hits.map((h) => (
									<Link key={`${h.type}-${h.id}`} href={hrefFor(h)} className="atlas-menu__item" onClick={close}>
										<Logo co={{ name: h.name, website: h.website ?? null, custom_logo_url: null }} size={18} radius={4} />
										<span className="atlas-navsearch__name">{h.name}</span>
										{h.subtitle && <span className="atlas-navsearch__meta">{h.subtitle.replace(/^https?:\/\//, '')}</span>}
									</Link>
								))}
							</section>
						))}
					</div>
				</div>
			)}
		</div>
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
				<div className="atlas-menu atlas-menu--end atlas-account-menu" role="dialog" aria-label="Account">
					<div className="atlas-menu__head">
						<span className="atlas-ellipsis">{name || profile?.email || 'Signed in'}</span>
					</div>
					<div className="atlas-menu__list">
						<Link href={accountPath} className="atlas-menu__item" onClick={() => setOpen(false)}>
							<Settings size={13} strokeWidth={1.5} aria-hidden="true" /> Account
						</Link>
						{tier !== 'explore' && (
							<Link href={hrefOf('billing')} className="atlas-menu__item" onClick={() => setOpen(false)}>
								<CreditCard size={13} strokeWidth={1.5} aria-hidden="true" /> Subscription
							</Link>
						)}
						<ThemeToggle menu />
					</div>
					<div className="atlas-account-menu__foot">
						<button
							type="button"
							className={cx('atlas-menu__item', 'atlas-account-menu__out')}
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
