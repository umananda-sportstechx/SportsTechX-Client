'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import useSWR from 'swr';
import { Loader2, Search } from 'lucide-react';
import { Logo, cx } from '@/components/atlas';
import { FigmaIcon } from '@/components/atlas/icons/figma-icons';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useNav } from '@/hooks/use-nav';
import { flattenNav } from '@/components/atlas/shell/nav';
import { qk } from '@/lib/query-keys';
import { companyHref, hrefOf } from '@/lib/routes';
import type { Tier } from '@/lib/access';
import './command-palette.css';

/**
 * Global search, as a command palette.
 *
 * It replaces a typeahead that searched companies, investors and deals only —
 * so the fastest way to reach a *page* was still the sidebar, and pages that
 * are not in the sidebar (Get verified, Subscription, the account tabs) were
 * not reachable by search at all.
 *
 * Two sources, deliberately different in kind:
 *  - **Pages** come from the route manifest the sidebar is built from, matched
 *    locally. No request, so they appear on the first keystroke, and the list
 *    is exactly what this tier may open.
 *  - **Records** come from `GET /search`, which rejects anything under three
 *    characters (trigram candidates explode below that), so it is only asked
 *    once the term is long enough.
 */
interface SearchHit {
	type: string;
	id: string;
	name: string;
	slug: string | null;
	subtitle?: string | null;
	website?: string | null;
}

const BUCKET_LABEL: Record<string, string> = {
	companies: 'Companies', investors: 'Investors', deals: 'Deal Flow',
};

/**
 * Only the buckets this tier can open. `/investors/:id` is Raise-only and
 * `/deal-flow/:id` is Scout-only, so offering either to an Explore user is a
 * result that leads to a tier wall.
 */
function bucketsFor(tier: Tier): string[] {
	if (tier === 'raise') return ['companies', 'investors'];
	if (tier === 'scout') return ['companies', 'deals'];
	return ['companies'];
}

interface PageHit { label: string; href: string; group: string; icon: string }

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
	const router = useRouter();
	const { tier, nav, accountPath } = useNav();
	const [q, setQ] = useState('');
	const inputRef = useRef<HTMLInputElement>(null);

	const dq = useDebouncedValue(q);
	const term = dq.trim();
	const types = bucketsFor(tier);

	const records = useSWR<{ q: string; results: Record<string, SearchHit[]> }>(
		open && term.length >= 3 ? qk.search.typeahead(term, types) : null,
	);

	// Every page this tier can reach, including the ones with no sidebar entry.
	const pages = useMemo<PageHit[]>(() => {
		const fromNav = nav.flatMap((e) =>
			'items' in e
				? e.items.filter((i) => !i.soon).map((i) => ({ label: i.name, href: i.path, group: e.title, icon: i.icon }))
				: [{ label: e.name, href: e.path, group: 'Pages', icon: e.icon }],
		);
		// Reachable but deliberately unlisted in the sidebar.
		const extra: PageHit[] = [
			{ label: 'Account', href: accountPath, group: 'Account', icon: 'nav-thesis' },
			{ label: 'Get verified', href: hrefOf('verify'), group: 'Account', icon: 'nav-onboarding' },
			{ label: 'Chat', href: hrefOf('chat'), group: 'Pages', icon: 'nav-watchlist' },
		];
		if (tier === 'raise') extra.push({ label: 'Raise settings', href: hrefOf('raise-settings'), group: 'Account', icon: 'nav-thesis' });
		if (tier === 'scout') extra.push({ label: 'Thesis settings', href: hrefOf('thesis'), group: 'Account', icon: 'nav-thesis' });
		if (tier !== 'explore') extra.push({ label: 'Subscription', href: hrefOf('billing'), group: 'Account', icon: 'nav-subscription' });
		else extra.push({ label: 'Compare plans', href: hrefOf('plans'), group: 'Account', icon: 'nav-subscription' });

		const seen = new Set<string>();
		return [...fromNav, ...extra].filter((p) => {
			if (seen.has(p.href)) return false;
			seen.add(p.href);
			return true;
		});
	}, [nav, accountPath, tier]);

	const matchedPages = useMemo(() => {
		const t = q.trim().toLowerCase();
		if (!t) return pages.slice(0, 7);
		return pages.filter((p) => p.label.toLowerCase().includes(t)).slice(0, 7);
	}, [pages, q]);

	const recordGroups = types
		.map((b) => [b, records.data?.results?.[b] ?? []] as const)
		.filter(([, hits]) => hits.length > 0);

	const hrefFor = (h: SearchHit): string => {
		if (h.type === 'investor') return `${hrefOf('investors')}/${encodeURIComponent(h.id)}`;
		if (h.type === 'deal') return `${hrefOf('deal-flow')}/${encodeURIComponent(h.id)}`;
		return companyHref(h.slug ?? h.id);
	};

	// One flat list so the arrow keys can walk pages and records as a single
	// column, which is what the highlight implies.
	const flat = useMemo(
		() => [
			...matchedPages.map((p) => p.href),
			...recordGroups.flatMap(([, hits]) => hits.map((h) => hrefFor(h))),
		],
		[matchedPages, recordGroups],
	);
	// The highlight is stored with the query it belongs to, so a new query
	// resets it by definition. Doing that from an effect instead is a cascading
	// render, and React lints it as one.
	const [mark, setMark] = useState<{ q: string; i: number }>({ q: '', i: 0 });
	const cursor = mark.q === q ? mark.i : 0;
	const setCursor = (next: number | ((c: number) => number)) =>
		setMark({ q, i: typeof next === 'function' ? next(cursor) : next });
	const active = flat[Math.min(cursor, flat.length - 1)];

	useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);

	if (!open) return null;

	const go = (href: string) => { onClose(); setQ(''); router.push(href); };

	const onKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
		if (e.key === 'ArrowDown') { e.preventDefault(); setCursor((c) => Math.min(c + 1, flat.length - 1)); return; }
		if (e.key === 'ArrowUp') { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); return; }
		if (e.key === 'Enter' && active) { e.preventDefault(); go(active); }
	};

	const searching = term.length >= 3 && records.isLoading;
	const nothing = !searching && matchedPages.length === 0 && recordGroups.length === 0;

	return (
		<div className="atlas cmdk-overlay" role="presentation" onClick={onClose}>
			<div
				className="cmdk"
				role="dialog"
				aria-modal="true"
				aria-label="Search Atlas"
				onClick={(e) => e.stopPropagation()}
				onKeyDown={onKeyDown}
			>
				<div className="cmdk__field">
					<Search size={14} strokeWidth={1.75} aria-hidden="true" />
					<input
						ref={inputRef}
						className="cmdk__input"
						placeholder="Search pages, companies, investors…"
						value={q}
						onChange={(e) => setQ(e.target.value)}
						aria-label="Search Atlas"
					/>
					{searching && <Loader2 className="animate-spin" size={13} aria-hidden="true" />}
					<kbd className="cmdk__kbd">Esc</kbd>
				</div>

				<div className="cmdk__list">
					{nothing && (
						<p className="cmdk__empty">
							{term.length > 0 && term.length < 3
								? 'Keep typing — records need at least three characters.'
								: `No matches for “${q.trim()}”.`}
						</p>
					)}

					{matchedPages.length > 0 && (
						<section className="cmdk__group">
							<div className="cmdk__label">Pages</div>
							{matchedPages.map((p) => (
								<button
									key={p.href}
									type="button"
									className={cx('cmdk__row', active === p.href && 'is-active')}
									onMouseEnter={() => setCursor(flat.indexOf(p.href))}
									onClick={() => go(p.href)}
								>
									<span className="cmdk__ico"><FigmaIcon name={p.icon} size={18} /></span>
									<span className="cmdk__name">{p.label}</span>
									<span className="cmdk__meta">{p.group}</span>
								</button>
							))}
						</section>
					)}

					{recordGroups.map(([bucket, hits]) => (
						<section key={bucket} className="cmdk__group">
							<div className="cmdk__label">{BUCKET_LABEL[bucket] ?? bucket}</div>
							{hits.map((h) => {
								const href = hrefFor(h);
								return (
									<button
										key={`${h.type}-${h.id}`}
										type="button"
										className={cx('cmdk__row', active === href && 'is-active')}
										onMouseEnter={() => setCursor(flat.indexOf(href))}
										onClick={() => go(href)}
									>
										<Logo co={{ name: h.name, website: h.website ?? null, custom_logo_url: null }} size={22} radius={4} />
										<span className="cmdk__name">{h.name}</span>
										{h.subtitle && <span className="cmdk__meta">{h.subtitle.replace(/^https?:\/\//, '')}</span>}
									</button>
								);
							})}
						</section>
					))}
				</div>

				<div className="cmdk__foot">
					<span><kbd className="cmdk__kbd">↑</kbd><kbd className="cmdk__kbd">↓</kbd> to navigate</span>
					<span><kbd className="cmdk__kbd">↵</kbd> to open</span>
				</div>
			</div>
		</div>
	);
}

/** Opens on ⌘K / Ctrl-K from anywhere, the shortcut people already try. */
export function useCommandShortcut(onOpen: () => void) {
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
				e.preventDefault();
				onOpen();
			}
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [onOpen]);
}

export { flattenNav };
