'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { Bell, Heart, Plus, Trash2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { qk } from '@/lib/query-keys';
import { apiRequest } from '@/lib/query-client';
import { Page, Logo, Flag, Empty, PageTitle, SectorPill, Tag } from '@/components/ui/atoms';

/**
 * `/lists` — unified personal collections page.
 *
 * Three tabs:
 *  1. Liked companies — reads `/api/favorites/companies` (per-user, requires auth)
 *     then batch-fetches details via `/api/companies?ids=…`.
 *  2. Pinned lists — curated/editorial lists from `/api/pinned-lists`.
 *  3. Saved searches — `/api/saved-searches`; each row replays its filters
 *     via the entity page path map.
 *
 * Deep-links: `?tab=liked|pinned|saved-searches` selects the tab.
 */

type Tab = 'liked' | 'pinned' | 'saved-searches';

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
}
interface CompaniesResponse { data: CompanyRow[] }

interface PinnedList {
	id: string;
	name: string;
	description?: string | null;
	color?: string | null;
	company_count?: number | null;
	updated_at?: string;
}
interface PinnedListsResponse { data: PinnedList[] }
interface PinnedListsArray extends Array<PinnedList> {}

interface PinnedListCompany {
	id: string;
	name: string;
	slug?: string;
	primary_sector?: string | null;
	hq_country?: string | null;
	stage?: string | null;
}

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
				kicker="My collections"
				title="Lists"
				sub="Liked companies, curated lists, and saved searches — all in one place."
			/>

			<nav className="co-page-tabs" role="tablist" style={{ marginBottom: 24 }}>
				{[
					{ key: 'liked' as Tab, label: 'Liked companies' },
					{ key: 'pinned' as Tab, label: 'Pinned lists' },
					{ key: 'saved-searches' as Tab, label: 'Saved searches' },
				].map((t) => (
					<button
						key={t.key}
						role="tab"
						aria-selected={tab === t.key}
						className={`co-page-tab ${tab === t.key ? 'on' : ''}`}
						onClick={() => setTab(t.key)}
					>
						{t.label}
					</button>
				))}
			</nav>

			{tab === 'liked' && <LikedTab />}
			{tab === 'pinned' && <PinnedTab />}
			{tab === 'saved-searches' && <SavedSearchesTab />}
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
				<span className="lists-meta">
					<Heart size={11} style={{ verticalAlign: 'middle', marginRight: 6 }} />
					{companies.length} liked
				</span>
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
				<Logo co={{ name: c.name }} size={44} />
				<div style={{ flex: 1, minWidth: 0 }}>
					<div style={{ fontWeight: 700, fontSize: 15 }}>{c.name}</div>
					<div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>
						{c.hq_city ?? c.hq_country ?? '—'}
					</div>
				</div>
				<Heart size={14} fill="var(--accent)" stroke="var(--accent)" />
			</div>
			<p className="co-sub">{c.description ?? '—'}</p>
			<div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
				{c.primary_sector && <SectorPill name={c.primary_sector} />}
				{c.stage && <Tag>{c.stage}</Tag>}
			</div>
		</Link>
	);
}

// ─── PINNED LISTS (editorial / curated) ──────────────────────────────────

function PinnedTab() {
	const { data, isLoading } = useSWR<PinnedListsResponse | PinnedListsArray>(
		qk.pinnedLists.list(),
		{ dedupingInterval: 60_000 },
	);
	const lists = useMemo(() => {
		if (!data) return [];
		return Array.isArray(data) ? data : data.data;
	}, [data]);

	const [selected, setSelected] = useState<string | null>(null);
	useEffect(() => {
		if (!selected && lists.length > 0) setSelected(lists[0].id);
	}, [lists, selected]);

	const { data: listCompanies } = useSWR<PinnedListCompany[] | { data: PinnedListCompany[] }>(
		selected ? qk.pinnedLists.detail(selected) : null,
		{ dedupingInterval: 30_000 },
	);

	if (isLoading) return <Empty msg="Loading…" />;
	if (lists.length === 0) {
		return (
			<div className="card flt-empty-state">
				<h3>No pinned lists</h3>
				<p>Curated collections will appear here.</p>
			</div>
		);
	}

	const detailRows = listCompanies
		? Array.isArray(listCompanies) ? listCompanies : (listCompanies.data ?? [])
		: [];
	const selectedList = lists.find((l) => l.id === selected);

	return (
		<div className="wl-layout">
			<aside className="wl-rail">
				<div className="wl-rail-head">
					<span className="lists-meta">{lists.length} lists</span>
					<button className="icon-btn" title="New list (coming soon)" disabled>
						<Plus size={14} />
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
						<div style={{ minWidth: 0 }}>
							<div className="wl-name">{l.name}</div>
							<div className="wl-meta">
								{(l.company_count ?? 0)} cos
								{l.updated_at && <> · upd {formatShortDate(l.updated_at)}</>}
							</div>
						</div>
					</button>
				))}
			</aside>

			<div>
				{selectedList && (
					<>
						<div style={{ marginBottom: 16 }}>
							<h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, margin: 0 }}>
								{selectedList.name}
							</h3>
							{selectedList.description && (
								<p style={{ fontSize: 13, color: 'var(--fg-2)', marginTop: 4 }}>
									{selectedList.description}
								</p>
							)}
						</div>
						{detailRows.length === 0 ? (
							<div className="co-empty">No companies in this list.</div>
						) : (
							<div className="card" style={{ padding: 0 }}>
								<table className="data-table">
									<thead>
										<tr>
											<th>Company</th>
											<th>Sector</th>
											<th>Stage</th>
											<th>HQ</th>
										</tr>
									</thead>
									<tbody>
										{detailRows.map((c) => (
											<tr key={c.id}>
												<td>
													<Link href={`/companies/${c.slug ?? c.id}`} className="tbl-name-cell">
														<Logo co={{ name: c.name }} size={24} />
														<div className="tbl-name-text">
															<div className="tbl-name-line"><span className="tbl-name">{c.name}</span></div>
														</div>
													</Link>
												</td>
												<td>{c.primary_sector ? <SectorPill name={c.primary_sector} /> : '—'}</td>
												<td>{c.stage ? <Tag>{c.stage}</Tag> : '—'}</td>
												<td>{c.hq_country ?? '—'}</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						)}
					</>
				)}
			</div>
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
				<span className="lists-meta">{searches.length} saved</span>
			</div>
			<div className="ss-grid">
				{searches.map((s) => (
					<div key={s.id} className="card ss-card">
						<div className="ss-head">
							<div style={{ minWidth: 0 }}>
								<div className="ss-name">{s.name}</div>
								<div className="lists-meta" style={{ marginTop: 2 }}>
									{s.entity_type}
									{s.results_count != null && <> · {s.results_count} matches</>}
									{s.updated_at && <> · upd {formatShortDate(s.updated_at)}</>}
								</div>
							</div>
							<button className={`ss-alert ${s.alert_enabled ? 'on' : ''}`} title={s.alert_enabled ? 'Alerts on' : 'Enable alerts'} disabled>
								<Bell size={11} /> {s.alert_enabled ? 'On' : 'Off'}
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
								Run search <ArrowRight size={12} />
							</button>
							<button
								className="btn ghost"
								style={{ color: 'var(--accent)' }}
								onClick={() => void removeSearch(s.id)}
								title="Remove"
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
