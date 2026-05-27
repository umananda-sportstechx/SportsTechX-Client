'use client';

import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Plus, ChevronLeft, ChevronRight, Heart } from 'lucide-react';
import { qk } from '@/lib/query-keys';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { Page, Logo, Flag, SectorPill, Tag, Empty, PageTitle } from '@/components/ui/atoms';
import {
	FilterRail, ActiveFiltersBar, ViewToggle,
	emptyFilterState, type Facet, type FilterState,
} from '@/components/ui/filter-rail';
import { CompanyDrawer } from '@/components/ui/company-drawer';
import { CompareBar } from '@/components/compare-bar';
import { CompareToggle } from '@/components/compare-toggle';

interface CompanyRow {
	id: string;
	name: string;
	slug?: string;
	description?: string | null;
	primary_sector?: string | null;
	hq_city?: string | null;
	hq_country?: string | null;
	founded_year?: number | null;
	total_funding_usd?: number | string | null;
	stage?: string | null;
	last_round?: string | null;
	is_verified?: boolean | null;
	is_actively_raising?: boolean | null;
}

interface CompaniesResponse {
	data: CompanyRow[];
	total: number;
	page: number;
	totalPages: number;
}

interface SectorRef { id: string; name: string; slug: string }
interface RefResponse<T> { data: T[] }

export default function CompaniesPage() {
	const router = useRouter();
	const pathname = usePathname();
	const params = useSearchParams();

	const [view, setView] = useState<'grid' | 'table'>((params.get('view') as 'grid' | 'table') ?? 'grid');
	const [page, setPage] = useState(Number(params.get('page') ?? '1'));
	const [drawerTarget, setDrawerTarget] = useState<string | null>(null);

	// Facets — server-driven where possible. Options come from /api/sectors etc.
	const { data: sectorsResp } = useSWR<RefResponse<SectorRef> | SectorRef[]>(qk.reference.sectors(), {
		dedupingInterval: 60 * 60_000,
	});
	const sectorList = Array.isArray(sectorsResp) ? sectorsResp : (sectorsResp?.data ?? []);

	const facets = useMemo<Facet[]>(() => [
		{ key: 'is_verified', label: 'Verified', kind: 'bool' },
		{ key: 'is_actively_raising', label: 'Actively raising', kind: 'bool' },
		{
			key: 'sector_slug',
			label: 'Sector',
			kind: 'multi',
			options: () => sectorList.map((s) => ({ value: s.slug, label: s.name })),
			maxHeight: 240,
		},
		{
			key: 'country',
			label: 'Country',
			kind: 'multi',
			options: () => COMMON_COUNTRIES.map((c) => ({ value: c, label: c })),
		},
	], [sectorList]);

	// Hydrate filter state from URL on first render.
	const [filterState, setFilterState] = useState<FilterState>(() => {
		const init = emptyFilterState(facets, { search: params.get('q') ?? '' });
		const v = params.get('is_verified'); if (v) init.is_verified = v === 'true';
		const r = params.get('is_actively_raising'); if (r) init.is_actively_raising = r === 'true';
		const s = params.get('sector_slug') ?? params.get('sector');
		if (s) init.sector_slug = s.split(',').filter(Boolean);
		const c = params.get('country');
		if (c) init.country = c.split(',').filter(Boolean);
		return init;
	});

	// Mirror filter state → URL so deep-links work + the page survives refresh.
	useEffect(() => {
		const sp = new URLSearchParams();
		if (filterState.search) sp.set('q', filterState.search);
		if (filterState.is_verified === true) sp.set('is_verified', 'true');
		if (filterState.is_actively_raising === true) sp.set('is_actively_raising', 'true');
		const sec = filterState.sector_slug as string[] | undefined;
		if (sec?.length) sp.set('sector_slug', sec.join(','));
		const ctry = filterState.country as string[] | undefined;
		if (ctry?.length) sp.set('country', ctry.join(','));
		if (page > 1) sp.set('page', String(page));
		if (view !== 'grid') sp.set('view', view);
		const qs = sp.toString();
		router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
		// We intentionally omit pathname/router from deps — Next gives stable refs.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [filterState, page, view]);

	const debouncedSearch = useDebouncedValue(filterState.search ?? '', 300);

	const queryParams: Record<string, unknown> = { page, limit: 24 };
	if (debouncedSearch) queryParams.search = debouncedSearch;
	const sec = filterState.sector_slug as string[] | undefined;
	if (sec?.length === 1) queryParams.sector = sec[0];
	else if (sec?.length) queryParams.sector_slug = sec.join(',');
	const ctry = filterState.country as string[] | undefined;
	if (ctry?.length === 1) queryParams.country = ctry[0];
	const isVer = filterState.is_verified === true;
	if (isVer) queryParams.is_verified = true;
	const isRaising = filterState.is_actively_raising === true;
	if (isRaising) queryParams.is_actively_raising = true;

	const { data, isLoading } = useSWR<CompaniesResponse>(qk.companies.list(queryParams), {
		dedupingInterval: 3 * 60_000,
	});

	const companies = data?.data ?? [];
	const total = data?.total ?? 0;
	const totalPages = data?.totalPages ?? 1;

	return (
		<Page>
			<PageTitle
				kicker={`Database · ${total.toLocaleString()} entries`}
				title="Companies"
				action={<button className="btn"><Plus size={12} /> Add to watchlist</button>}
			/>

			<div className="flt-layout">
				<FilterRail
					facets={facets}
					state={filterState}
					setState={(s) => { setFilterState(s); setPage(1); }}
					defaultOpen={{ sector_slug: true }}
				/>

				<div className="flt-main">
					<ActiveFiltersBar
						facets={facets}
						state={filterState}
						setState={setFilterState}
						placeholder="Search companies, sectors, countries…"
						total={total}
						shown={companies.length}
						viewToggle={<ViewToggle view={view} setView={setView} />}
					/>

					{isLoading && companies.length === 0 ? (
						<Empty msg="Loading…" />
					) : companies.length === 0 ? (
						<div className="card flt-empty-state">
							<h3>No companies match</h3>
							<p>Try clearing some filters.</p>
						</div>
					) : view === 'grid' ? (
						<div className="co-grid">
							{companies.map((c) => (
								<CompanyCard key={c.id} c={c} onOpenDrawer={setDrawerTarget} />
							))}
						</div>
					) : (
						<div className="card">
							<table className="data-table">
								<thead>
									<tr>
										<th>Company</th>
										<th>Sector</th>
										<th>Stage</th>
										<th>HQ</th>
										<th style={{ textAlign: 'right' }}>Raised</th>
										<th>Last Round</th>
										<th>Founded</th>
									</tr>
								</thead>
								<tbody>
									{companies.map((c) => (
										<tr
											key={c.id}
											style={{ cursor: 'pointer' }}
											onClick={(e) => {
												const target = c.slug ?? c.id;
												if (e.metaKey || e.ctrlKey) {
													window.open(`/companies/${target}`, '_blank');
													return;
												}
												setDrawerTarget(target);
											}}
										>
											<td>
												<div className="tbl-name-cell">
													<Logo co={{ name: c.name }} size={28} />
													<div className="tbl-name-text">
														<div className="tbl-name-line"><span className="tbl-name">{c.name}</span></div>
														{c.description && <div className="tbl-sub">{c.description}</div>}
													</div>
												</div>
											</td>
											<td>{c.primary_sector ? <SectorPill name={c.primary_sector} /> : '—'}</td>
											<td>{c.stage ? <Tag>{c.stage}</Tag> : '—'}</td>
											<td>
												<span className="tbl-ellipsis">
													{c.hq_country && <Flag cc={countryCode(c.hq_country)} />}{' '}
													{c.hq_city ? `${c.hq_city}, ` : ''}{c.hq_country ?? ''}
												</span>
											</td>
											<td className="num" style={{ textAlign: 'right', fontWeight: 700 }}>
												{formatRaised(c.total_funding_usd)}
											</td>
											<td className="num">{c.last_round ?? '—'}</td>
											<td className="num">{c.founded_year ?? '—'}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}

					<CompanyDrawer
						idOrSlug={drawerTarget}
						onClose={() => setDrawerTarget(null)}
					/>

					<CompareBar kind="companies" />

					{totalPages > 1 && (
						<div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8, marginTop: 24 }}>
							<span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-muted)', marginRight: 8 }}>
								Page {page} of {totalPages}
							</span>
							<button className="btn ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>
								<ChevronLeft size={14} />
							</button>
							<button className="btn ghost" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
								<ChevronRight size={14} />
							</button>
						</div>
					)}
				</div>
			</div>
		</Page>
	);
}

function CompanyCard({ c, onOpenDrawer }: { c: CompanyRow; onOpenDrawer: (idOrSlug: string) => void }) {
	const cc = c.hq_country ? countryCode(c.hq_country) : '';
	const fav = (c.id.charCodeAt(c.id.length - 1) % 3) === 0;
	const target = c.slug ?? c.id;
	const handleClick = (e: React.MouseEvent) => {
		// Cmd/Ctrl/middle-click → open full page in new tab. Plain click → drawer.
		if (e.metaKey || e.ctrlKey || e.button === 1) {
			window.open(`/companies/${target}`, '_blank');
			return;
		}
		onOpenDrawer(target);
	};
	return (
		<button
			type="button"
			className="card co-card"
			style={{ display: 'block', width: '100%', textAlign: 'left', cursor: 'pointer' }}
			onClick={handleClick}
		>
			<div className="co-card-head">
				<Logo co={{ name: c.name }} size={44} />
				<div style={{ flex: 1, minWidth: 0 }}>
					<div style={{ fontWeight: 700, fontSize: 15 }}>{c.name}</div>
					<div style={{ fontSize: 11, color: 'var(--fg-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
						{cc && <Flag cc={cc} />}
						{c.hq_city ?? c.hq_country ?? '—'}
					</div>
				</div>
				{fav && <Heart size={14} fill="var(--accent)" stroke="var(--accent)" />}
			</div>
			<p className="co-sub">{c.description ?? '—'}</p>
			<div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, margin: '10px 0' }}>
				{c.primary_sector && <SectorPill name={c.primary_sector} />}
				{c.stage && <Tag>{c.stage}</Tag>}
			</div>
			<div className="co-card-foot">
				<div>
					<div className="co-stat-label">Total raised</div>
					<div className="co-stat-val">{formatRaised(c.total_funding_usd)}</div>
				</div>
				<div>
					<div className="co-stat-label">Last round</div>
					<div className="co-stat-val">{c.last_round ?? '—'}</div>
				</div>
				<div>
					<div className="co-stat-label">Founded</div>
					<div className="co-stat-val">{c.founded_year ?? '—'}</div>
				</div>
			</div>
			<div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
				<CompareToggle id={c.id} kind="companies" />
			</div>
		</button>
	);
}

function formatRaised(value: number | string | null | undefined): string {
	if (value == null) return '—';
	const n = typeof value === 'string' ? Number(value) : value;
	if (!Number.isFinite(n) || n === 0) return '—';
	if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
	if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
	if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
	return `$${n.toFixed(0)}`;
}

function countryCode(countryName: string): string {
	const map: Record<string, string> = {
		'United States': 'US', USA: 'US', 'United Kingdom': 'GB', UK: 'GB',
		Germany: 'DE', France: 'FR', Italy: 'IT', Spain: 'ES', Netherlands: 'NL',
		'The Netherlands': 'NL', Sweden: 'SE', Switzerland: 'CH', Belgium: 'BE',
		Austria: 'AT', Poland: 'PL', India: 'IN', China: 'CN', Japan: 'JP',
		Singapore: 'SG', Australia: 'AU', Brazil: 'BR', Canada: 'CA', Portugal: 'PT',
	};
	return map[countryName] ?? countryName.slice(0, 2).toUpperCase();
}

// Until the backend exposes a /api/companies/facets endpoint with real counts,
// surface the most common HQ countries from the design's flag palette.
const COMMON_COUNTRIES = [
	'United States', 'United Kingdom', 'Germany', 'France', 'Spain', 'Italy',
	'Netherlands', 'Sweden', 'Switzerland', 'Belgium', 'Portugal', 'India',
	'China', 'Japan', 'Singapore', 'Australia', 'Brazil', 'Canada',
];
