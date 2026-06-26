'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, ArrowRight, Building2, DollarSign } from 'lucide-react';
import { qk } from '@/lib/query-keys';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { recordSearchSignal } from '@/lib/personalization';
import { Page, Logo, Flag, Stat, Tag, SectionHead, Empty, PageTitle, AudiencePill, VerifiedBadge } from '@/components/ui/atoms';
import {
	FilterRail, ActiveFiltersBar, ViewToggle,
	emptyFilterState, type Facet, type FilterState, type AmountValue,
} from '@/components/ui/filter-rail';
import {
	locationFacets, setLocationUrlParams, readLocationParams, applyLocationQueryParams,
	type LocationFacets,
} from '@/lib/location-facets';
import { SortHeader, sortToParam, paramToSort, type SortState } from '@/components/ui/sort-header';
import { DealDrawer } from '@/components/ui/deal-drawer';
import { CompareBar } from '@/components/compare-bar';
import { CompareToggle } from '@/components/compare-toggle';
import { MyListsBtn } from '@/components/ui/my-lists-btn';
import { ExportButton } from '@/components/exports/export-button';
import { FeatureGate } from '@/components/shell/screen-lock';

/**
 * Funding tracker — pixel-aligned to `ui_design_2/app/screens-2.jsx`
 * `FundingScreen`.
 *
 * Layout:
 *  1. PageTitle (with capital deployed + round count in the title).
 *  2. 4 hero `.card.feature` stat tiles from /api/analytics/funding-totals.
 *  3. Full-width Quarterly capital flow chart card.
 *  4. flt-layout: FilterRail (sector, stage, country, deal size) + ActiveFiltersBar
 *     with view toggle + deal table or grid.
 *
 * Filter / sort state is mirrored to URL so deep-links survive a refresh.
 */

interface DealRow {
	id: string;
	company_id?: string;
	company_name?: string | null;
	company_slug?: string | null;
	company_website?: string | null;
	company_description?: string | null;
	company_is_verified?: boolean | null;
	announced_date?: string | null;
	amount_usd?: number | string | null;
	round_type_name?: string | null;
	round_type_slug?: string | null;
	primary_sector?: string | null;
	primary_sector_slug?: string | null;
	sector_slug?: string | null;
	lead_investor?: string | null;
	investors?: string[] | null;
	hq_country?: string | null;
	hq_city?: string | null;
	total_funding_usd?: number | string | null;
	company_sub?: string | null;
	co_sub?: string | null;
	description?: string | null;
}

interface DealsResponse { data: DealRow[]; total: number; page: number; totalPages: number }

interface FundingTotalsResponse {
	total_amount: number;
	round_count: number;
	median_amount: number;
	largest_amount: number;
	total_amount_delta_pct: number | null;
	round_count_delta_pct: number | null;
	median_amount_delta_pct: number | null;
	largest_round_company: string | null;
}
interface QuarterlyPoint {
	year: number;
	quarter: number;
	quarter_label: string;
	total_amount: number;
	deal_count: number;
}

interface SectorRef { id: string; name: string; slug: string }
interface RoundRef { id: string; name: string; slug: string }
interface InvestorRef { id: string; name: string }
interface SportRef { id: string; name: string; slug: string }
interface TechTagRef { id: string; name: string; slug: string }
interface RefResponse<T> { data: T[] }

const BUSINESS_MODELS = [
	{ value: 'b2b', label: 'B2B' },
	{ value: 'b2c', label: 'B2C' },
	{ value: 'b2b2c', label: 'B2B2C' },
	{ value: 'd2c', label: 'D2C' },
	{ value: 'b2g', label: 'B2G' },
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function FundingPage() {
	return (
		<FeatureGate slug="deals_full" screen="funding">
			<FundingPageInner />
		</FeatureGate>
	);
}

function FundingPageInner() {
	const router = useRouter();
	const pathname = usePathname();
	const params = useSearchParams();
	const currentYear = new Date().getFullYear();

	const [page, setPage] = useState(Number(params.get('page') ?? '1'));
	const [view, setView] = useState<'table' | 'grid'>((params.get('view') as 'table' | 'grid') ?? 'table');
	// Filter-rail mode (ui_design_3 FundingFilterRail): Startup = company facets,
	// Deal info = round-level facets. Filters from both modes stay applied; mode
	// only controls which facet group the rail shows.
	const [mode, setMode] = useState<'startup' | 'deal'>(params.get('mode') === 'deal' ? 'deal' : 'startup');
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

	const { data: sportsResp } = useSWR<RefResponse<SportRef> | SportRef[]>(qk.reference.sports(), {
		dedupingInterval: 60 * 60_000,
	});
	const sportList = Array.isArray(sportsResp) ? sportsResp : (sportsResp?.data ?? []);

	const { data: techTagsResp } = useSWR<RefResponse<TechTagRef> | TechTagRef[]>(qk.reference.techTags(), {
		dedupingInterval: 60 * 60_000,
	});
	const techTags = Array.isArray(techTagsResp) ? techTagsResp : (techTagsResp?.data ?? []);

	const { data: locFacets } = useSWR<LocationFacets>(qk.reference.locationFacets(), {
		dedupingInterval: 60 * 60_000,
	});

	// Investor options for the (gated) investor picker. Pulled once, cached long
	// — the selected ids map to the backend `investor_id` filter.
	const { data: investorsResp } = useSWR<{ data: InvestorRef[] }>(qk.investors.list({ limit: 200 }), {
		dedupingInterval: 60 * 60_000,
	});
	const investorList = investorsResp?.data ?? [];

	// Year options for the Deal-info "Deal year" facet — last 12 years.
	const yearOpts = useMemo(() => {
		const ys: { value: string; label: string }[] = [];
		for (let y = currentYear; y >= currentYear - 11; y--) ys.push({ value: String(y), label: String(y) });
		return ys;
	}, [currentYear]);

	// Two facet groups, mirroring `ui_design_3/app/funding-filters.jsx`.
	// Startup mode = company attributes; Deal info mode = round-level facets.
	const startupFacets = useMemo<Facet[]>(() => [
		{ key: 'is_company_verified', label: 'Verified company only', kind: 'bool' },
		{
			key: 'sector_slug', label: 'Sector', kind: 'multi', section: 'Company',
			options: () => sectorList.map((s) => ({ value: s.slug, label: s.name })),
			maxHeight: 240,
		},
		{
			key: 'business_model', label: 'Business model', kind: 'multi', section: 'Company',
			options: () => BUSINESS_MODELS,
		},
		{
			key: 'sport_slug', label: 'Sport', kind: 'multi', section: 'Company',
			options: () => sportList.map((s) => ({ value: s.slug, label: s.name })),
			maxHeight: 240,
		},
		{
			key: 'country', label: 'Country', kind: 'multi', section: 'Location',
			options: () => COMMON_COUNTRIES.map((c) => ({ value: c, label: c })),
		},
		...locationFacets(locFacets),
		{
			key: 'tech_tag_slug', label: 'Tech tags', kind: 'multi', section: 'Other', gate: 'advanced_filters',
			options: () => techTags.map((t) => ({ value: t.slug, label: t.name })),
			maxHeight: 240,
		},
	], [sectorList, sportList, techTags, locFacets]);

	const dealFacets = useMemo<Facet[]>(() => [
		{
			key: 'round_type_slug', label: 'Round type', kind: 'multi', section: 'Round details',
			options: () => roundList.map((r) => ({ value: r.slug, label: r.name })),
		},
		{
			key: 'years', label: 'Deal year', kind: 'multi', section: 'Round details',
			options: () => yearOpts, maxHeight: 200,
		},
		{
			key: 'quarter', label: 'Deal quarter', kind: 'quarter', section: 'Round details',
		},
		{
			key: 'month', label: 'Deal month', kind: 'multi', section: 'Round details',
			options: () => MONTHS.map((m, i) => ({ value: String(i + 1), label: m })),
		},
		{
			key: 'amount', label: 'Round amount', kind: 'amount', section: 'Round details',
			min: 0, max: 250, step: 5,
			undisclosedLabel: 'Exclude undisclosed rounds',
			undisclosedSubtext: 'Hide deals with no stated amount',
			undisclosedDefault: false,
		},
		// Investor picker — gated on `advanced_filters`. Selected investor ids map
		// to the backend `investor_id` (csv) param. Searchable when >8 options.
		{
			key: 'investors', label: 'Investors', kind: 'multi', section: 'Round details', gate: 'advanced_filters',
			options: () => investorList.map((i) => ({ value: i.id, label: i.name })),
			maxHeight: 220,
		},
	], [roundList, yearOpts, investorList]);

	// Union drives ActiveFiltersBar chips + initial state; the rail shows only
	// the active mode's group.
	const allFacets = useMemo(() => [...startupFacets, ...dealFacets], [startupFacets, dealFacets]);
	const railFacets = mode === 'deal' ? dealFacets : startupFacets;

	const [filterState, setFilterState] = useState<FilterState>(() => {
		const init = emptyFilterState(allFacets, { search: params.get('q') ?? '' });
		const v = params.get('is_company_verified'); if (v) init.is_company_verified = v === 'true';
		const s = params.get('sector_slug');
		if (s) init.sector_slug = s.split(',').filter(Boolean);
		const bm = params.get('business_model');
		if (bm) init.business_model = bm.split(',').filter(Boolean);
		const sp2 = params.get('sport_slug');
		if (sp2) init.sport_slug = sp2.split(',').filter(Boolean);
		const tt = params.get('tech_tag_slug');
		if (tt) init.tech_tag_slug = tt.split(',').filter(Boolean);
		const r = params.get('round_type_slug');
		if (r) init.round_type_slug = r.split(',').filter(Boolean);
		const c = params.get('country');
		if (c) init.country = c.split(',').filter(Boolean);
		Object.assign(init, readLocationParams(params as unknown as URLSearchParams));
		const ys = params.get('years'); if (ys) init.years = ys.split(',').filter(Boolean);
		const qt = params.get('quarter'); if (qt) init.quarter = qt.split(',').filter(Boolean);
		const mo = params.get('month'); if (mo) init.month = mo.split(',').filter(Boolean);
		const iv = params.get('investors'); if (iv) init.investors = iv.split(',').filter(Boolean);
		const aMin = params.get('amount_usd_min');
		const aMax = params.get('amount_usd_max');
		const disc = params.get('disclosed_only') === 'true';
		if (aMin || aMax || disc) {
			init.amount = {
				min: aMin ? Number(aMin) / 1_000_000 : 0,
				max: aMax ? Number(aMax) / 1_000_000 : 250,
				undisclosed: disc,
			};
		}
		return init;
	});

	useEffect(() => {
		const sp = new URLSearchParams();
		if (filterState.search) sp.set('q', filterState.search);
		if (filterState.is_company_verified === true) sp.set('is_company_verified', 'true');
		const sec = filterState.sector_slug as string[] | undefined;
		if (sec?.length) sp.set('sector_slug', sec.join(','));
		const bm = filterState.business_model as string[] | undefined;
		if (bm?.length) sp.set('business_model', bm.join(','));
		const spt = filterState.sport_slug as string[] | undefined;
		if (spt?.length) sp.set('sport_slug', spt.join(','));
		const tt = filterState.tech_tag_slug as string[] | undefined;
		if (tt?.length) sp.set('tech_tag_slug', tt.join(','));
		const rnd = filterState.round_type_slug as string[] | undefined;
		if (rnd?.length) sp.set('round_type_slug', rnd.join(','));
		const ctry = filterState.country as string[] | undefined;
		if (ctry?.length) sp.set('country', ctry.join(','));
		setLocationUrlParams(sp, filterState);
		const yrs = filterState.years as string[] | undefined;
		if (yrs?.length) sp.set('years', yrs.join(','));
		const qtr = filterState.quarter as string[] | undefined;
		if (qtr?.length) sp.set('quarter', qtr.join(','));
		const mon = filterState.month as string[] | undefined;
		if (mon?.length) sp.set('month', mon.join(','));
		const inv = filterState.investors as string[] | undefined;
		if (inv?.length) sp.set('investors', inv.join(','));
		const amt = filterState.amount as AmountValue | undefined;
		if (amt) {
			if (amt.min !== 0 || amt.max !== 250) {
				sp.set('amount_usd_min', String(amt.min * 1_000_000));
				sp.set('amount_usd_max', String(amt.max * 1_000_000));
			}
			if (amt.undisclosed) sp.set('disclosed_only', 'true');
		}
		if (page > 1) sp.set('page', String(page));
		if (view !== 'table') sp.set('view', view);
		if (mode === 'deal') sp.set('mode', 'deal');
		const sortParam = sortToParam(sort);
		if (sortParam && sortParam !== '-announced_date') sp.set('sort', sortParam);
		const qs = sp.toString();
		router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [filterState, page, view, sort, mode]);

	const debouncedSearch = useDebouncedValue(filterState.search ?? '', 300);
	useEffect(() => { recordSearchSignal(debouncedSearch); }, [debouncedSearch]);

	const { data: totals } = useSWR<FundingTotalsResponse>(qk.analytics.fundingTotals('ytd'), {
		dedupingInterval: 10 * 60_000,
	});
	const { data: quarters } = useSWR<QuarterlyPoint[]>(
		qk.analytics.quarterly({ from: currentYear - 2, to: currentYear }),
		{ dedupingInterval: 10 * 60_000 },
	);

	const yrs = filterState.years as string[] | undefined;
	const tableParams: Record<string, unknown> = {
		page,
		limit: view === 'grid' ? 36 : 30,
		sort: sortToParam(sort) ?? '-announced_date',
	};
	// Default to the current year for relevance/volume, UNLESS the Deal-info
	// "Deal year" filter is active (then honor the explicit year selection).
	if (yrs?.length) tableParams.years = yrs.join(',');
	else tableParams.year = currentYear;
	if (debouncedSearch) tableParams.q = debouncedSearch;
	if (filterState.is_company_verified === true) tableParams.is_company_verified = true;
	const sec = filterState.sector_slug as string[] | undefined;
	if (sec?.length) tableParams.sector_slug = sec.join(',');
	const bm = filterState.business_model as string[] | undefined;
	if (bm?.length) tableParams.business_model = bm.join(',');
	const spt = filterState.sport_slug as string[] | undefined;
	if (spt?.length) tableParams.sport_slug = spt.join(',');
	const tt = filterState.tech_tag_slug as string[] | undefined;
	if (tt?.length) tableParams.tech_tag_slug = tt.join(',');
	const rnd = filterState.round_type_slug as string[] | undefined;
	if (rnd?.length) tableParams.round_type_slug = rnd.join(',');
	const ctry = filterState.country as string[] | undefined;
	if (ctry?.length) tableParams.country = ctry.join(',');
	applyLocationQueryParams(tableParams, filterState);
	const qtr = filterState.quarter as string[] | undefined;
	// Quarter facet stores labels (Q1…Q4); the API wants integers 1…4.
	if (qtr?.length) tableParams.quarter = qtr.map((q) => q.replace(/^Q/i, '')).join(',');
	const mon = filterState.month as string[] | undefined;
	if (mon?.length) tableParams.month = mon.join(',');
	const inv = filterState.investors as string[] | undefined;
	if (inv?.length) tableParams.investor_id = inv.join(',');
	const amt = filterState.amount as AmountValue | undefined;
	if (amt) {
		if (amt.min !== 0 || amt.max !== 250) {
			tableParams.amount_usd_min = amt.min * 1_000_000;
			tableParams.amount_usd_max = amt.max * 1_000_000;
		}
		if (amt.undisclosed) tableParams.disclosed_only = true;
	}

	const { data: tableData, isLoading } = useSWR<DealsResponse>(qk.deals.list(tableParams), { dedupingInterval: 3 * 60_000 });

	const tableDeals = tableData?.data ?? [];
	const totalRows = tableData?.total ?? 0;
	const totalPages = tableData?.totalPages ?? 1;

	const headlineDeployed = totals
		? splitDollars(totals.total_amount).value + splitDollars(totals.total_amount).unit
		: '—';
	const headlineRounds = totals ? totals.round_count.toLocaleString() : '—';

	return (
		<Page>
			<PageTitle
				kicker="Funding Tracker · YTD"
				title={`${headlineDeployed} deployed across ${headlineRounds} rounds`}
				action={<div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><ExportButton entity="deals" search={filterState.search} /><MyListsBtn /></div>}
			/>

			{/* All four stat cards use .card.feature per design */}
			<div className="grid-4" style={{ marginBottom: 'var(--space-5)' }}>
				{statStrip(totals).map((s, i) => (
					<div key={i} className="card feature" style={{ padding: 'var(--space-4)' }}>
						<Stat {...s} />
					</div>
				))}
			</div>

			{/* Quarterly chart — full-width above the rail layout */}
			<div className="card" style={{ marginBottom: 'var(--space-5)' }}>
				<SectionHead title="Quarterly capital flow" meta={`${currentYear - 2} — ${currentYear}`} />
				<div style={{ padding: 'var(--space-4)' }}>
					{quarters && quarters.length > 0
						? <QuarterlyChart quarters={quarters} />
						: <Empty msg="No quarterly data for this range." />}
				</div>
			</div>

			<div className="flt-layout">
				<FilterRail
					facets={railFacets}
					state={filterState}
					setState={(s) => { setFilterState(s); setPage(1); }}
					defaultOpen={{ round_type_slug: true, years: true, sector_slug: true, country: true }}
					topSlot={
						<div className="ff-mode-wrap">
							<div className="ff-mode" role="tablist" aria-label="Filter group">
								<button
									role="tab"
									aria-selected={mode === 'startup'}
									className={`ff-mode-btn ${mode === 'startup' ? 'on' : ''}`}
									onClick={() => setMode('startup')}
								>
									<Building2 size={11} /> Startup
								</button>
								<button
									role="tab"
									aria-selected={mode === 'deal'}
									className={`ff-mode-btn ${mode === 'deal' ? 'on' : ''}`}
									onClick={() => setMode('deal')}
								>
									<DollarSign size={11} /> Deal info
								</button>
							</div>
						</div>
					}
				/>

				<div className="flt-main">
					<ActiveFiltersBar
						facets={allFacets}
						state={filterState}
						setState={setFilterState}
						placeholder="Search deals, companies, investors…"
						total={totalRows}
						shown={tableDeals.length}
						viewToggle={<ViewToggle view={view} setView={setView} />}
					/>

					{isLoading && tableDeals.length === 0 ? (
						<Empty msg="Loading…" />
					) : tableDeals.length === 0 ? (
						<div className="card flt-empty-state">
							<h3>No rounds match</h3>
							<p>Adjust the filters in the rail to widen results.</p>
						</div>
					) : view === 'grid' ? (
						<div className="deal-grid">
							{tableDeals.map((d) => {
								const cc = d.hq_country ? countryCode(d.hq_country) : '';
								return (
									<div
										key={d.id}
										role="button"
										tabIndex={0}
										className="card deal-card linkable"
										onClick={(e) => {
											if ((e.target as HTMLElement).closest('button, a')) return;
											if (e.metaKey || e.ctrlKey) {
												window.open(`/deals/${d.id}`, '_blank');
												return;
											}
											setDrawerTarget(d.id);
										}}
										onKeyDown={(e) => {
											if (e.key === 'Enter' || e.key === ' ') {
												if ((e.target as HTMLElement).closest('button, a')) return;
												e.preventDefault();
												setDrawerTarget(d.id);
											}
										}}
									>
										<div className="deal-card-head">
											<Logo co={{ name: d.company_name ?? '—', website: d.company_website }} size={40} />
											<div style={{ minWidth: 0, flex: 1 }}>
												<div className="deal-card-name" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
													{d.company_name ?? '—'}
													{d.company_is_verified && <VerifiedBadge size={13} />}
												</div>
												{(d.company_sub ?? d.co_sub ?? d.company_description ?? d.description) && (
													<div className="deal-card-sub">
														{d.company_sub ?? d.co_sub ?? d.company_description ?? d.description}
													</div>
												)}
											</div>
											<div className="deal-card-amount">
												<div className="deal-card-amount-v">{formatDealAmount(d.amount_usd)}</div>
												{d.round_type_name && <Tag variant="pos">{d.round_type_name}</Tag>}
											</div>
										</div>
										<div className="deal-card-meta">
											<span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
												{cc && <Flag cc={cc} />} {d.hq_city ?? d.hq_country ?? '—'}
											</span>
											<span className="deal-card-date">{formatShortDate(d.announced_date)}</span>
										</div>
										{(d.investors?.length ?? 0) > 0 ? (
											<div className="deal-card-investors">
												<span className="deal-card-investors-label">Investors</span>
												<span className="deal-card-investors-list">
													{d.investors!.slice(0, 3).join(' · ')}
													{d.investors!.length > 3 && ` +${d.investors!.length - 3}`}
												</span>
											</div>
										) : d.lead_investor && (
											<div className="deal-card-investors">
												<span className="deal-card-investors-label">Lead investor</span>
												<span className="deal-card-investors-list">{d.lead_investor}</span>
											</div>
										)}
										<div className="co-card-compare">
											<CompareToggle id={d.id} kind="deals" />
										</div>
									</div>
								);
							})}
						</div>
					) : (
						<div className="card">
							<table className="data-table funding-table">
								<thead>
									<tr>
										<SortHeader label="Date" sortKey="announced_date" sort={sort} setSort={setSort} defaultDir="desc" />
										<SortHeader label="Company" sortKey="company_name" sort={sort} setSort={setSort} />
										<SortHeader label="Sector" sortKey="primary_sector" sort={sort} setSort={setSort} />
										<SortHeader label="HQ" sortKey="hq_country" sort={sort} setSort={setSort} />
										<SortHeader label="Round" sortKey="round_type_name" sort={sort} setSort={setSort} />
										<SortHeader label="Lead investor" sortKey="lead_investor" sort={sort} setSort={setSort} />
										<SortHeader label="Amount" sortKey="amount_usd" sort={sort} setSort={setSort} align="right" defaultDir="desc" />
									</tr>
								</thead>
								<tbody>
									{tableDeals.map((d) => {
										const cc = d.hq_country ? countryCode(d.hq_country) : '';
										const round = d.round_type_name ?? '—';
										const sectorName = d.primary_sector ?? '';
										const sectorSlug = d.sector_slug ?? d.primary_sector_slug ?? sectorName;
										return (
											<tr
												key={d.id}
												style={{ cursor: 'pointer' }}
												onClick={(e) => {
													if ((e.target as HTMLElement).closest('button, a')) return;
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
														<Logo co={{ name: d.company_name ?? '—', website: d.company_website }} size={28} />
														<div className="tbl-name-text">
															<div className="tbl-name-line">
																<Link
																	href={d.company_slug ? `/companies/${d.company_slug}` : '/funding'}
																	className="tbl-name co-row-name"
																	onClick={(e) => e.stopPropagation()}
																>
																	{d.company_name ?? '—'}
																</Link>
																{d.company_is_verified && <VerifiedBadge size={12} />}
															</div>
															{(d.company_sub ?? d.co_sub ?? d.company_description ?? d.description) && (
																<div className="tbl-sub">
																	{d.company_sub ?? d.co_sub ?? d.company_description ?? d.description}
																</div>
															)}
														</div>
													</div>
												</td>
												<td>
													{sectorName
														? <AudiencePill sectorSlug={sectorSlug} label={sectorName} size="sm" />
														: <span style={{ color: 'var(--fg-muted)' }}>—</span>}
												</td>
												<td title={d.hq_country ?? ''}>{cc && <Flag cc={cc} />}</td>
												<td>{round !== '—' ? <Tag variant="pos">{round}</Tag> : '—'}</td>
												<td style={{ color: 'var(--fg-2)' }}>
													<InvestorList investors={d.investors ?? (d.lead_investor ? [d.lead_investor] : [])} />
												</td>
												<td className="num" style={{ textAlign: 'right', fontWeight: 700 }}>
													{formatDealAmount(d.amount_usd)}
												</td>
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

function InvestorList({ investors }: { investors: string[] }) {
	const router = useRouter();
	const [open, setOpen] = useState(false);
	if (investors.length === 0) return <span style={{ color: 'var(--fg-muted)' }}>—</span>;
	const MAX = 2;
	const shown = investors.slice(0, MAX);
	const rest = investors.slice(MAX);
	const goInvestor = (name: string) => router.push(`/investors?q=${encodeURIComponent(name)}`);
	return (
		<span className="inv-cell" style={{ gap: 6 }}>
			{shown.map((name, i) => (
				<Fragment key={name + i}>
					<button
						className="inv-link"
						onClick={(e) => { e.stopPropagation(); goInvestor(name); }}
						title={`Open ${name}`}
					>
						{name}
					</button>
					{i < shown.length - 1 && <span className="inv-sep">,&nbsp;</span>}
				</Fragment>
			))}
			{rest.length > 0 && (
				<span className="inv-more-wrap" onMouseLeave={() => setOpen(false)}>
					<span className="inv-sep">,&nbsp;</span>
					<button
						className="inv-more"
						onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
						onMouseEnter={() => setOpen(true)}
						title={rest.join(', ')}
					>
						+{rest.length}
					</button>
					{open && (
						<div className="inv-pop" onClick={(e) => e.stopPropagation()}>
							<div className="inv-pop-h">+{rest.length} co-investors</div>
							{rest.map((name, i) => (
								<button
									key={name + i}
									className="inv-pop-row"
									onClick={(e) => { e.stopPropagation(); goInvestor(name); }}
								>
									{name}
									<ArrowRight size={10} />
								</button>
							))}
						</div>
					)}
				</span>
			)}
		</span>
	);
}

function statStrip(t: FundingTotalsResponse | undefined) {
	const d = splitDollars(t?.total_amount ?? 0);
	const m = splitDollars(t?.median_amount ?? 0);
	const l = splitDollars(t?.largest_amount ?? 0);
	const totalDelta = fmtPct(t?.total_amount_delta_pct);
	const roundsDelta = fmtPct(t?.round_count_delta_pct);
	const medianDelta = fmtPct(t?.median_amount_delta_pct);
	return [
		{
			label: 'Capital · YTD',
			value: d.value,
			unit: d.unit,
			delta: totalDelta?.text,
			deltaDir: totalDelta?.dir ?? ('pos' as const),
		},
		{
			label: 'Rounds · YTD',
			value: (t?.round_count ?? 0).toLocaleString(),
			delta: roundsDelta?.text,
			deltaDir: roundsDelta?.dir ?? ('pos' as const),
		},
		{
			label: 'Median ticket',
			value: m.value,
			unit: m.unit,
			delta: medianDelta?.text,
			deltaDir: medianDelta?.dir ?? ('pos' as const),
		},
		{
			label: 'Largest round',
			value: l.value,
			unit: l.unit,
			// Design uses this slot to surface the company that received the
			// largest round in the period — not a percent delta.
			delta: t?.largest_round_company ?? undefined,
			deltaDir: 'pos' as const,
		},
	];
}

/** Format a percent change into the design's "▲ 12%" / "▼ 8%" shape. */
function fmtPct(p: number | null | undefined): { text: string; dir: 'pos' | 'neg' } | null {
	if (p == null || !Number.isFinite(p)) return null;
	const abs = Math.abs(p);
	const rounded = abs >= 100 ? abs.toFixed(0) : abs.toFixed(abs < 10 ? 1 : 0);
	return { text: `${rounded}%`, dir: p >= 0 ? 'pos' : 'neg' };
}

function QuarterlyChart({ quarters }: { quarters: QuarterlyPoint[] }) {
	if (quarters.length === 0) return null;
	const maxAmt = Math.max(1, ...quarters.map((q) => q.total_amount));
	const W = 900, H = 240, PAD = 36;
	const xFor = (i: number) => PAD + (W - PAD * 2) * (i / quarters.length) + 6;
	const bw = (W - PAD * 2) / quarters.length - 12;
	// Mint palette from ui_design_2/screens-2.jsx:428 — alternating shades.
	const BAR_PRIMARY = '#79CABD';
	const BAR_SOFT = '#C0F4DE';
	return (
		<svg width="100%" viewBox={`0 0 ${W} ${H + 40}`} style={{ display: 'block' }}>
			{[0, 0.25, 0.5, 0.75, 1].map((t) => (
				<g key={t}>
					<line
						x1={PAD}
						x2={W - PAD}
						y1={PAD + (H - PAD * 2) * (1 - t)}
						y2={PAD + (H - PAD * 2) * (1 - t)}
						stroke="var(--grid-line)"
						strokeDasharray="2 4"
					/>
					<text x={6} y={PAD + (H - PAD * 2) * (1 - t) + 3} fontSize="10" fontFamily="var(--font-mono)" fill="var(--fg-muted)">
						${((maxAmt * t) / 1_000_000_000).toFixed(1)}B
					</text>
				</g>
			))}
			{quarters.map((q, i) => {
				const bh = ((H - PAD * 2) * q.total_amount) / maxAmt;
				const y = H - PAD - bh;
				const x = xFor(i);
				return (
					<g key={q.quarter_label}>
						<rect x={x} y={y} width={bw} height={bh} fill={i % 2 === 0 ? BAR_PRIMARY : BAR_SOFT} />
						<text x={x + bw / 2} y={y - 6} textAnchor="middle" fontSize="10" fontFamily="var(--font-mono)" fontWeight={700} fill="var(--fg)">
							${(q.total_amount / 1_000_000_000).toFixed(1)}B
						</text>
						<text x={x + bw / 2} y={H - 14} textAnchor="middle" fontSize="10" fontFamily="var(--font-mono)" fill="var(--fg-muted)">
							{q.quarter_label}
						</text>
						<text x={x + bw / 2} y={H + 4} textAnchor="middle" fontSize="9" fontFamily="var(--font-mono)" fill="var(--fg-muted)">
							{q.deal_count} deals
						</text>
					</g>
				);
			})}
			<path
				d={quarters
					.map((q, i) => {
						const x = PAD + (W - PAD * 2) * ((i + 0.5) / quarters.length);
						const y = H - PAD - ((H - PAD * 2) * q.total_amount) / maxAmt;
						return `${i === 0 ? 'M' : 'L'}${x},${y}`;
					})
					.join(' ')}
				stroke="var(--accent)"
				strokeWidth={2}
				fill="none"
			/>
		</svg>
	);
}

function splitDollars(n: number): { value: string; unit: string } {
	if (!Number.isFinite(n) || n <= 0) return { value: '—', unit: '' };
	if (n >= 1_000_000_000) return { value: `$${(n / 1_000_000_000).toFixed(2)}`, unit: 'B' };
	if (n >= 1_000_000) return { value: `$${(n / 1_000_000).toFixed(1)}`, unit: 'M' };
	if (n >= 1_000) return { value: `$${(n / 1_000).toFixed(0)}`, unit: 'K' };
	return { value: `$${n.toFixed(0)}`, unit: '' };
}

function formatDealAmount(value: number | string | null | undefined): React.ReactNode {
	if (value == null) return <span style={{ color: 'var(--fg-muted)' }}>—</span>;
	const n = typeof value === 'string' ? Number(value) : value;
	if (!Number.isFinite(n) || n <= 0) return <span style={{ color: 'var(--fg-muted)' }}>—</span>;
	const m = n / 1_000_000;
	if (m >= 1000) return <>${(m / 1000).toFixed(1)}<span style={{ fontSize: 10, color: 'var(--fg-muted)', marginLeft: 2 }}>B</span></>;
	if (m >= 1) return <>${m.toFixed(1)}<span style={{ fontSize: 10, color: 'var(--fg-muted)', marginLeft: 2 }}>M</span></>;
	return <>${(n / 1000).toFixed(0)}<span style={{ fontSize: 10, color: 'var(--fg-muted)', marginLeft: 2 }}>K</span></>;
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

const COMMON_COUNTRIES = [
	'United States', 'United Kingdom', 'Germany', 'France', 'Spain', 'Italy',
	'Netherlands', 'Sweden', 'Switzerland', 'Belgium', 'Portugal', 'India',
	'China', 'Japan', 'Singapore', 'Australia', 'Brazil', 'Canada',
];
