'use client';

import { useState, useEffect, useMemo } from 'react';
import useSWR, { mutate as globalMutate } from 'swr';
import { X, Plus, Check } from 'lucide-react';
import { qk } from '@/lib/query-keys';
import { apiRequest } from '@/lib/query-client';

interface Watchlist {
	id: string;
	name: string;
	description: string | null;
	color: string | null;
	company_count?: number;
}

interface WatchlistsResponse { data: Watchlist[] }
interface ContainingResponse { data: string[] }

/**
 * Modal for adding a company to one or more of the user's watchlists.
 * Reads `/api/user-watchlists` for the user's lists, `/api/user-watchlists/containing/:companyId`
 * for pre-checked state, and POSTs/DELETEs `/api/user-watchlists/:id/companies/:companyId`.
 *
 * Also supports inline "+ New list" creation via `POST /api/user-watchlists`.
 *
 * When `companyId` is null, the picker shows only the "+ New list" form (no
 * checkboxes), letting the user create an empty list from the database header.
 */
export function WatchlistPicker({
	open, onClose, companyId, companyName,
}: {
	open: boolean;
	onClose: () => void;
	companyId: string | null;
	companyName?: string;
}) {
	const { data: listsResp } = useSWR<WatchlistsResponse>(open ? qk.userWatchlists.list() : null);
	const { data: containingResp } = useSWR<ContainingResponse>(
		open && companyId ? qk.userWatchlists.containing(companyId) : null,
	);

	const lists = useMemo(() => listsResp?.data ?? [], [listsResp]);
	const checked = useMemo(() => new Set(containingResp?.data ?? []), [containingResp]);

	const [pending, setPending] = useState<Set<string>>(new Set());
	const [creating, setCreating] = useState(false);
	const [newName, setNewName] = useState('');
	const [newColor, setNewColor] = useState('#f43f5e');

	useEffect(() => {
		if (!open) {
			setCreating(false);
			setNewName('');
		}
	}, [open]);

	useEffect(() => {
		if (!open) return;
		const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [open, onClose]);

	if (!open) return null;

	const toggle = async (id: string) => {
		if (!companyId) return;
		const isOn = checked.has(id);
		setPending((p) => new Set(p).add(id));
		try {
			await apiRequest(
				isOn ? 'DELETE' : 'POST',
				`/api/user-watchlists/${id}/companies/${companyId}`,
			);
			await globalMutate(qk.userWatchlists.containing(companyId));
			await globalMutate(qk.userWatchlists.list());
		} finally {
			setPending((p) => { const n = new Set(p); n.delete(id); return n; });
		}
	};

	const createList = async (e: React.FormEvent) => {
		e.preventDefault();
		const name = newName.trim();
		if (!name) return;
		setCreating(true);
		try {
			const res = await apiRequest('POST', '/api/user-watchlists', {
				name, color: newColor,
			});
			const created = await res.json() as Watchlist;
			await globalMutate(qk.userWatchlists.list());
			if (companyId) {
				await apiRequest('POST', `/api/user-watchlists/${created.id}/companies/${companyId}`);
				await globalMutate(qk.userWatchlists.containing(companyId));
			}
			setNewName('');
			setCreating(false);
		} catch {
			setCreating(false);
		}
	};

	return (
		<div
			className="wp-overlay"
			role="dialog"
			aria-modal="true"
			aria-label="Add to watchlist"
			onClick={onClose}
		>
			<div className="wp-modal" onClick={(e) => e.stopPropagation()}>
				<header className="wp-head">
					<div>
						<div className="wp-title">Add to watchlist</div>
						{companyName && <div className="wp-sub">{companyName}</div>}
					</div>
					<button className="icon-btn" onClick={onClose} aria-label="Close">
						<X size={14} />
					</button>
				</header>

				<div className="wp-body">
					{companyId ? (
						lists.length === 0 ? (
							<div className="wp-empty">No watchlists yet. Create your first below.</div>
						) : (
							<ul className="wp-list">
								{lists.map((l) => {
									const on = checked.has(l.id);
									const isPending = pending.has(l.id);
									return (
										<li key={l.id}>
											<button
												className={`wp-row ${on ? 'on' : ''}`}
												onClick={() => void toggle(l.id)}
												disabled={isPending}
											>
												<span
													className="wp-dot"
													style={{ background: l.color ?? 'var(--accent)' }}
												/>
												<span className="wp-name">{l.name}</span>
												<span className="wp-count">{l.company_count ?? 0}</span>
												<span className={`wp-check ${on ? 'on' : ''}`}>
													{on && <Check size={12} />}
												</span>
											</button>
										</li>
									);
								})}
							</ul>
						)
					) : (
						<div className="wp-empty">Create a new watchlist:</div>
					)}

					<form className="wp-create" onSubmit={createList}>
						<input
							type="color"
							value={newColor}
							onChange={(e) => setNewColor(e.target.value)}
							className="wp-color"
							aria-label="List color"
						/>
						<input
							type="text"
							value={newName}
							onChange={(e) => setNewName(e.target.value)}
							placeholder="New list name…"
							className="wp-input"
							maxLength={120}
						/>
						<button
							type="submit"
							className="btn"
							disabled={!newName.trim() || creating}
						>
							<Plus size={12} /> Create
						</button>
					</form>
				</div>
			</div>
		</div>
	);
}
