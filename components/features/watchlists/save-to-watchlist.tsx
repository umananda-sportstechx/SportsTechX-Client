'use client';

import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Bookmark, BookmarkCheck, Check, Loader2, Plus, Search } from 'lucide-react';
import { cx, useDismiss } from '@/components/atlas';
import { useCompanyWatchlists, useWatchlistsContaining, addToWatchlist, removeFromWatchlist, createWatchlist } from './use-company-watchlists';
import './watchlists.css';

/**
 * "Add to watchlist" for a company: an action pill that opens the black menu —
 * search, the user's watchlists as toggles (✓ = company is in it), and
 * "+ New watchlist" with a name field (creates the list and adds the company).
 */
export function SaveToWatchlist({ companyId, companyName }: { companyId: string; companyName: string }) {
	const [open, setOpen] = useState(false);
	const [q, setQ] = useState('');
	const [creating, setCreating] = useState(false);
	const [newName, setNewName] = useState('');
	const [busy, setBusy] = useState<string | null>(null);
	const ref = useRef<HTMLDivElement>(null);
	const close = useCallback(() => { setOpen(false); setQ(''); setCreating(false); setNewName(''); }, []);
	useDismiss(ref, open, close);

	const { lists, isLoading } = useCompanyWatchlists();
	const { ids } = useWatchlistsContaining(companyId);
	const inCount = ids.length;
	const term = q.trim().toLowerCase();
	const shown = term ? lists.filter((l) => l.name.toLowerCase().includes(term)) : lists;

	const toggle = async (id: string, name: string) => {
		setBusy(id);
		try {
			if (ids.includes(id)) { await removeFromWatchlist(id, companyId); toast.success(`Removed from ${name}`); }
			else { await addToWatchlist(id, companyId); toast.success(`Added ${companyName} to ${name}`); }
		} catch (e) { toast.error((e as Error).message); }
		finally { setBusy(null); }
	};
	const create = async () => {
		const name = newName.trim();
		if (!name) return;
		setBusy('new');
		try {
			const w = await createWatchlist(name);
			await addToWatchlist(w.id, companyId);
			toast.success(`Created ${name} and added ${companyName}`);
			setCreating(false); setNewName('');
		} catch (e) { toast.error((e as Error).message); }
		finally { setBusy(null); }
	};

	return (
		<div className="atlas-fbar__anchor" ref={ref}>
			<button type="button" className="atlas-action" aria-haspopup="dialog" aria-expanded={open} onClick={() => (open ? close() : setOpen(true))}>
				<span className="atlas-action__icon">{inCount ? <BookmarkCheck /> : <Bookmark />}</span>
				{inCount ? `In ${inCount} watchlist${inCount === 1 ? '' : 's'}` : 'Add to watchlist'}
			</button>
			{open && (
				<div className="atlas-menu atlas-menu--end atlas-wl-menu" role="dialog" aria-label="Save to watchlist">
					<div className="atlas-menu__head"><span>Save to watchlist</span></div>
					{lists.length > 5 && (
						<div className="atlas-switcher__search">
							<Search size={11} aria-hidden="true" />
							<input className="atlas-menu__search" placeholder="Search watchlists…" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
						</div>
					)}
					<div className="atlas-menu__list atlas-menu__list--scroll">
						{isLoading && <div className="atlas-menu__empty">Loading…</div>}
						{!isLoading && lists.length === 0 && <div className="atlas-menu__empty">No watchlists yet — create one below.</div>}
						{!isLoading && lists.length > 0 && shown.length === 0 && <div className="atlas-menu__empty">No watchlists match</div>}
						{shown.map((l) => {
							const on = ids.includes(l.id);
							return (
								<button key={l.id} type="button" className={cx('atlas-menu__item', on && 'on')} aria-pressed={on} disabled={busy !== null} onClick={() => void toggle(l.id, l.name)}>
									<span className="atlas-wl-check" aria-hidden="true">{busy === l.id ? <Loader2 className="spin" size={10} /> : on ? <Check size={10} /> : null}</span>
									<span className="atlas-switcher__name">{l.name}</span>
									{l.company_count != null && <span className="atlas-switcher__meta">{l.company_count}</span>}
								</button>
							);
						})}
					</div>
					<div className="atlas-switcher__foot">
						{creating ? (
							<form className="atlas-wl-new" onSubmit={(e) => { e.preventDefault(); void create(); }}>
								<input className="atlas-menu__search" placeholder="Watchlist name" value={newName} maxLength={120} onChange={(e) => setNewName(e.target.value)} autoFocus aria-label="New watchlist name" />
								<button type="submit" className="atlas-wl-create" disabled={!newName.trim() || busy !== null}>{busy === 'new' ? <Loader2 className="spin" size={11} /> : 'Create'}</button>
							</form>
						) : (
							<button type="button" className="atlas-menu__item" onClick={() => setCreating(true)}>
								<Plus size={11} aria-hidden="true" /> New watchlist
							</button>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
