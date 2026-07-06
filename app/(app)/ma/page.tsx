'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, ArrowRight, Target, Building2, Handshake } from 'lucide-react';
import { qk } from '@/lib/query-keys';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { recordSearchSignal } from '@/lib/personalization';
import {
	Page, Logo, Flag, Stat, SectionHead, Empty, PageTitle, VerifiedBadge, sectorMetaFor,
} from '@/components/ui/atoms';
import {
	FilterRail, ActiveFiltersBar,
	emptyFilterState, type Facet, type FilterState, type TriValue, type AmountValue,
} from '@/components/ui/filter-rail';
import {
	locationFacets, setLocationUrlParams, readLocationParams, applyLocationQueryParams,
	type LocationFacets,
} from '@/lib/location-facets';
import { SortHeader, sortToParam, paramToSort, type SortState } from '@/components/ui/sort-header';
import { MyListsBtn } from '@/components/ui/my-lists-btn';
import { ExportButton } from '@/components/exports/export-button';
import { FeatureGate } from '@/components/shell/screen-lock';
import { useSectorTiers, expandSectorSelection } from '@/hooks/use-sector-tiers';

/**
 * M&A tracker — pixel-aligned to `ui_design_2/screens-2.jsx:MnaScreen`.
 *
 * Layout:
 *  1. PageTitle (all-time count) + MyListsBtn action.
 *  2. 4 stat tiles: YTD count (with vs-LY delta), Largest YTD (with target name),
 *     Median value, Strategic share.
 *  3. Quarterly M&A volume chart (port of QuarterlyChart with alternating mint
 *     bars + accent trend line).
 *  4. flt-layout: FilterRail (Disclosed toggle, Deal details, Location sections)
 *     + ActiveFiltersBar with view toggle + grid OR sortable table.
 */

interface AcquisitionRow {
	id: string;
	acquiree_name?: string | null;
	acquiree_slug?: string | null;
	acquiree_description?: string | null;
	acquiree_is_verified?: boolean | null;
	acquiree_website?: string | null;
	acquiree_logo?: string | null;
	acquirer_name?: string | null;
	acquirer_slug?: string | null;
	acquisition_type?: string | null;
	acquisition_date?: string | null;
	amount_usd?: number | string | null;
	primary_sector?: string | null;
	primary_sector_slug?: string | null;
	hq_country?: string | null;
	hq_city?: string | null;
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
	count_delta_abs: number | null;
	largest_target: string | null;
	largest_acquirer: string | null;
}

interface QuarterlyPoint {
	year: number;
	quarter: number;
	quarter_label: string;
	total_amount: number;
	deal_count: number;
}

interface SectorRef { id: string; name: string; slug: string }
interface RefResponse<T> { data: T[] }

const TYPE_OPTIONS = [
	{ value: 'merger', label: 'Merger' },
	{ value: 'asset_purchase', label: 'Asset' },
];

const COMMON_COUNTRIES = [
	'United States', 'United Kingdom', 'Germany', 'France', 'Spain', 'Italy',
	'Netherlands', 'Sweden', 'Switzerland', 'Belgium', 'Portugal', 'India',
	'China', 'Japan', 'Singapore', 'Australia', 'Brazil', 'Canada',
];

const MA_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function MnaPage() {
	return (
		<FeatureGate slug="acquisitions_full" screen="mna">
			<MnaPageInner />
		</FeatureGate>
	);
}

function MnaPageInner() {
	const router = useRouter();
	const pathname = usePathname();
	const params = useSearchParams();
	const currentYear = new Date().getFullYear();

	const [page, setPage] = useState(Number(params.get('page') ?? '1'));
	// Per-party filter mode (mirrors the funding page's Startup/Deal toggle):
	// Acquiree = target-side facets, Acquirer = buyer-side facets, Deal =
	// deal-level facets. Selections from all three modes stay applied; mode only
	// controls which facet group the rail renders.
	const [mode, setMode] = useState<'acquiree' | 'acquirer' | 'deal'>(() => {
		const m = params.get('mode');
		return m === 'acquirer' || m === 'deal' ? m : 'acquiree';
	});
	const [sort, setSort] = useState<SortState | null>(
		paramToSort(params.get('sort')) ?? { key: 'acquisition_date', dir: 'desc' },
	);

	const { data: sectorsResp } = useSWR<RefResponse<SectorRef> | SectorRef[]>(qk.reference.sectors(), {
		dedupingInterval: 60 * 60_000,
	});
	const sectorList = Array.isArray(sectorsResp) ? sectorsResp : (sectorsResp?.data ?? []);
	const sectorTiers = useSectorTiers(sectorList);

	const { data: sportsResp } = useSWR<RefResponse<SectorRef> | SectorRef[]>(qk.reference.sports(), {
		dedupingInterval: 60 * 60_000,
	});
	const sportList = Array.isArray(sportsResp) ? sportsResp : (sportsResp?.data ?? []);

	const { data: locFacets } = useSWR<LocationFacets>(qk.reference.locationFacets(), {
		dedupingInterval: 60 * 60_000,
	});

	// Acquiree (target) side facets. Keys are per-party so each side keeps its
	// own selection; they map to acquiree_* query params in tableParams.
	const acquireeFacets = useMemo<Facet[]>(() => [
		{ key: 'acquiree_is_sportstech', label: 'Acquiree is SportsTech', kind: 'tri', section: 'Acquiree', yesLabel: 'Yes', noLabel: 'No' },
		{
			key: 'acquiree_sector_slug',
			label: 'Acquiree sector',
			kind: 'multi',
			section: 'Acquiree',
			options: () => sectorTiers.tops.map((s) => ({ value: s.slug, label: s.name, swatch: sectorMetaFor(s.slug, s.name) })),
			maxHeight: 240,
		},
		{
			key: 'acquiree_sub_sector_slug',
			label: 'Acquiree sub-sector',
			kind: 'multi',
			section: 'Acquiree',
			options: () => sectorTiers.subs.map((s) => ({ value: s.slug, label: s.name, swatch: sectorMetaFor(s.slug, s.name) })),
			maxHeight: 240,
		},
		{
			key: 'acquiree_sub_sub_sector_slug',
			label: 'Acquiree sub-sub-sector',
			kind: 'multi',
			section: 'Acquiree',
			gate: 'advanced_filters',
			options: () => sectorTiers.subSubs.map((s) => ({ value: s.slug, label: s.name, swatch: sectorMetaFor(s.slug, s.name) })),
			maxHeight: 240,
		},
		{
			key: 'acquiree_sport_slug',
			label: 'Acquiree sport',
			kind: 'multi',
			section: 'Acquiree',
			options: () => sportList.map((s) => ({ value: s.slug, label: s.name })),
			maxHeight: 240,
		},
		{
			key: 'country',
			label: 'Acquiree HQ',
			kind: 'multi',
			section: 'Location',
			options: () => COMMON_COUNTRIES.map((c) => ({ value: c, label: c })),
		},
		...locationFacets(locFacets, { section: 'Location' }),
	], [sectorTiers, sportList, locFacets]);

	// Acquirer (buyer) side facets. Map to acquirer_* query params.
	const acquirerFacets = useMemo<Facet[]>(() => [
		{ key: 'acquirer_is_sportstech', label: 'Acquirer is SportsTech', kind: 'tri', section: 'Acquirer', yesLabel: 'Yes', noLabel: 'No' },
		{
			key: 'acquirer_sector_slug',
			label: 'Acquirer sector',
			kind: 'multi',
			section: 'Acquirer',
			options: () => sectorTiers.tops.map((s) => ({ value: s.slug, label: s.name, swatch: sectorMetaFor(s.slug, s.name) })),
			maxHeight: 240,
		},
		{
			key: 'acquirer_sub_sector_slug',
			label: 'Acquirer sub-sector',
			kind: 'multi',
			section: 'Acquirer',
			options: () => sectorTiers.subs.map((s) => ({ value: s.slug, label: s.name, swatch: sectorMetaFor(s.slug, s.name) })),
			maxHeight: 240,
		},
		{
			key: 'acquirer_sub_sub_sector_slug',
			label: 'Acquirer sub-sub-sector',
			kind: 'multi',
			section: 'Acquirer',
			gate: 'advanced_filters',
			options: () => sectorTiers.subSubs.map((s) => ({ value: s.slug, label: s.name, swatch: sectorMetaFor(s.slug, s.name) })),
			maxHeight: 240,
		},
		{
			key: 'acquirer_sport_slug',
			label: 'Acquirer sport',
			kind: 'multi',
			section: 'Acquirer',
			options: () => sportList.map((s) => ({ value: s.slug, label: s.name })),
			maxHeight: 240,
		},
		{
			key: 'acquirer_country',
			label: 'Acquirer HQ',
			kind: 'multi',
			section: 'Acquirer location',
			options: () => COMMON_COUNTRIES.map((c) => ({ value: c, label: c })),
		},
		{
			key: 'acquirer_city', label: 'Acquirer city', kind: 'multi', section: 'Acquirer location', gate: 'advanced_filters',
			options: () => (locFacets?.cities ?? []).map((c) => ({ value: c, label: c })),
			maxHeight: 220,
		},
		{
			key: 'acquirer_continent', label: 'Acquirer continent', kind: 'multi', section: 'Acquirer location', gate: 'advanced_filters',
			options: () => (locFacets?.continents ?? []).map((c) => ({ value: c, label: c })),
		},
		{
			key: 'acquirer_region', label: 'Acquirer region', kind: 'multi', section: 'Acquirer location', gate: 'advanced_filters',
			options: () => (locFacets?.regions ?? []).map((r) => ({ value: r, label: r })),
		},
	], [sectorTiers, sportList, locFacets]);

	// Deal-level facets — shared across modes, shown in "Deal" mode.
	const dealFacets = useMemo<Facet[]>(() => [
		{
			key: 'acquisition_type',
			label: 'Acquisition type',
			kind: 'multi',
			section: 'Deal details',
			options: () => TYPE_OPTIONS,
		},
		{
			key: 'month',
			label: 'Acquisition month',
			kind: 'multi',
			section: 'Deal details',
			options: () => MA_MONTHS.map((m, i) => ({ value: String(i + 1), label: m })),
		},
		{
			key: 'value',
			label: 'Deal value',
			kind: 'amount',
			section: 'Deal details',
			min: 0,
			max: 2000,
			step: 25,
			undisclosedLabel: 'Include undisclosed deals',
			undisclosedSubtext: 'Show acquisitions with no stated value',
			undisclosedDefault: true,
		},
		{
			key: 'year',
			label: 'Acquisition year',
			kind: 'range',
			section: 'Deal details',
			min: 2010,
			max: currentYear,
			step: 1,
		},
	], [currentYear]);

	// Union drives ActiveFiltersBar chips + initial filter state; the rail shows
	// only the active mode's group.
	const allFacets = useMemo(
		() => [...acquireeFacets, ...acquirerFacets, ...dealFacets],
		[acquireeFacets, acquirerFacets, dealFacets],
	);
	const railFacets = mode === 'acquirer' ? acquirerFacets : mode === 'deal' ? dealFacets : acquireeFacets;

	const [filterState, setFilterState] = useState<FilterState>(() => {
		const init = emptyFilterState(allFacets, { search: params.get('q') ?? '' });
		const stTarget = params.get('acquiree_is_sportstech');
		if (stTarget === 'true') init.acquiree_is_sportstech = 'yes';
		else if (stTarget === 'false') init.acquiree_is_sportstech = 'no';
		const stAcq = params.get('acquirer_is_sportstech');
		if (stAcq === 'true') init.acquirer_is_sportstech = 'yes';
		else if (stAcq === 'false') init.acquirer_is_sportstech = 'no';
		const t = params.get('acquisition_type');
		if (t) init.acquisition_type = t.split(',').filter(Boolean);
		// sector_slug / sport_slug are legacy either-side aliases → seed acquiree.
		const s = params.get('acquiree_sector_slug') ?? params.get('sector_slug');
		if (s) init.acquiree_sector_slug = s.split(',').filter(Boolean);
		const ass = params.get('acquiree_sub_sector_slug');
		if (ass) init.acquiree_sub_sector_slug = ass.split(',').filter(Boolean);
		const asss = params.get('acquiree_sub_sub_sector_slug');
		if (asss) init.acquiree_sub_sub_sector_slug = asss.split(',').filter(Boolean);
		const asec = params.get('acquirer_sector_slug');
		if (asec) init.acquirer_sector_slug = asec.split(',').filter(Boolean);
		const arss = params.get('acquirer_sub_sector_slug');
		if (arss) init.acquirer_sub_sector_slug = arss.split(',').filter(Boolean);
		const arsss = params.get('acquirer_sub_sub_sector_slug');
		if (arsss) init.acquirer_sub_sub_sector_slug = arsss.split(',').filter(Boolean);
		const sp = params.get('acquiree_sport_slug') ?? params.get('sport_slug');
		if (sp) init.acquiree_sport_slug = sp.split(',').filter(Boolean);
		const asp = params.get('acquirer_sport_slug');
		if (asp) init.acquirer_sport_slug = asp.split(',').filter(Boolean);
		const c = params.get('country');
		if (c) init.country = c.split(',').filter(Boolean);
		Object.assign(init, readLocationParams(params as unknown as URLSearchParams));
		const ac = params.get('acquirer_country');
		if (ac) init.acquirer_country = ac.split(',').filter(Boolean);
		(['acquirer_city', 'acquirer_continent', 'acquirer_region'] as const).forEach((k) => {
			const val = params.get(k); if (val) init[k] = val.split(',').filter(Boolean);
		});
		const mo = params.get('month');
		if (mo) init.month = mo.split(',').filter(Boolean);
		const vMin = params.get('amount_usd_min');
		const vMax = params.get('amount_usd_max');
		const disc = params.get('disclosed_only') === 'true';
		if (vMin || vMax || disc) {
			init.value = {
				min: vMin ? Number(vMin) / 1_000_000 : 0,
				max: vMax ? Number(vMax) / 1_000_000 : 2000,
				// disclosed_only ON ⇒ exclude undisclosed ⇒ "include" switch OFF.
				undisclosed: !disc,
			};
		}
		const yMin = params.get('year_min');
		const yMax = params.get('year_max');
		if (yMin && yMax) init.year = [Number(yMin), Number(yMax)] as [number, number];
		return init;
	});

	useEffect(() => {
		const sp = new URLSearchParams();
		if (filterState.search) sp.set('q', filterState.search);
		const stT = filterState.acquiree_is_sportstech as TriValue | undefined;
		if (stT === 'yes' || stT === 'no') sp.set('acquiree_is_sportstech', stT === 'yes' ? 'true' : 'false');
		const stA = filterState.acquirer_is_sportstech as TriValue | undefined;
		if (stA === 'yes' || stA === 'no') sp.set('acquirer_is_sportstech', stA === 'yes' ? 'true' : 'false');
		const t = filterState.acquisition_type as string[] | undefined;
		if (t?.length) sp.set('acquisition_type', t.join(','));
		const sec = filterState.acquiree_sector_slug as string[] | undefined;
		if (sec?.length) sp.set('acquiree_sector_slug', sec.join(','));
		const secSub = filterState.acquiree_sub_sector_slug as string[] | undefined;
		if (secSub?.length) sp.set('acquiree_sub_sector_slug', secSub.join(','));
		const secSubSub = filterState.acquiree_sub_sub_sector_slug as string[] | undefined;
		if (secSubSub?.length) sp.set('acquiree_sub_sub_sector_slug', secSubSub.join(','));
		const asec = filterState.acquirer_sector_slug as string[] | undefined;
		if (asec?.length) sp.set('acquirer_sector_slug', asec.join(','));
		const asecSub = filterState.acquirer_sub_sector_slug as string[] | undefined;
		if (asecSub?.length) sp.set('acquirer_sub_sector_slug', asecSub.join(','));
		const asecSubSub = filterState.acquirer_sub_sub_sector_slug as string[] | undefined;
		if (asecSubSub?.length) sp.set('acquirer_sub_sub_sector_slug', asecSubSub.join(','));
		const spt = filterState.acquiree_sport_slug as string[] | undefined;
		if (spt?.length) sp.set('acquiree_sport_slug', spt.join(','));
		const aspt = filterState.acquirer_sport_slug as string[] | undefined;
		if (aspt?.length) sp.set('acquirer_sport_slug', aspt.join(','));
		const ctry = filterState.country as string[] | undefined;
		if (ctry?.length) sp.set('country', ctry.join(','));
		setLocationUrlParams(sp, filterState);
		const ac = filterState.acquirer_country as string[] | undefined;
		if (ac?.length) sp.set('acquirer_country', ac.join(','));
		(['acquirer_city', 'acquirer_continent', 'acquirer_region'] as const).forEach((k) => {
			const val = filterState[k] as string[] | undefined;
			if (val?.length) sp.set(k, val.join(','));
		});
		const mo = filterState.month as string[] | undefined;
		if (mo?.length) sp.set('month', mo.join(','));
		const v = filterState.value as AmountValue | undefined;
		if (v) {
			if (v.min !== 0 || v.max !== 2000) {
				sp.set('amount_usd_min', String(v.min * 1_000_000));
				sp.set('amount_usd_max', String(v.max * 1_000_000));
			}
			if (!v.undisclosed) sp.set('disclosed_only', 'true');
		}
		const yr = filterState.year as [number, number] | undefined;
		if (yr && (yr[0] !== 2010 || yr[1] !== currentYear)) {
			sp.set('year_min', String(yr[0]));
			sp.set('year_max', String(yr[1]));
		}
		if (page > 1) sp.set('page', String(page));
		if (mode !== 'acquiree') sp.set('mode', mode);
		const sortParam = sortToParam(sort);
		if (sortParam && sortParam !== '-acquisition_date') sp.set('sort', sortParam);
		const qs = sp.toString();
		router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [filterState, page, sort, mode]);

	const debouncedSearch = useDebouncedValue(filterState.search ?? '', 300);
	useEffect(() => { recordSearchSignal(debouncedSearch); }, [debouncedSearch]);

	const allTimeParams = { limit: 1, sort: '-acquisition_date' };
	const { data: allTime } = useSWR<AcquisitionsResponse>(qk.acquisitions.list(allTimeParams), { dedupingInterval: 10 * 60_000 });
	const { data: stats } = useSWR<MaStatsResponse>(qk.analytics.maStats('ytd'), { dedupingInterval: 10 * 60_000 });
	const { data: quarters } = useSWR<QuarterlyPoint[]>(
		qk.analytics.maQuarterly({ from: currentYear - 2, to: currentYear }),
		{ dedupingInterval: 10 * 60_000 },
	);

	const tableParams: Record<string, unknown> = {
		page,
		limit: 50,
		sort: sortToParam(sort) ?? '-acquisition_date',
	};
	if (debouncedSearch) tableParams.q = debouncedSearch;
	const stT = filterState.acquiree_is_sportstech as TriValue | undefined;
	if (stT === 'yes') tableParams.acquiree_is_sportstech = true;
	else if (stT === 'no') tableParams.acquiree_is_sportstech = false;
	const stA = filterState.acquirer_is_sportstech as TriValue | undefined;
	if (stA === 'yes') tableParams.acquirer_is_sportstech = true;
	else if (stA === 'no') tableParams.acquirer_is_sportstech = false;
	const t = filterState.acquisition_type as string[] | undefined;
	if (t?.length) tableParams.acquisition_type = t.join(',');
	// Merge each side's three sector tiers and expand to descendant leaves so a
	// pillar/sub-sector also matches the leaf sectors beneath it.
	const acquireeSec = expandSectorSelection(
		sectorTiers,
		filterState.acquiree_sector_slug as string[] | undefined,
		filterState.acquiree_sub_sector_slug as string[] | undefined,
		filterState.acquiree_sub_sub_sector_slug as string[] | undefined,
	);
	if (acquireeSec) tableParams.acquiree_sector_slug = acquireeSec;
	const acquirerSec = expandSectorSelection(
		sectorTiers,
		filterState.acquirer_sector_slug as string[] | undefined,
		filterState.acquirer_sub_sector_slug as string[] | undefined,
		filterState.acquirer_sub_sub_sector_slug as string[] | undefined,
	);
	if (acquirerSec) tableParams.acquirer_sector_slug = acquirerSec;
	const spt = filterState.acquiree_sport_slug as string[] | undefined;
	if (spt?.length) tableParams.acquiree_sport_slug = spt.join(',');
	const aspt = filterState.acquirer_sport_slug as string[] | undefined;
	if (aspt?.length) tableParams.acquirer_sport_slug = aspt.join(',');
	const ctry = filterState.country as string[] | undefined;
	if (ctry?.length) tableParams.country = ctry.join(',');
	applyLocationQueryParams(tableParams, filterState);
	const ac = filterState.acquirer_country as string[] | undefined;
	if (ac?.length) tableParams.acquirer_country = ac.join(',');
	(['acquirer_city', 'acquirer_continent', 'acquirer_region'] as const).forEach((k) => {
		const val = filterState[k] as string[] | undefined;
		if (val?.length) tableParams[k] = val.join(',');
	});
	const mo = filterState.month as string[] | undefined;
	if (mo?.length) tableParams.month = mo.join(',');
	const v = filterState.value as AmountValue | undefined;
	if (v) {
		if (v.min !== 0 || v.max !== 2000) {
			tableParams.amount_usd_min = v.min * 1_000_000;
			tableParams.amount_usd_max = v.max * 1_000_000;
		}
		if (!v.undisclosed) tableParams.disclosed_only = true;
	}
	const yr = filterState.year as [number, number] | undefined;
	if (yr && (yr[0] !== 2010 || yr[1] !== currentYear)) {
		tableParams.year_min = yr[0];
		tableParams.year_max = yr[1];
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
				action={<div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><ExportButton entity="acquisitions" search={filterState.search} filters={tableParams} /><MyListsBtn /></div>}
			/>

			<div className="grid-4" style={{ marginBottom: 'var(--space-5)' }}>
				{statStrip(stats, currentYear).map((s, i) => (
					<div key={i} className="card feature" style={{ padding: 'var(--space-4)' }}>
						<Stat {...s} />
					</div>
				))}
			</div>

			<div className="card" style={{ marginBottom: 'var(--space-5)' }}>
				<SectionHead title="Quarterly M&A volume" meta={`${currentYear - 2} — ${currentYear}`} action={<Link href="/analytics?tab=mna" className="btn ghost">View all analytics <ArrowRight size={12} /></Link>} />
				<div style={{ padding: 'var(--space-4)' }}>
					{quarters && quarters.length > 0
						? <MaQuarterlyChart quarters={quarters} />
						: <Empty msg="No quarterly data for this range." />}
				</div>
			</div>

			<div className="flt-layout">
				<FilterRail
					facets={railFacets}
					state={filterState}
					setState={(s) => { setFilterState(s); setPage(1); }}
					defaultOpen={{
						acquisition_type: true,
						acquiree_sector_slug: true,
						acquirer_sector_slug: true,
						country: true,
					}}
					topSlot={
						<div className="ff-mode-wrap">
							<div className="ff-mode" role="tablist" aria-label="Filter party">
								<button
									role="tab"
									aria-selected={mode === 'acquiree'}
									className={`ff-mode-btn ${mode === 'acquiree' ? 'on' : ''}`}
									onClick={() => setMode('acquiree')}
								>
									<Target size={11} /> Acquiree
								</button>
								<button
									role="tab"
									aria-selected={mode === 'acquirer'}
									className={`ff-mode-btn ${mode === 'acquirer' ? 'on' : ''}`}
									onClick={() => setMode('acquirer')}
								>
									<Building2 size={11} /> Acquirer
								</button>
								<button
									role="tab"
									aria-selected={mode === 'deal'}
									className={`ff-mode-btn ${mode === 'deal' ? 'on' : ''}`}
									onClick={() => setMode('deal')}
								>
									<Handshake size={11} /> Deal
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
						placeholder="Search targets, acquirers…"
						total={total}
						shown={table.length}
					/>

					{isLoading && table.length === 0 ? (
						<Empty msg="Loading…" />
					) : table.length === 0 ? (
						<div className="card flt-empty-state">
							<h3>No acquisitions match</h3>
							<p>Try clearing some filters.</p>
						</div>
					
					) : (
						<div className="card">
							<table className="data-table funding-table">
								<thead>
									<tr>
										<SortHeader label="Company" sortKey="acquiree_name" sort={sort} setSort={setSort} />
										<SortHeader label="Location" sortKey="hq_country" sort={sort} setSort={setSort} />
										<SortHeader label="Acquirer" sortKey="acquirer_name" sort={sort} setSort={setSort} />
										<SortHeader label="Announced" sortKey="acquisition_date" sort={sort} setSort={setSort} defaultDir="desc" />
										<SortHeader label="Value" sortKey="amount_usd" sort={sort} setSort={setSort} align="right" defaultDir="desc" />
									</tr>
								</thead>
								<tbody>
									{table.map((d) => {
										const cc = d.hq_country ? countryCode(d.hq_country) : '';
										const amt = Number(d.amount_usd ?? 0);
										const linkable = Boolean(d.acquiree_slug);
										return (
											<tr
												key={d.id}
												style={{ cursor: linkable ? 'pointer' : 'default' }}
												onClick={(e) => {
													if (!linkable) return;
													if ((e.target as HTMLElement).closest('button, a')) return;
													router.push(`/companies/${d.acquiree_slug}`);
												}}
											>
												<td>
													<div className="tbl-name-cell">
														<Logo co={{ name: d.acquiree_name ?? '—', website: d.acquiree_website, custom_logo_url: d.acquiree_logo }} size={28} />
														<div className="tbl-name-text">
															<div className="tbl-name-line">
																{linkable ? (
																	<Link
																		href={`/companies/${d.acquiree_slug}`}
																		className="tbl-name co-row-name"
																		onClick={(e) => e.stopPropagation()}
																	>
																		{d.acquiree_name ?? '—'}
																	</Link>
																) : (
																	<span className="tbl-name">{d.acquiree_name ?? '—'}</span>
																)}
																{d.acquiree_is_verified && <VerifiedBadge size={12} />}
															</div>
															{d.acquiree_description && (
																<div className="tbl-sub">{d.acquiree_description}</div>
															)}
														</div>
													</div>
												</td>
												<td>
													<span className="tbl-ellipsis" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
														{cc && <Flag cc={cc} />}
														{[d.hq_city, d.hq_country].filter(Boolean).join(', ') || '—'}
													</span>
												</td>
												<td style={{ color: 'var(--fg-2)' }}>
													<div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
														<ArrowRight size={11} style={{ color: 'var(--fg-muted)', flexShrink: 0 }} />
														<span className="tbl-ellipsis">{d.acquirer_name ?? '—'}</span>
													</div>
												</td>
												<td className="num">{formatShortDate(d.acquisition_date)}</td>
												<td className="num" style={{ textAlign: 'right', fontWeight: 700 }}>
													{Number.isFinite(amt) && amt > 0
														? formatDealAmount(amt)
														: <span style={{ color: 'var(--fg-muted)', fontWeight: 400, fontSize: 11 }}>undisc.</span>}
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>
					)}

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

function statStrip(stats: MaStatsResponse | undefined, currentYear: number) {
	const l = splitDollars(stats?.largest_value ?? 0);
	const m = splitDollars(stats?.median_value ?? 0);
	const strategicPct = stats?.acquisition_pct ?? 0;
	const countDelta = stats?.count_delta_abs ?? null;
	const deltaText = countDelta != null
		? `${countDelta >= 0 ? '+' : ''}${countDelta} vs LY`
		: undefined;
	return [
		{
			label: `${currentYear} YTD`,
			value: (stats?.count ?? 0).toLocaleString(),
			delta: deltaText,
			deltaDir: (countDelta ?? 0) >= 0 ? ('pos' as const) : ('neg' as const),
		},
		{
			label: `Largest ${currentYear}`,
			value: l.value,
			unit: l.unit,
			// Surface the target+acquirer pair like the design's "Genius/Legend".
			delta: stats?.largest_target && stats?.largest_acquirer
				? `${stats.largest_target}/${stats.largest_acquirer}`
				: stats?.largest_target ?? undefined,
			deltaDir: 'pos' as const,
		},
		{
			label: 'Median value',
			value: m.value,
			unit: m.unit,
			deltaDir: 'pos' as const,
		},
		{
			label: 'Strategic share',
			value: strategicPct.toString(),
			unit: '%',
			delta: `vs ${100 - strategicPct}% mergers`,
			deltaDir: 'pos' as const,
		},
	];
}

function MaQuarterlyChart({ quarters }: { quarters: QuarterlyPoint[] }) {
	if (quarters.length === 0) return null;
	// Use deal_count for the M&A chart (matches design: count, not value).
	const maxAmt = Math.max(1, ...quarters.map((q) => q.deal_count));
	const W = 900, H = 150, PAD = 30;
	const xFor = (i: number) => PAD + (W - PAD * 2) * (i / quarters.length) + 6;
	const bw = (W - PAD * 2) / quarters.length - 12;
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
						{Math.round(maxAmt * t)}
					</text>
				</g>
			))}
			{quarters.map((q, i) => {
				const bh = ((H - PAD * 2) * q.deal_count) / maxAmt;
				const y = H - PAD - bh;
				const x = xFor(i);
				return (
					<g key={q.quarter_label}>
						<rect x={x} y={y} width={bw} height={bh} fill={i % 2 === 0 ? BAR_PRIMARY : BAR_SOFT} />
						<text x={x + bw / 2} y={y - 6} textAnchor="middle" fontSize="10" fontFamily="var(--font-mono)" fontWeight={700} fill="var(--fg)">
							{q.deal_count}
						</text>
						<text x={x + bw / 2} y={H - 14} textAnchor="middle" fontSize="10" fontFamily="var(--font-mono)" fill="var(--fg-muted)">
							{q.quarter_label}
						</text>
						<text x={x + bw / 2} y={H + 4} textAnchor="middle" fontSize="9" fontFamily="var(--font-mono)" fill="var(--fg-muted)">
							${(q.total_amount / 1_000_000_000).toFixed(1)}B
						</text>
					</g>
				);
			})}
			<path
				d={quarters
					.map((q, i) => {
						const x = PAD + (W - PAD * 2) * ((i + 0.5) / quarters.length);
						const y = H - PAD - ((H - PAD * 2) * q.deal_count) / maxAmt;
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

function typeTag(t: string | null | undefined): { variant: 'pos' | 'pill' | ''; label: string } {
	switch (t) {
		case 'acquisition': return { variant: 'pos', label: 'Strategic' };
		case 'asset_purchase': return { variant: 'pill', label: 'Asset' };
		case 'merger': return { variant: '', label: 'Merger' };
		default: return { variant: '', label: 'Deal' };
	}
}

function splitDollars(n: number): { value: string; unit: string } {
	if (!Number.isFinite(n) || n <= 0) return { value: '—', unit: '' };
	if (n >= 1_000_000_000) return { value: `$${(n / 1_000_000_000).toFixed(2)}`, unit: 'B' };
	if (n >= 1_000_000) return { value: `$${(n / 1_000_000).toFixed(1)}`, unit: 'M' };
	if (n >= 1_000) return { value: `$${(n / 1_000).toFixed(0)}`, unit: 'K' };
	return { value: `$${n.toFixed(0)}`, unit: '' };
}

function formatDealAmount(value: number): React.ReactNode {
	if (!Number.isFinite(value) || value <= 0) return <span style={{ color: 'var(--fg-muted)' }}>—</span>;
	const m = value / 1_000_000;
	if (m >= 1000) return <>${(m / 1000).toFixed(1)}<span style={{ fontSize: 11, color: 'var(--fg-muted)', marginLeft: 2 }}>B</span></>;
	if (m >= 1) return <>${m.toFixed(1)}<span style={{ fontSize: 11, color: 'var(--fg-muted)', marginLeft: 2 }}>M</span></>;
	return <>${(value / 1_000).toFixed(0)}<span style={{ fontSize: 11, color: 'var(--fg-muted)', marginLeft: 2 }}>K</span></>;
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
