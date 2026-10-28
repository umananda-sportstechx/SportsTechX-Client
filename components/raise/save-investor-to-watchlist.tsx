'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import useSWR from 'swr';
import { toast } from 'sonner';
import { Bookmark, Check, Loader2, Plus } from 'lucide-react';
import { cx } from '@/components/atlas';
import { useKeepInViewport } from '@/components/atlas/ui/use-keep-in-viewport';
import { qk } from '@/lib/query-keys';
import { apiRequest } from '@/lib/query-client';
import { refreshPipeline } from '@/lib/invalidate';
import { createWatchlist, isInvestorList, useCompanyWatchlists } from '@/components/features/watchlists/use-company-watchlists';
import '@/components/features/watchlists/watchlists.css';

/** Every Raise pipeline view (any list / filter, activity), the list counts and
 *  the Raise home cards change together — see lib/invalidate. */
export { refreshPipeline };

const MAIN = 'Main watchlist';
interface PipeRef { id: string; investor_id: string | null; watchlist_id: string | null }

/**
 * "Add to watchlist" for an investor (Raise): the same black menu as companies,
 * but single-choice — an investor sits in exactly one watchlist (Main or a named
 * investor list). Picking another list moves it, keeping its stage and notes;
 * "+ New watchlist" creates an investor list and files it there.
 */
export function SaveInvestorToWatchlist({ investorId, investorName, align = 'start', portal = false }: {
	investorId: string; investorName: string;
	/** Which edge the menu hangs from: 'start' for a card's left-hand action row,
	 *  'end' for a button at the right of a header (else it clips off-screen). */
	align?: 'start' | 'end';
	/** Render the menu on document.body, fixed to the button — needed inside a
	 *  table row, whose `overflow-x: auto` container would clip a dropdown. */
	portal?: boolean;
}) {
	const [open, setOpen] = useState(false);
	const [creating, setCreating] = useState(false);
	const [newName, setNewName] = useState('');
	const [busy, setBusy] = useState<string | null>(null);
	const ref = useRef<HTMLDivElement>(null);
	const menuRef = useRef<HTMLDivElement>(null);
	useKeepInViewport(menuRef, open, ref); // portalled: anchor to the button's wrapper, not the menu's parent
	const [pos, setPos] = useState<{ top: number; left?: number; right?: number } | null>(null);
	const close = useCallback(() => { setOpen(false); setCreating(false); setNewName(''); }, []);
	const toggle = () => {
		if (open) { close(); return; }
		// The portalled menu is pinned under the button at every width; the
		// viewport hook below nudges it back on-screen when it would spill.
		// The button, not its wrapper: in a table cell the wrapper spans the whole
		// column, which right-aligned the menu 40-odd px past the button.
		const r = (ref.current?.querySelector('button') ?? ref.current)?.getBoundingClientRect();
		setPos(portal && r
			? { top: r.bottom + 6, ...(align === 'end' ? { right: window.innerWidth - r.right } : { left: r.left }) }
			: null);
		setOpen(true);
	};
	// Outside click / Escape close it; so does scrolling the page, which would
	// leave a fixed (portalled) menu floating away from its button.
	useEffect(() => {
		if (!open) return;
		const inside = (t: EventTarget | null) => !!t && (ref.current?.contains(t as Node) || menuRef.current?.contains(t as Node));
		const onDown = (e: MouseEvent) => { if (!inside(e.target)) close(); };
		const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
		// Typing in the menu (the new-list name) opens a phone's keyboard, which
		// scrolls and/or resizes the page — that must not close the menu.
		const typing = () => !!menuRef.current?.contains(document.activeElement);
		const onScroll = (e: Event) => { if (portal && !inside(e.target) && !typing()) close(); };
		const onResize = () => { if (!typing()) close(); };
		document.addEventListener('mousedown', onDown);
		document.addEventListener('keydown', onKey);
		window.addEventListener('scroll', onScroll, true);
		window.addEventListener('resize', onResize);
		return () => {
			document.removeEventListener('mousedown', onDown);
			document.removeEventListener('keydown', onKey);
			window.removeEventListener('scroll', onScroll, true);
			window.removeEventListener('resize', onResize);
		};
	}, [open, close, portal]);

	// Shares its SWR key with the board and the directory's "In watchlist" badges.
	const { data } = useSWR<{ data: PipeRef[] }>(qk.raise.pipeline());
	const row = (data?.data ?? []).find((r) => r.investor_id === investorId) ?? null;
	const { lists, isLoading } = useCompanyWatchlists();
	const investorLists = lists.filter(isInvestorList);
	const current = row ? (row.watchlist_id ?? 'main') : null;
	const currentName = current === 'main' ? MAIN : investorLists.find((l) => l.id === current)?.name ?? 'a watchlist';

	const fileIn = async (listId: string | null, label: string) => {
		if ((listId ?? 'main') === current) { close(); return; }
		setBusy(listId ?? 'main');
		try {
			if (row) await apiRequest('PATCH', `/api/raise/pipeline/${row.id}`, { watchlist_id: listId });
			else await apiRequest('POST', '/api/raise/pipeline', { investor_id: investorId, stage: 'target', watchlist_id: listId });
			await refreshPipeline();
			toast.success(row ? `Moved ${investorName} to ${label}` : `Added ${investorName} to ${label}`);
			close();
		} catch (e) { toast.error((e as Error).message); }
		finally { setBusy(null); }
	};
	const create = async () => {
		const name = newName.trim();
		if (!name) return;
		setBusy('new');
		try {
			const w = await createWatchlist(name, 'investors');
			setBusy(null);
			await fileIn(w.id, name);
		} catch (e) { toast.error((e as Error).message); setBusy(null); }
	};

	const options: [string | null, string, number | undefined][] = [
		[null, MAIN, undefined],
		...investorLists.map((l) => [l.id, l.name, l.company_count] as [string, string, number | undefined]),
	];

	return (
		<div className="atlas-fbar__anchor" ref={ref}>
			<button type="button" className="atlas-action atlas-action--save" aria-haspopup="dialog" aria-expanded={open} onClick={toggle}>
				<span className="atlas-action__icon"><Bookmark fill={row ? 'currentColor' : 'none'} /></span>
				<span className="atlas-action__label">{row ? `In ${currentName}` : 'Add to watchlist'}</span>
			</button>
			{open && (() => {
				const menu = (
				<div ref={menuRef} className={cx('atlas-menu', align === 'end' && 'atlas-menu--end', 'atlas-wl-menu', 'atlas-menu--sheet')} role="dialog" aria-label={row ? 'Move to watchlist' : 'Add to watchlist'}
					style={pos ? { position: 'fixed', top: pos.top, left: pos.left ?? 'auto', right: pos.right ?? 'auto' } : undefined}>
					<div className="atlas-menu__head"><span>{row ? 'Move to watchlist' : 'Add to watchlist'}</span></div>
					<div className="atlas-menu__list atlas-menu__list--scroll">
						{isLoading && <div className="atlas-menu__empty">Loading…</div>}
						{options.map(([id, name, count]) => {
							const on = (id ?? 'main') === current;
							return (
								<button key={id ?? 'main'} type="button" className={cx('atlas-menu__item', 'atlas-menu__item--plain', on && 'on')} aria-pressed={on} disabled={busy !== null} onClick={() => void fileIn(id, name)}>
									<span className="atlas-wl-check" aria-hidden="true">{busy === (id ?? 'main') ? <Loader2 className="animate-spin" size={10} /> : on ? <Check size={10} /> : null}</span>
									<span className="atlas-switcher__name">{name}</span>
									{count != null && <span className="atlas-switcher__meta">{count}</span>}
								</button>
							);
						})}
					</div>
					<div className="atlas-switcher__foot">
						{creating ? (
							<form className="atlas-wl-new" onSubmit={(e) => { e.preventDefault(); void create(); }}>
								<input className="atlas-menu__search" placeholder="Watchlist name" value={newName} maxLength={120} onChange={(e) => setNewName(e.target.value)} autoFocus aria-label="New watchlist name" />
								<button type="submit" className="atlas-wl-create" disabled={!newName.trim() || busy !== null}>{busy === 'new' ? <Loader2 className="animate-spin" size={11} /> : 'Create'}</button>
							</form>
						) : (
							<button type="button" className="atlas-menu__item atlas-menu__item--plain" onClick={() => setCreating(true)}>
								<Plus size={11} aria-hidden="true" /> New watchlist
							</button>
						)}
					</div>
				</div>
				);
				// `atlas` re-scopes the design tokens outside the app shell.
				return portal ? createPortal(<div className="atlas">{menu}</div>, document.body) : menu;
			})()}
		</div>
	);
}
