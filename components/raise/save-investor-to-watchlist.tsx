'use client';

import { useCallback, useRef, useState } from 'react';
import useSWR, { mutate as globalMutate } from 'swr';
import { toast } from 'sonner';
import { Bookmark, BookmarkCheck, Check, Loader2, Plus } from 'lucide-react';
import { cx, useDismiss } from '@/components/atlas';
import { qk } from '@/lib/query-keys';
import { apiRequest } from '@/lib/query-client';
import { createWatchlist, isInvestorList, useCompanyWatchlists } from '@/components/features/watchlists/use-company-watchlists';
import '@/components/features/watchlists/watchlists.css';

/** Every Raise pipeline view (any list / filter) plus the list counts change together. */
export const refreshPipeline = () => Promise.all([
	globalMutate((k: unknown) => Array.isArray(k) && k[0] === qk.raise.pipeline()[0]),
	globalMutate(qk.userWatchlists.list()),
]);

const MAIN = 'Main watchlist';
interface PipeRef { id: string; investor_id: string | null; watchlist_id: string | null }

/**
 * "Add to watchlist" for an investor (Raise): the same black menu as companies,
 * but single-choice — an investor sits in exactly one watchlist (Main or a named
 * investor list). Picking another list moves it, keeping its stage and notes;
 * "+ New watchlist" creates an investor list and files it there.
 */
export function SaveInvestorToWatchlist({ investorId, investorName, align = 'start' }: {
	investorId: string; investorName: string;
	/** Which edge the menu hangs from: 'start' for a card's left-hand action row,
	 *  'end' for a button at the right of a header (else it clips off-screen). */
	align?: 'start' | 'end';
}) {
	const [open, setOpen] = useState(false);
	const [creating, setCreating] = useState(false);
	const [newName, setNewName] = useState('');
	const [busy, setBusy] = useState<string | null>(null);
	const ref = useRef<HTMLDivElement>(null);
	const close = useCallback(() => { setOpen(false); setCreating(false); setNewName(''); }, []);
	useDismiss(ref, open, close);

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
			<button type="button" className="atlas-action" aria-haspopup="dialog" aria-expanded={open} onClick={() => (open ? close() : setOpen(true))}>
				<span className="atlas-action__icon">{row ? <BookmarkCheck /> : <Bookmark />}</span>
				{row ? `In ${currentName}` : 'Add to watchlist'}
			</button>
			{open && (
				<div className={cx('atlas-menu', align === 'end' && 'atlas-menu--end', 'atlas-wl-menu', 'atlas-menu--sheet')} role="dialog" aria-label={row ? 'Move to watchlist' : 'Add to watchlist'}>
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
			)}
		</div>
	);
}
