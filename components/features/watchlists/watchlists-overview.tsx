'use client';

import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import { ArrowUpRight, Pencil, Plus, Trash2 } from 'lucide-react';
import { Action, Button, Empty, Input, Loading, Seg } from '@/components/atlas';
import { getUserType, useUserProfile } from '@/hooks/use-user-profile';
import { useCompanyWatchlists, createWatchlist, renameWatchlist, deleteWatchlist, isInvestorList } from './use-company-watchlists';
import './watchlists.css';

const count = (n: number, investors: boolean) => `${n} ${investors ? `investor${n === 1 ? '' : 's'}` : `compan${n === 1 ? 'y' : 'ies'}`}`;

/** All watchlists: open, rename, delete, and create a new one by name. Raise
 *  users also keep investor watchlists here, so they pick what a new list holds. */
export function WatchlistsOverview({ watchlistHref }: { watchlistHref: (id: string) => string }) {
	const { lists, isLoading } = useCompanyWatchlists();
	const { data: profile } = useUserProfile();
	const isRaise = getUserType(profile) === 'raise';
	const [kind, setKind] = useState<'investors' | 'companies'>('investors');
	const newKind = isRaise ? kind : 'companies';
	const [name, setName] = useState('');
	const [editing, setEditing] = useState<string | null>(null);
	const [editName, setEditName] = useState('');
	const [busy, setBusy] = useState(false);

	const run = async (fn: () => Promise<unknown>, ok: string) => {
		setBusy(true);
		try { await fn(); toast.success(ok); } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
	};

	return (
		<>
			<form className="atlas-wl-createbar" onSubmit={(e) => { e.preventDefault(); const n = name.trim(); if (n) void run(async () => { await createWatchlist(n, newKind); setName(''); }, `Created ${n}`); }}>
				{isRaise && <Seg ariaLabel="New watchlist holds" value={kind} onChange={setKind} options={[{ key: 'investors', label: 'Investors' }, { key: 'companies', label: 'Companies' }]} />}
				<Input className="atlas-input--search" placeholder="New watchlist name, e.g. Football Infrastructure" value={name} maxLength={120} onChange={(e) => setName(e.target.value)} aria-label="New watchlist name" />
				<Button type="submit" disabled={!name.trim() || busy}><Plus /> New watchlist</Button>
			</form>

			{isLoading ? <Loading /> : lists.length === 0 ? (
				<Empty>No watchlists yet. Create one above, or use “Add to watchlist” on any company page.</Empty>
			) : (
				<div className="atlas-rowlist">
					{lists.map((l) => (
						<div key={l.id} className="atlas-rowlist__row">
							<div className="atlas-rowlist__main">
								{editing === l.id ? (
									<form className="atlas-wl-rename" onSubmit={(e) => { e.preventDefault(); const n = editName.trim(); if (n) void run(async () => { await renameWatchlist(l.id, n); setEditing(null); }, 'Renamed'); }}>
										<Input value={editName} maxLength={120} onChange={(e) => setEditName(e.target.value)} autoFocus aria-label="Watchlist name" />
										<Button type="submit" size="sm" disabled={!editName.trim() || busy}>Save</Button>
										<Button type="button" size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
									</form>
								) : (
									<>
										<Link href={watchlistHref(l.id)} className="atlas-rowlist__title atlas-wl-title">{l.name}</Link>
										<div className="atlas-rowlist__desc">{count(l.company_count ?? 0, isInvestorList(l))}</div>
									</>
								)}
							</div>
							{editing !== l.id && (
								<div className="atlas-wl-actions">
									<Action icon={<ArrowUpRight />} href={watchlistHref(l.id)}>Open</Action>
									<Action icon={<Pencil />} onClick={() => { setEditing(l.id); setEditName(l.name); }}>Rename</Action>
									<Action icon={<Trash2 />} disabled={busy} onClick={() => { if (window.confirm(isInvestorList(l) ? `Delete “${l.name}”? Its investors move back to your Main watchlist.` : `Delete “${l.name}”? Companies stay in the database.`)) void run(() => deleteWatchlist(l.id), `Deleted ${l.name}`); }}>Delete</Action>
								</div>
							)}
						</div>
					))}
				</div>
			)}
		</>
	);
}
