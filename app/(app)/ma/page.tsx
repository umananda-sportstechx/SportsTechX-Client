'use client';

import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { qk } from '@/lib/query-keys';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { Page, Flag, Tag, SectorPill, Stat, Empty, PageTitle } from '@/components/ui/atoms';
import {
	FilterRail, ActiveFiltersBar,
	emptyFilterState, type Facet, type FilterState,
} from '@/components/ui/filter-rail';
import { SortHeader, sortToParam, paramToSort, type SortState } from '@/components/ui/sort-header';

interface AcquisitionRow {
	id: string;
	acquiree_name?: string | null;
	acquiree_slug?: string | null;
	acquiree_description?: string | null;
	acquirer_name?: string | null;
	acquirer_slug?: string | null;
	acquisition_type?: string | null;
	acquisition_date?: string | null;
	amount_usd?: number | string | null;
	primary_sector?: string | null;
	hq_country?: string | null;
}

interface AcquisitionsResponse {
	data: AcquisitionRow[];
	total: number;
	page: number;
	totalPages: number;
}

interface MaStatsResponse {
	count: number;
	largest_value: number;
	median_value: number;
	acquisition_pct: number;
}

interface SectorRef { id: string; name: string; slug: string }
interface RefResponse<T> { data: T[] }

export default function MnaPage() {
	const router = useRouter();
	const pathname = usePathname();
	const params = useSearchParams();

	const [page, setPage] = useState(Number(params.get('page') ?? '1'));
	const [sort, setSort] = useState<SortState | null>(
		paramToSort(params.get('sort')) ?? { key: 'acquisition_date', dir: 'desc' },
	);
	const currentYear = new Date().getFullYear();

	const { data: sectorsResp } = useSWR<RefResponse<SectorRef> | SectorRef[]>(qk.reference.sectors(), {
		dedupingInterval: 60 * 60_000,
	});
	const sectorList = Array.isArray(sectorsResp) ? sectorsResp : (sectorsResp?.data ?? []);

	const facets = useMemo<Facet[]>(() => [
		{
			key: 'sector_slug',
			label: 'Sector',
			kind: 'multi',
			options: () => sectorList.map((s) => ({ value: s.slug, label: s.name })),
			maxHeight: 240,
		},
		{
			key: 'value',
			label: 'Deal value',
			kind: 'range',
			min: 0,
			max: 500,
			step: 10,
			prefix: '$',
			suffix: 'M',
		},
	], [sectorList]);

	const [filterState, setFilterState] = useState<FilterState>(() => {
		const init = emptyFilterState(facets, { search: params.get('q') ?? '' });
		const s = params.get('sector_slug');
		if (s) init.sector_slug = s.split(',').filter(Boolean);
		const vMin = params.get('amount_usd_min');
		const vMax = params.get('amount_usd_max');
		if (vMin && vMax) init.value = [Number(vMin) / 1_000_000, Number(vMax) / 1_000_000] as [number, number];
		return init;
	});

	useEffect(() => {
		const sp = new URLSearchParams();
		if (filterState.search) sp.set('q', filterState.search);
		const sec = filterState.sector_slug as string[] | undefined;
		if (sec?.length) sp.set('sector_slug', sec.join(','));
		const v = filterState.value as [number, number] | undefined;
		if (v && (v[0] !== 0 || v[1] !== 500)) {
			sp.set('amount_usd_min', String(v[0] * 1_000_000));
			sp.set('amount_usd_max', String(v[1] * 1_000_000));
		}
		if (page > 1) sp.set('page', String(page));
		const sortParam = sortToParam(sort);
		if (sortParam && sortParam !== '-acquisition_date') sp.set('sort', sortParam);
		const qs = sp.toString();
		router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [filterState, page, sort]);

	const debouncedSearch = useDebouncedValue(filterState.search ?? '', 300);

	const allTimeParams = { limit: 1, sort: '-acquisition_date' };
	const { data: allTime } = useSWR<AcquisitionsResponse>(qk.acquisitions.list(allTimeParams), { dedupingInterval: 10 * 60_000 });
	const { data: stats } = useSWR<MaStatsResponse>(qk.analytics.maStats('ytd'), { dedupingInterval: 10 * 60_000 });

	const tableParams: Record<string, unknown> = {
		page,
		limit: 30,
		sort: sortToParam(sort) ?? '-acquisition_date',
	};
	if (debouncedSearch) tableParams.search = debouncedSearch;
	const sec = filterState.sector_slug as string[] | undefined;
	if (sec?.length === 1) tableParams.sector_slug = sec[0];
	else if (sec?.length) tableParams.sector_slug = sec.join(',');
	const v = filterState.value as [number, number] | undefined;
	if (v && (v[0] !== 0 || v[1] !== 500)) {
		tableParams.amount_usd_min = v[0] * 1_000_000;
		tableParams.amount_usd_max = v[1] * 1_000_000;
	}

	const { data: tableData, isLoading } = useSWR<AcquisitionsResponse>(qk.acquisitions.list(tableParams), { dedupingInterval: 3 * 60_000 });

	const totalAllTime = allTime?.total ?? 0;
	const table = tableData?.data ?? [];
	const total = tableData?.total ?? 0;
	const totalPages = tableData?.totalPages ?? 1;

	return (
		<Page>
			<PageTitle
				kicker="M&A Tracker · all-time"
				title={`${totalAllTime.toLocaleString()} acquisitions tracked`}
			/>

			<div className="grid-4" style={{ marginBottom: 'var(--space-5)' }}>
				{statStrip(stats, currentYear).map((s, i) => (
					<div key={i} className="card" style={{ padding: 'var(--space-4)' }}>
						<Stat {...s} />
					</div>
				))}
			</div>

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
						placeholder="Search acquirer, target…"
						total={total}
						shown={table.length}
					/>

					<div className="card">
						{isLoading && table.length === 0 ? (
							<Empty msg="Loading…" />
						) : table.length === 0 ? (
							<div className="flt-empty-state">
								<h3>No acquisitions match</h3>
								<p>Try clearing some filters.</p>
							</div>
						) : (
							<table className="data-table">
								<thead>
									<tr>
										<SortHeader label="Date" sortKey="acquisition_date" sort={sort} setSort={setSort} defaultDir="desc" />
										<th>Target</th>
										<th>Acquirer</th>
										<th>Sector</th>
										<th>Type</th>
										<th>Geo</th>
										<SortHeader label="Value" sortKey="amount_usd" sort={sort} setSort={setSort} align="right" defaultDir="desc" />
									</tr>
								</thead>
								<tbody>
									{table.map((d) => {
										const isStrategic = d.acquisition_type !== 'asset_purchase';
										const cc = d.hq_country ? countryCode(d.hq_country) : '';
										const amt = Number(d.amount_usd ?? 0);
										return (
											<tr key={d.id}>
												<td className="num">{formatShortDate(d.acquisition_date)}</td>
												<td>
													<div style={{ fontWeight: 600 }}>{d.acquiree_name ?? '—'}</div>
													{d.acquiree_description && (
														<div
															style={{
																fontSize: 11,
																color: 'var(--fg-muted)',
																display: '-webkit-box',
																WebkitLineClamp: 1,
																WebkitBoxOrient: 'vertical',
																overflow: 'hidden',
															}}
														>
															{d.acquiree_description}
														</div>
													)}
												</td>
												<td>
													<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
														<ArrowRight size={12} style={{ color: 'var(--fg-muted)' }} />
														<span>{d.acquirer_name ?? '—'}</span>
													</div>
												</td>
												<td>{d.primary_sector ? <SectorPill name={d.primary_sector} /> : '—'}</td>
												<td><Tag variant={isStrategic ? 'pos' : 'pill'}>{formatType(d.acquisition_type)}</Tag></td>
												<td>{cc && <Flag cc={cc} />} {cc}</td>
												<td className="num" style={{ textAlign: 'right', fontWeight: 700 }}>
													{Number.isFinite(amt) && amt > 0
														? formatDollars(amt)
														: <span style={{ color: 'var(--fg-muted)', fontWeight: 400, fontSize: 11 }}>undisc.</span>}
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						)}

						{totalPages > 1 && (
							<div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8, padding: '12px var(--space-4)' }}>
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
			</div>
		</Page>
	);
}

function statStrip(stats: MaStatsResponse | undefined, currentYear: number) {
	const l = splitDollars(stats?.largest_value ?? 0);
	const m = splitDollars(stats?.median_value ?? 0);
	const strategicPct = stats?.acquisition_pct ?? 0;
	return [
		{ label: `${currentYear} YTD`,     value: (stats?.count ?? 0).toLocaleString(),                                                 deltaDir: 'pos' as const },
		{ label: `Largest ${currentYear}`, value: l.value, unit: l.unit,                                                                deltaDir: 'pos' as const },
		{ label: 'Median value',           value: m.value, unit: m.unit,                                                                deltaDir: 'pos' as const },
		{ label: 'Acquisitions share',     value: strategicPct.toString(), unit: '%', delta: `vs ${100 - strategicPct}% mergers`,      deltaDir: 'pos' as const },
	];
}

function formatType(t: string | null | undefined): string {
	if (!t) return 'Deal';
	switch (t) {
		case 'acquisition': return 'Strategic';
		case 'merger': return 'Merger';
		case 'asset_purchase': return 'Asset';
		default: return t;
	}
}

function splitDollars(n: number): { value: string; unit: string } {
	if (!Number.isFinite(n) || n <= 0) return { value: '—', unit: '' };
	if (n >= 1_000_000_000) return { value: `$${(n / 1_000_000_000).toFixed(2)}`, unit: 'B' };
	if (n >= 1_000_000) return { value: `$${(n / 1_000_000).toFixed(1)}`, unit: 'M' };
	if (n >= 1_000) return { value: `$${(n / 1_000).toFixed(0)}`, unit: 'K' };
	return { value: `$${n.toFixed(0)}`, unit: '' };
}

function formatDollars(value: number): string {
	if (!Number.isFinite(value) || value <= 0) return '—';
	if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
	if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(0)}M`;
	if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
	return `$${value.toFixed(0)}`;
}

function formatShortDate(iso: string | null | undefined): string {
	if (!iso) return '—';
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return '—';
	return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
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
