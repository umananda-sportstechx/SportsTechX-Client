'use client';

import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { qk } from '@/lib/query-keys';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { Page, Flag, Tag, SectorPill, Empty, Logo, PageTitle } from '@/components/ui/atoms';
import {
	FilterRail, ActiveFiltersBar,
	emptyFilterState, type Facet, type FilterState,
} from '@/components/ui/filter-rail';
import { SortHeader, sortToParam, paramToSort, type SortState } from '@/components/ui/sort-header';
import { DealDrawer } from '@/components/ui/deal-drawer';
import { CompareBar } from '@/components/compare-bar';
import { CompareToggle } from '@/components/compare-toggle';

interface Deal {
	id: string;
	company_id?: string | null;
	company_name?: string | null;
	company_slug?: string | null;
	announced_date?: string | null;
	amount_usd?: number | string | null;
	round_type_name?: string | null;
	round_type_id?: string | null;
	primary_sector?: string | null;
	lead_investor?: string | null;
	hq_country?: string | null;
}

interface DealsResponse { data: Deal[]; total: number; page: number; totalPages: number }

interface SectorRef { id: string; name: string; slug: string }
interface RoundRef { id: string; name: string; slug: string }
interface RefResponse<T> { data: T[] }

export default function DealsListPage() {
	const router = useRouter();
	const pathname = usePathname();
	const params = useSearchParams();

	const [page, setPage] = useState(Number(params.get('page') ?? '1'));
	const [sort, setSort] = useState<SortState | null>(
		paramToSort(params.get('sort')) ?? { key: 'announced_date', dir: 'desc' },
	);
	const [drawerTarget, setDrawerTarget] = useState<string | null>(null);

	const { data: sectorsResp } = useSWR<RefResponse<SectorRef> | SectorRef[]>(qk.reference.sectors(), {
		dedupingInterval: 60 * 60_000,
	});
	const sectorList = Array.isArray(sectorsResp) ? sectorsResp : (sectorsResp?.data ?? []);

	const { data: roundsResp } = useSWR<RefResponse<RoundRef> | RoundRef[]>(qk.reference.roundTypes(), {
		dedupingInterval: 60 * 60_000,
	});
	const roundList = Array.isArray(roundsResp) ? roundsResp : (roundsResp?.data ?? []);

	const facets = useMemo<Facet[]>(() => [
		{
			key: 'sector_slug',
			label: 'Sector',
			kind: 'multi',
			options: () => sectorList.map((s) => ({ value: s.slug, label: s.name })),
			maxHeight: 240,
		},
		{
			key: 'round_type_slug',
			label: 'Stage',
			kind: 'multi',
			options: () => roundList.map((r) => ({ value: r.slug, label: r.name })),
		},
		{
			key: 'country',
			label: 'Country',
			kind: 'multi',
			options: () => COMMON_COUNTRIES.map((c) => ({ value: c, label: c })),
		},
		{
			key: 'amount',
			label: 'Deal size',
			kind: 'range',
			min: 0,
			max: 250,
			step: 5,
			prefix: '$',
			suffix: 'M',
		},
	], [sectorList, roundList]);

	const [filterState, setFilterState] = useState<FilterState>(() => {
		const init = emptyFilterState(facets, { search: params.get('q') ?? '' });
		const s = params.get('sector_slug') ?? params.get('sector');
		if (s) init.sector_slug = s.split(',').filter(Boolean);
		const r = params.get('round_type_slug');
		if (r) init.round_type_slug = r.split(',').filter(Boolean);
		const c = params.get('country');
		if (c) init.country = c.split(',').filter(Boolean);
		const aMin = params.get('amount_usd_min');
		const aMax = params.get('amount_usd_max');
		if (aMin && aMax) {
			init.amount = [Number(aMin) / 1_000_000, Number(aMax) / 1_000_000] as [number, number];
		}
		return init;
	});

	useEffect(() => {
		const sp = new URLSearchParams();
		if (filterState.search) sp.set('q', filterState.search);
		const sec = filterState.sector_slug as string[] | undefined;
		if (sec?.length) sp.set('sector_slug', sec.join(','));
		const rnd = filterState.round_type_slug as string[] | undefined;
		if (rnd?.length) sp.set('round_type_slug', rnd.join(','));
		const ctry = filterState.country as string[] | undefined;
		if (ctry?.length) sp.set('country', ctry.join(','));
		const amt = filterState.amount as [number, number] | undefined;
		if (amt && (amt[0] !== 0 || amt[1] !== 250)) {
			sp.set('amount_usd_min', String(amt[0] * 1_000_000));
			sp.set('amount_usd_max', String(amt[1] * 1_000_000));
		}
		if (page > 1) sp.set('page', String(page));
		const sortParam = sortToParam(sort);
		if (sortParam && sortParam !== '-announced_date') sp.set('sort', sortParam);
		const qs = sp.toString();
		router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [filterState, page, sort]);

	const debouncedSearch = useDebouncedValue(filterState.search ?? '', 300);

	const queryParams: Record<string, unknown> = {
		page,
		limit: 30,
		sort: sortToParam(sort) ?? '-announced_date',
	};
	if (debouncedSearch) queryParams.search = debouncedSearch;
	const sec = filterState.sector_slug as string[] | undefined;
	if (sec?.length === 1) queryParams.sector_slug = sec[0];
	else if (sec?.length) queryParams.sector_slug = sec.join(',');
	const rnd = filterState.round_type_slug as string[] | undefined;
	if (rnd?.length === 1) queryParams.round_type_slug = rnd[0];
	else if (rnd?.length) queryParams.round_type_slug = rnd.join(',');
	const ctry = filterState.country as string[] | undefined;
	if (ctry?.length === 1) queryParams.country = ctry[0];
	const amt = filterState.amount as [number, number] | undefined;
	if (amt && (amt[0] !== 0 || amt[1] !== 250)) {
		queryParams.amount_usd_min = amt[0] * 1_000_000;
		queryParams.amount_usd_max = amt[1] * 1_000_000;
	}

	const { data, isLoading } = useSWR<DealsResponse>(qk.deals.list(queryParams), {
		dedupingInterval: 3 * 60_000,
	});
	const deals = data?.data ?? [];
	const total = data?.total ?? 0;
	const totalPages = data?.totalPages ?? 1;

	return (
		<Page>
			<PageTitle
				kicker={`Deals · ${total.toLocaleString()} disclosed`}
				title="Deals"
				sub="Every disclosed funding round we've tracked."
			/>

			<div className="flt-layout">
				<FilterRail
					facets={facets}
					state={filterState}
					setState={(s) => { setFilterState(s); setPage(1); }}
					defaultOpen={{ sector_slug: true, round_type_slug: true }}
				/>

				<div className="flt-main">
					<ActiveFiltersBar
						facets={facets}
						state={filterState}
						setState={setFilterState}
						placeholder="Search by company, investor…"
						total={total}
						shown={deals.length}
					/>

					{isLoading && deals.length === 0 ? (
						<Empty msg="Loading…" />
					) : deals.length === 0 ? (
						<div className="card flt-empty-state">
							<h3>No deals match</h3>
							<p>Try clearing some filters.</p>
						</div>
					) : (
						<div className="card">
							<table className="data-table">
								<thead>
									<tr>
										<SortHeader label="Date" sortKey="announced_date" sort={sort} setSort={setSort} defaultDir="desc" />
										<SortHeader label="Company" sortKey="company_name" sort={sort} setSort={setSort} />
										<th>Sector</th>
										<th>Round</th>
										<th>Lead investor</th>
										<th>Geo</th>
										<SortHeader label="Amount" sortKey="amount_usd" sort={sort} setSort={setSort} align="right" defaultDir="desc" />
										<th />
									</tr>
								</thead>
								<tbody>
									{deals.map((d) => {
										const cc = d.hq_country ? countryCode(d.hq_country) : '';
										return (
											<tr
												key={d.id}
												style={{ cursor: 'pointer' }}
												onClick={(e) => {
													// Ignore clicks on inner interactive controls
													const target = e.target as HTMLElement;
													if (target.closest('button, a')) return;
													if (e.metaKey || e.ctrlKey) {
														window.open(`/deals/${d.id}`, '_blank');
														return;
													}
													setDrawerTarget(d.id);
												}}
											>
												<td className="num">{formatShortDate(d.announced_date)}</td>
												<td>
													<div className="tbl-name-cell">
														<Logo co={{ name: d.company_name ?? '—' }} size={24} />
														<span className="tbl-name">{d.company_name ?? '—'}</span>
													</div>
												</td>
												<td>{d.primary_sector ? <SectorPill name={d.primary_sector} /> : '—'}</td>
												<td>{d.round_type_name ? <Tag variant="pos">{d.round_type_name}</Tag> : '—'}</td>
												<td style={{ color: 'var(--fg-2)' }}>{d.lead_investor ?? '—'}</td>
												<td>{cc && <Flag cc={cc} />} {cc}</td>
												<td className="num" style={{ textAlign: 'right', fontWeight: 700 }}>{formatDollars(d.amount_usd)}</td>
												<td style={{ textAlign: 'right' }}><CompareToggle id={d.id} kind="deals" /></td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>
					)}

					<DealDrawer
						id={drawerTarget}
						onClose={() => setDrawerTarget(null)}
					/>

					<CompareBar kind="deals" />

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

function formatShortDate(iso: string | null | undefined): string {
	if (!iso) return '—';
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return '—';
	return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
}

function formatDollars(value: number | string | null | undefined): string {
	if (value == null) return '—';
	const n = typeof value === 'string' ? Number(value) : value;
	if (!Number.isFinite(n) || n <= 0) return '—';
	if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
	if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
	if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
	return `$${n.toFixed(0)}`;
}

function countryCode(countryName: string): string {
	const map: Record<string, string> = {
		'United States': 'US', USA: 'US', 'United Kingdom': 'GB', UK: 'GB',
		Germany: 'DE', France: 'FR', Italy: 'IT', Spain: 'ES', Netherlands: 'NL',
		Sweden: 'SE', Switzerland: 'CH', Belgium: 'BE', Austria: 'AT', Poland: 'PL',
		India: 'IN', China: 'CN', Japan: 'JP', Singapore: 'SG', Australia: 'AU',
		Brazil: 'BR', Canada: 'CA', Portugal: 'PT',
	};
	return map[countryName] ?? countryName.slice(0, 2).toUpperCase();
}

const COMMON_COUNTRIES = [
	'United States', 'United Kingdom', 'Germany', 'France', 'Spain', 'Italy',
	'Netherlands', 'Sweden', 'Switzerland', 'Belgium', 'Portugal', 'India',
	'China', 'Japan', 'Singapore', 'Australia', 'Brazil', 'Canada',
];
