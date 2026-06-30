'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { Bell, Heart, Plus, Trash2, ArrowRight, Filter, Send, Settings, X } from 'lucide-react';
import { toast } from 'sonner';
import { qk } from '@/lib/query-keys';
import { apiRequest } from '@/lib/query-client';
import { Page, Logo, Empty, PageTitle, SectorPill, Tag, VerifiedBadge, RaisingDot, Flag, AudiencePill } from '@/components/ui/atoms';
import { WatchlistPicker } from '@/components/ui/watchlist-picker';
import { useConfirm } from '@/components/ui/confirm-dialog';
import {
	Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';

/**
 * `/lists` — unified personal collections page.
 *
 * Three tabs:
 *  1. Liked companies — reads `/api/favorites/companies` (per-user, requires auth)
 *     then batch-fetches details via `/api/companies?ids=…`.
 *  2. Watchlists — the user's own editable watchlists from `/api/user-watchlists`;
 *     create / add company / remove company / delete are wired to real mutations.
 *  3. Saved searches — `/api/saved-searches`; each row replays its filters
 *     via the entity page path map.
 *
 * Deep-links: `?tab=liked|watchlists|saved-searches` selects the tab.
 */

type Tab = 'liked' | 'watchlists' | 'saved-searches';

interface FavoriteRow {
	id: string;
	company_id?: string;
	investor_id?: string;
	deal_id?: string;
	ecosystem_entity_id?: string;
	note?: string | null;
	created_at?: string;
}
interface FavoritesResponse { data: FavoriteRow[]; total: number }

interface CompanyRow {
	id: string;
	name: string;
	slug?: string;
	website?: string | null;
	custom_logo_url?: string | null;
	description?: string | null;
	primary_sector?: string | null;
	primary_sector_slug?: string | null;
	hq_country?: string | null;
	hq_city?: string | null;
	total_funding_usd?: number | string | null;
	stage?: string | null;
	founded_year?: number | null;
	is_verified?: boolean | null;
	is_actively_raising?: boolean | null;
}
interface CompaniesResponse { data: CompanyRow[] }

interface Watchlist {
	id: string;
	name: string;
	description?: string | null;
	color?: string | null;
	company_count?: number | null;
	updated_at?: string;
}
interface WatchlistsResponse { data: Watchlist[] }

type WatchlistCompany = CompanyRow;
interface WatchlistCompaniesResponse { data: WatchlistCompany[] }

interface SavedSearch {
	id: string;
	name: string;
	entity_type: string;
	filters?: Record<string, unknown> | null;
	results_count?: number | null;
	alert_enabled?: boolean | null;
	updated_at?: string;
}
interface SavedSearchesResponse { data: SavedSearch[] }

const ENTITY_PATHS: Record<string, string> = {
	companies: '/companies',
	deals: '/funding',
	investors: '/investors',
	acquisitions: '/ma',
	reports: '/reports',
	programs: '/programs',
	events: '/events',
};

export default function ListsPage() {
	const router = useRouter();
	const pathname = usePathname();
	const params = useSearchParams();
	const initialTab = (params.get('tab') as Tab) ?? 'liked';
	const [tab, setTab] = useState<Tab>(initialTab);
	const [pickerOpen, setPickerOpen] = useState(false);

	const { data: favs } = useSWR<FavoritesResponse>(qk.favorites.list('companies'));
	const { data: watchlistsResp } = useSWR<WatchlistsResponse>(qk.userWatchlists.list());
	const { data: savedResp } = useSWR<SavedSearchesResponse>(qk.savedSearches.list());

	const likedCount = favs?.data?.length ?? 0;
	const watchlistCount = watchlistsResp?.data?.length ?? 0;
	const savedCount = savedResp?.data?.length ?? 0;
	const totalCount = likedCount + watchlistCount + savedCount;

	// Liked-company *details* (name/sector/etc.) for the active-tab CSV export.
	// Dedupes with LikedTab's identical fetch via the shared SWR cache key.
	const likedIds = (favs?.data ?? []).map((f) => f.company_id).filter(Boolean) as string[];
	const { data: likedCompaniesResp } = useSWR<CompaniesResponse>(
		likedIds.length > 0 ? qk.compare.companies(likedIds) : null,
	);

	// Export the currently-active tab's loaded rows as CSV.
	const exportActiveTab = () => {
		if (tab === 'liked') {
			const rows = likedCompaniesResp?.data ?? [];
			if (rows.length === 0) { toast.error('Nothing to export yet'); return; }
			downloadCompaniesCsv(rows, 'liked-companies.csv');
		} else if (tab === 'watchlists') {
			const lists = watchlistsResp?.data ?? [];
			if (lists.length === 0) { toast.error('Nothing to export yet'); return; }
			downloadWatchlistsCsv(lists, 'watchlists.csv');
		} else {
			const searches = savedResp?.data ?? [];
			if (searches.length === 0) { toast.error('Nothing to export yet'); return; }
			downloadSavedSearchesCsv(searches, 'saved-searches.csv');
		}
	};

	useEffect(() => {
		const sp = new URLSearchParams(params.toString());
		if (tab === 'liked') sp.delete('tab'); else sp.set('tab', tab);
		const qs = sp.toString();
		router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [tab]);

	return (
		<Page>
			<PageTitle
				kicker={`Your saves · ${totalCount} items`}
				title="My Lists"
				sub="Liked companies, watchlists, and saved searches — all in one place."
				action={
					<div style={{ display: 'flex', gap: 8 }}>
						<button
							className="btn ghost"
							onClick={exportActiveTab}
							title="Export the current tab's rows as a CSV file"
						>
							<Send size={12} /> Export all
						</button>
						<button className="btn" onClick={() => setPickerOpen(true)}>
							<Plus size={12} /> New watchlist
						</button>
					</div>
				}
			/>

			<nav className="co-page-tabs" role="tablist" style={{ marginBottom: 24 }}>
				{[
					{ key: 'liked' as Tab, label: 'Liked companies', count: likedCount },
					{ key: 'watchlists' as Tab, label: 'Watchlists', count: watchlistCount },
					{ key: 'saved-searches' as Tab, label: 'Saved searches', count: savedCount },
				].map((t) => (
					<button
						key={t.key}
						role="tab"
						aria-selected={tab === t.key}
						className={`co-page-tab ${tab === t.key ? 'on' : ''}`}
						onClick={() => setTab(t.key)}
					>
						{t.label}
						<span className="co-page-tab-count">{t.count}</span>
					</button>
				))}
			</nav>

			{tab === 'liked' && <LikedTab />}
			{tab === 'watchlists' && <WatchlistsTab />}
			{tab === 'saved-searches' && <SavedSearchesTab />}

			<WatchlistPicker
				open={pickerOpen}
				onClose={() => setPickerOpen(false)}
				companyId={null}
			/>
		</Page>
	);
}

// ─── LIKED COMPANIES ──────────────────────────────────────────────────────

function LikedTab() {
	const { data: favs, isLoading } = useSWR<FavoritesResponse>(
		qk.favorites.list('companies'),
		{ dedupingInterval: 30_000 },
	);

	const ids = (favs?.data ?? []).map((f) => f.company_id).filter(Boolean) as string[];

	const { data: companiesResp } = useSWR<CompaniesResponse>(
		ids.length > 0 ? qk.compare.companies(ids) : null,
		{ dedupingInterval: 5 * 60_000 },
	);
	const companies = companiesResp?.data ?? [];

	if (isLoading) return <Empty msg="Loading…" />;
	if (companies.length === 0) {
		return (
			<div className="card flt-empty-state">
				<h3>No liked companies yet</h3>
				<p>Click the heart icon on any company to add it here.</p>
			</div>
		);
	}

	return (
		<>
			<div className="lists-toolbar">
				<span className="lists-meta">{companies.length} companies · sorted by date saved</span>
				<div style={{ display: 'flex', gap: 6 }}>
					<button className="btn ghost" disabled title="Filtering not available yet">
						<Filter size={12} /> Filter
					</button>
					<button
						className="btn ghost"
						onClick={() => downloadCompaniesCsv(companies, 'liked-companies.csv')}
						title="Download these companies as a CSV file"
					>
						<Send size={12} /> Export CSV
					</button>
				</div>
			</div>
			<div className="co-grid">
				{companies.map((c) => <LikedCard key={c.id} c={c} />)}
			</div>
		</>
	);
}

function LikedCard({ c }: { c: CompanyRow }) {
	return (
		<Link href={`/companies/${c.slug ?? c.id}`} className="card co-card" style={{ display: 'block' }}>
			<div className="co-card-head">
				<Heart size={14} fill="var(--accent)" stroke="var(--accent)" />
				<Logo co={{ name: c.name, website: c.website, custom_logo_url: c.custom_logo_url }} size={44} />
				<div style={{ flex: 1, minWidth: 0 }}>
					<div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
						<span style={{ fontWeight: 700, fontSize: 15 }}>{c.name}</span>
						{c.is_verified && <VerifiedBadge size={13} />}
						{c.is_actively_raising && <RaisingDot size={8} />}
					</div>
					<div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>
						{c.hq_city ?? c.hq_country ?? '—'}
						{c.founded_year ? ` · Founded ${c.founded_year}` : ''}
					</div>
				</div>
			</div>
			<p className="co-sub">{c.description ?? '—'}</p>
			<div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
				{c.primary_sector && <SectorPill name={c.primary_sector} />}
				{c.stage && <Tag>{c.stage}</Tag>}
			</div>
		</Link>
	);
}

// ─── WATCHLISTS (user-owned, editable) ────────────────────────────────────

function WatchlistsTab() {
	const confirm = useConfirm();
	const { data, isLoading, mutate } = useSWR<WatchlistsResponse>(
		qk.userWatchlists.list(),
		{ dedupingInterval: 30_000 },
	);
	const lists = useMemo(() => data?.data ?? [], [data]);

	const [selected, setSelected] = useState<string | null>(null);
	const [newOpen, setNewOpen] = useState(false);
	const [renameTarget, setRenameTarget] = useState<Watchlist | null>(null);
	const [sharing, setSharing] = useState(false);

	useEffect(() => {
		if (lists.length === 0) { setSelected(null); return; }
		if (!selected || !lists.some((l) => l.id === selected)) setSelected(lists[0].id);
	}, [lists, selected]);

	const { data: companiesResp, mutate: mutateCompanies } = useSWR<WatchlistCompaniesResponse>(
		selected ? qk.userWatchlists.companies(selected) : null,
		{ dedupingInterval: 30_000 },
	);
	const rows = companiesResp?.data ?? [];
	const selectedList = lists.find((l) => l.id === selected) ?? null;

	const deleteList = async (id: string) => {
		if (!(await confirm({
			title: 'Delete watchlist?',
			description: 'This watchlist and its contents will be permanently removed.',
			confirmLabel: 'Delete',
			destructive: true,
		}))) return;
		try {
			await apiRequest('DELETE', `/api/user-watchlists/${id}`);
			toast.success('Watchlist deleted');
			void mutate();
		} catch (e) {
			toast.error((e as Error).message ?? 'Could not delete');
		}
	};

	const removeCompany = async (companyId: string) => {
		if (!selected) return;
		try {
			await apiRequest('DELETE', `/api/user-watchlists/${selected}/companies/${companyId}`);
			void mutateCompanies();
			void mutate();
		} catch (e) {
			toast.error((e as Error).message ?? 'Could not remove');
		}
	};

	const shareList = async (id: string) => {
		setSharing(true);
		try {
			const res = await apiRequest('POST', `/api/user-watchlists/${id}/share`);
			const { share_token } = (await res.json()) as { share_token: string };
			const link = `${window.location.origin}/w/${share_token}`;
			try {
				await navigator.clipboard.writeText(link);
				toast.success('Share link copied to clipboard');
			} catch {
				toast.success(`Share link: ${link}`);
			}
		} catch (e) {
			toast.error((e as Error).message ?? 'Could not create share link');
		} finally {
			setSharing(false);
		}
	};

	if (isLoading) return <Empty msg="Loading…" />;
	if (lists.length === 0) {
		return (
			<>
				<div className="card flt-empty-state">
					<h3>No watchlists yet</h3>
					<p>Create a watchlist to start grouping companies you want to track.</p>
					<button className="btn" style={{ marginTop: 12 }} onClick={() => setNewOpen(true)}>
						<Plus size={12} /> New watchlist
					</button>
				</div>
				<WatchlistPicker open={newOpen} onClose={() => { setNewOpen(false); void mutate(); }} companyId={null} />
			</>
		);
	}

	return (
		<div className="wl-layout">
			<aside className="wl-rail">
				<div className="wl-rail-head">
					<span className="lists-meta">{lists.length} watchlists</span>
					<button className="btn ghost" title="New watchlist" onClick={() => setNewOpen(true)}>
						<Plus size={12} /> New
					</button>
				</div>
				{lists.map((l) => (
					<button
						key={l.id}
						type="button"
						className={`wl-item ${selected === l.id ? 'on' : ''}`}
						onClick={() => setSelected(l.id)}
					>
						<span className="wl-dot" style={{ background: l.color ?? 'var(--accent)' }} />
						<div style={{ minWidth: 0, flex: 1, textAlign: 'left' }}>
							<div className="wl-name">{l.name}</div>
							<div className="wl-meta">
								{(l.company_count ?? 0)} cos
								{l.updated_at && <> · {formatShortDate(l.updated_at)}</>}
							</div>
						</div>
					</button>
				))}
			</aside>

			<div className="wl-detail">
				{selectedList && (
					<>
						<div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, gap: 16 }}>
							<div style={{ minWidth: 0 }}>
								<div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
									<span className="wl-dot" style={{ background: selectedList.color ?? 'var(--accent)', width: 12, height: 12 }} />
									<h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, letterSpacing: '-0.01em', margin: 0 }}>
										{selectedList.name}
									</h2>
								</div>
								{selectedList.description && (
									<p style={{ fontSize: 13, color: 'var(--fg-2)', maxWidth: 540, margin: 0 }}>
										{selectedList.description}
									</p>
								)}
								<div className="lists-meta" style={{ marginTop: 6 }}>
									{rows.length} companies
									{selectedList.updated_at && <> · updated {formatShortDate(selectedList.updated_at)}</>}
								</div>
							</div>
							<div style={{ display: 'flex', gap: 6 }}>
								<button className="btn ghost" disabled title="Add companies from a company's page using the heart / watchlist button">
									<Plus size={12} /> Add company
								</button>
								<button
									className="btn ghost"
									disabled={rows.length === 0}
									onClick={() => downloadCompaniesCsv(rows, `${slugify(selectedList.name)}.csv`)}
									title="Download this watchlist as a CSV file"
								>
									<Send size={12} /> Export CSV
								</button>
								<button
									className="btn ghost"
									disabled={sharing}
									onClick={() => void shareList(selectedList.id)}
									title="Create a public share link and copy it to your clipboard"
								>
									<Send size={12} /> Share
								</button>
								<button
									className="btn ghost"
									onClick={() => setRenameTarget(selectedList)}
									title="Rename this watchlist"
								>
									<Settings size={12} />
								</button>
								<button
									className="btn ghost"
									style={{ color: 'var(--accent)' }}
									onClick={() => void deleteList(selectedList.id)}
									title="Delete watchlist"
								>
									<Trash2 size={12} />
								</button>
							</div>
						</div>

						{rows.length === 0 ? (
							<div className="co-empty">No companies in this watchlist yet.</div>
						) : (
							<div className="card" style={{ padding: 0 }}>
								<table className="data-table co-table">
									<thead>
										<tr>
											<th style={{ width: 36 }}></th>
											<th>Company</th>
											<th>Sector</th>
											<th>HQ</th>
											<th>Founded</th>
											<th style={{ width: 36 }}></th>
										</tr>
									</thead>
									<tbody>
										{rows.map((c) => (
											<tr key={c.id}>
												<td>
													<span className="co-fav-btn" title="In watchlist">
														<Heart size={13} fill="var(--accent)" stroke="var(--accent)" />
													</span>
												</td>
												<td>
													<Link href={`/companies/${c.slug ?? c.id}`} className="tbl-name-cell">
														<Logo co={{ name: c.name, website: c.website, custom_logo_url: c.custom_logo_url }} size={28} />
														<div className="tbl-name-text">
															<div className="tbl-name-line">
																<span className="co-row-name">{c.name}</span>
																{c.is_verified && <VerifiedBadge size={12} />}
																{c.is_actively_raising && <RaisingDot size={7} />}
															</div>
															{c.description && (
																<div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{c.description}</div>
															)}
														</div>
													</Link>
												</td>
												<td>
													{c.primary_sector_slug ? (
														<AudiencePill sectorSlug={c.primary_sector_slug} label={c.primary_sector ?? undefined} size="sm" />
													) : c.primary_sector ? (
														<SectorPill name={c.primary_sector} />
													) : '—'}
												</td>
												<td>
													<span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
														{c.hq_country && <Flag cc={countryCode(c.hq_country)} />}
														{[c.hq_city, c.hq_country].filter(Boolean).join(', ') || '—'}
													</span>
												</td>
												<td className="num">{c.founded_year ?? '—'}</td>
												<td>
													<button
														className="co-fav-btn"
														onClick={() => void removeCompany(c.id)}
														title="Remove from watchlist"
													>
														<X size={12} />
													</button>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						)}
					</>
				)}
			</div>

			<WatchlistPicker open={newOpen} onClose={() => { setNewOpen(false); void mutate(); }} companyId={null} />

			<RenameDialog
				key={renameTarget?.id ?? 'wl-rename'}
				open={renameTarget !== null}
				title="Rename watchlist"
				initialName={renameTarget?.name ?? ''}
				onClose={() => setRenameTarget(null)}
				onSave={async (name) => {
					if (!renameTarget) return;
					await apiRequest('PATCH', `/api/user-watchlists/${renameTarget.id}`, { name });
					toast.success('Watchlist renamed');
					await mutate();
				}}
			/>
		</div>
	);
}

// ─── SAVED SEARCHES ────────────────────────────────────────────────────────

function SavedSearchesTab() {
	const confirm = useConfirm();
	const router = useRouter();
	const { data, isLoading, mutate } = useSWR<SavedSearchesResponse>(
		qk.savedSearches.list(),
		{ dedupingInterval: 30_000 },
	);
	const [renameTarget, setRenameTarget] = useState<SavedSearch | null>(null);

	const removeSearch = async (id: string) => {
		if (!(await confirm({
			title: 'Remove saved search?',
			description: 'This saved search will be deleted.',
			confirmLabel: 'Remove',
			destructive: true,
		}))) return;
		try {
			await apiRequest('DELETE', `/api/saved-searches/${id}`);
			toast.success('Removed');
			void mutate();
		} catch (e) {
			toast.error((e as Error).message ?? 'Could not remove');
		}
	};

	const toggleAlert = async (s: SavedSearch) => {
		const next = !s.alert_enabled;
		// Optimistic: flip the flag in cache, then revalidate from the server.
		await mutate(
			(cur) => cur && {
				...cur,
				data: cur.data.map((x) => (x.id === s.id ? { ...x, alert_enabled: next } : x)),
			},
			{ revalidate: false },
		);
		try {
			await apiRequest('PATCH', `/api/saved-searches/${s.id}`, { alert_enabled: next });
			toast.success(next ? 'Alerts on for this search' : 'Alerts off');
		} catch (e) {
			toast.error((e as Error).message ?? 'Could not update alerts');
		} finally {
			void mutate();
		}
	};

	const replay = (s: SavedSearch) => {
		const base = ENTITY_PATHS[s.entity_type] ?? '/';
		const sp = new URLSearchParams();
		if (s.filters) {
			for (const [k, v] of Object.entries(s.filters)) {
				if (v == null || v === '') continue;
				if (Array.isArray(v)) sp.set(k, v.join(','));
				else sp.set(k, String(v));
			}
		}
		const qs = sp.toString();
		router.push(qs ? `${base}?${qs}` : base);
	};

	const searches = data?.data ?? [];
	const alertCount = searches.filter((s) => s.alert_enabled).length;

	if (isLoading) return <Empty msg="Loading…" />;
	if (searches.length === 0) {
		return (
			<div className="card flt-empty-state">
				<h3>No saved searches yet</h3>
				<p>From any list page, save your current filters to revisit them here.</p>
			</div>
		);
	}

	return (
		<>
			<div className="lists-toolbar">
				<span className="lists-meta">
					{searches.length} saved searches
					{alertCount > 0 && ` · ${alertCount} with active alerts`}
				</span>
				<button className="btn" disabled title="Save the current filters from a list page">
					<Plus size={12} /> Save current filters
				</button>
			</div>
			<div className="ss-grid">
				{searches.map((s) => (
					<div key={s.id} className="card ss-card">
						<div className="ss-head">
							<div style={{ minWidth: 0 }}>
								<div className="ss-name">{s.name}</div>
								<div className="lists-meta" style={{ marginTop: 2 }}>
									{s.results_count != null ? `${s.results_count} matches` : s.entity_type}
									{s.updated_at && <> · updated {formatShortDate(s.updated_at)}</>}
								</div>
							</div>
							<button
								className={`ss-alert ${s.alert_enabled ? 'on' : ''}`}
								title={s.alert_enabled ? 'Alerts on — click to disable' : 'Click to enable alerts'}
								onClick={() => void toggleAlert(s)}
							>
								<Bell size={13} /> {s.alert_enabled ? 'Alerts on' : 'Alerts off'}
							</button>
						</div>
						{s.filters && Object.keys(s.filters).length > 0 && (
							<div className="ss-chips">
								{Object.entries(s.filters).slice(0, 6).map(([k, v]) => (
									<span key={k} className="ss-chip">
										<span className="ss-chip-k">{k.replace(/_/g, ' ')}</span>
										<span className="ss-chip-v">{Array.isArray(v) ? v.join(', ') : String(v)}</span>
									</span>
								))}
							</div>
						)}
						<div className="ss-actions">
							<button className="btn" onClick={() => replay(s)}>
								<ArrowRight size={12} /> Run search
							</button>
							<button
								className="btn ghost"
								onClick={() => setRenameTarget(s)}
								title="Rename this saved search"
							>
								<Settings size={12} /> Edit
							</button>
							<button
								className="btn ghost"
								style={{ marginLeft: 'auto', color: 'var(--accent)' }}
								onClick={() => void removeSearch(s.id)}
								title="Delete saved search"
							>
								<Trash2 size={12} />
							</button>
						</div>
					</div>
				))}
			</div>

			<RenameDialog
				key={renameTarget?.id ?? 'ss-rename'}
				open={renameTarget !== null}
				title="Rename saved search"
				initialName={renameTarget?.name ?? ''}
				onClose={() => setRenameTarget(null)}
				onSave={async (name) => {
					if (!renameTarget) return;
					await apiRequest('PATCH', `/api/saved-searches/${renameTarget.id}`, { name });
					toast.success('Saved search renamed');
					await mutate();
				}}
			/>
		</>
	);
}

function RenameDialog({
	open, title, initialName, onClose, onSave,
}: {
	open: boolean;
	title: string;
	initialName: string;
	onClose: () => void;
	onSave: (name: string) => Promise<void>;
}) {
	const [name, setName] = useState(initialName);
	const [saving, setSaving] = useState(false);

	const submit = async () => {
		const trimmed = name.trim();
		if (!trimmed) { toast.error('Name is required'); return; }
		setSaving(true);
		try {
			await onSave(trimmed);
			onClose();
		} catch (e) {
			toast.error((e as Error).message ?? 'Could not save');
		} finally {
			setSaving(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription>Give it a clear, memorable name.</DialogDescription>
				</DialogHeader>
				<input
					value={name}
					autoFocus
					maxLength={120}
					onChange={(e) => setName(e.target.value)}
					onKeyDown={(e) => { if (e.key === 'Enter') void submit(); }}
					placeholder="Name"
					style={{
						width: '100%',
						padding: '8px 10px',
						borderRadius: 8,
						border: '1px solid var(--border)',
						background: 'var(--bg-1, var(--background))',
						color: 'var(--fg, var(--foreground))',
						fontSize: 14,
					}}
				/>
				<DialogFooter>
					<button className="btn ghost" onClick={onClose} disabled={saving}>Cancel</button>
					<button className="btn" onClick={() => void submit()} disabled={saving}>
						{saving ? 'Saving…' : 'Save'}
					</button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

// ─── Utils ────────────────────────────────────────────────────────────────

function formatShortDate(iso: string): string {
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return iso;
	return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
}

function countryCode(countryName: string): string {
	const map: Record<string, string> = {
		'United States': 'US', USA: 'US', 'United Kingdom': 'GB', UK: 'GB',
		Germany: 'DE', France: 'FR', Italy: 'IT', Spain: 'ES', Netherlands: 'NL',
		'The Netherlands': 'NL', Sweden: 'SE', Switzerland: 'CH', Belgium: 'BE',
		Austria: 'AT', Poland: 'PL', India: 'IN', China: 'CN', Japan: 'JP',
		Singapore: 'SG', Australia: 'AU', Brazil: 'BR', Canada: 'CA', Portugal: 'PT',
		Ireland: 'IE', Finland: 'FI', Norway: 'NO', Denmark: 'DK', Israel: 'IL',
		'Saudi Arabia': 'SA', UAE: 'AE', 'United Arab Emirates': 'AE',
		Mexico: 'MX', 'South Korea': 'KR', Korea: 'KR',
	};
	return map[countryName] ?? countryName.slice(0, 2).toUpperCase();
}

/** Filesystem-safe slug for export filenames. */
function slugify(name: string): string {
	const s = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
	return s || 'watchlist';
}

/** Quote a single CSV cell per RFC 4180 (wrap + double internal quotes). */
function csvCell(value: unknown): string {
	if (value == null) return '';
	const s = String(value);
	return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * Build a CSV string from already-loaded company rows and trigger a browser
 * download. No backend involved — serializes the columns shown in the table.
 */
function downloadCompaniesCsv(rows: CompanyRow[], filename: string): void {
	const headers = ['Name', 'Sector', 'HQ City', 'HQ Country', 'Stage', 'Founded', 'Total Funding (USD)', 'Verified'];
	const lines = [headers.map(csvCell).join(',')];
	for (const c of rows) {
		lines.push([
			c.name,
			c.primary_sector ?? '',
			c.hq_city ?? '',
			c.hq_country ?? '',
			c.stage ?? '',
			c.founded_year ?? '',
			c.total_funding_usd ?? '',
			c.is_verified ? 'yes' : 'no',
		].map(csvCell).join(','));
	}
	triggerCsvDownload(lines.join('\r\n'), filename);
}

/** Serialize the user's watchlists (metadata only) to CSV. */
function downloadWatchlistsCsv(rows: Watchlist[], filename: string): void {
	const headers = ['Name', 'Description', 'Companies', 'Updated'];
	const lines = [headers.map(csvCell).join(',')];
	for (const w of rows) {
		lines.push([
			w.name,
			w.description ?? '',
			w.company_count ?? 0,
			w.updated_at ?? '',
		].map(csvCell).join(','));
	}
	triggerCsvDownload(lines.join('\r\n'), filename);
}

/** Serialize the user's saved searches to CSV (filters flattened to JSON). */
function downloadSavedSearchesCsv(rows: SavedSearch[], filename: string): void {
	const headers = ['Name', 'Entity', 'Matches', 'Alerts', 'Filters', 'Updated'];
	const lines = [headers.map(csvCell).join(',')];
	for (const s of rows) {
		lines.push([
			s.name,
			s.entity_type,
			s.results_count ?? '',
			s.alert_enabled ? 'on' : 'off',
			s.filters ? JSON.stringify(s.filters) : '',
			s.updated_at ?? '',
		].map(csvCell).join(','));
	}
	triggerCsvDownload(lines.join('\r\n'), filename);
}

/** Wrap a CSV string in a UTF-8 BOM blob and trigger a browser download. */
function triggerCsvDownload(csv: string, filename: string): void {
	const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}
