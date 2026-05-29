'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { Bell, Heart, Plus, Trash2, ArrowRight, Filter, Send, Settings, X } from 'lucide-react';
import { toast } from 'sonner';
import { qk } from '@/lib/query-keys';
import { apiRequest } from '@/lib/query-client';
import { Page, Logo, Empty, PageTitle, SectorPill, Tag, VerifiedBadge, RaisingDot } from '@/components/ui/atoms';
import { WatchlistPicker } from '@/components/ui/watchlist-picker';

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
	description?: string | null;
	primary_sector?: string | null;
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

interface WatchlistCompany extends CompanyRow {}
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
	deals: '/deals',
	investors: '/investors',
	acquisitions: '/acquisitions',
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
							disabled
							title="Export not available yet"
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
					<button className="btn ghost" disabled title="Export not available yet">
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
				<Logo co={{ name: c.name }} size={44} />
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
	const { data, isLoading, mutate } = useSWR<WatchlistsResponse>(
		qk.userWatchlists.list(),
		{ dedupingInterval: 30_000 },
	);
	const lists = useMemo(() => data?.data ?? [], [data]);

	const [selected, setSelected] = useState<string | null>(null);
	const [newOpen, setNewOpen] = useState(false);

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
		if (!confirm('Delete this watchlist?')) return;
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
								<button className="btn ghost" disabled title="Sharing not available yet">
									<Send size={12} /> Share
								</button>
								<button className="btn ghost" disabled title="Watchlist settings not available yet">
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
														<Logo co={{ name: c.name }} size={28} />
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
												<td>{c.primary_sector ? <SectorPill name={c.primary_sector} /> : '—'}</td>
												<td>{c.hq_city ?? c.hq_country ?? '—'}</td>
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
		</div>
	);
}

// ─── SAVED SEARCHES ────────────────────────────────────────────────────────

function SavedSearchesTab() {
	const router = useRouter();
	const { data, isLoading, mutate } = useSWR<SavedSearchesResponse>(
		qk.savedSearches.list(),
		{ dedupingInterval: 30_000 },
	);

	const removeSearch = async (id: string) => {
		if (!confirm('Remove this saved search?')) return;
		try {
			await apiRequest('DELETE', `/api/saved-searches/${id}`);
			toast.success('Removed');
			void mutate();
		} catch (e) {
			toast.error((e as Error).message ?? 'Could not remove');
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
							<button className={`ss-alert ${s.alert_enabled ? 'on' : ''}`} title={s.alert_enabled ? 'Alerts on' : 'Enable alerts'} disabled>
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
							<button className="btn ghost" disabled title="Editing saved searches not available yet">
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
		</>
	);
}

// ─── Utils ────────────────────────────────────────────────────────────────

function formatShortDate(iso: string): string {
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return iso;
	return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
}
