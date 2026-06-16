'use client';

import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Plus, ChevronLeft, ChevronRight, Heart } from 'lucide-react';
import { qk } from '@/lib/query-keys';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useFavorite } from '@/hooks/use-favorite';
import {
	Page, Logo, Flag, AudiencePill, SectorPill, Tag, Empty, PageTitle,
	VerifiedBadge, RaisingDot,
} from '@/components/ui/atoms';
import {
	FilterRail, ActiveFiltersBar, ViewToggle,
	emptyFilterState, type Facet, type FilterState,
} from '@/components/ui/filter-rail';
import { SortHeader, sortToParam, paramToSort, type SortState } from '@/components/ui/sort-header';
import { CompanyDrawer } from '@/components/ui/company-drawer';
import { MyListsBtn } from '@/components/ui/my-lists-btn';
import { WatchlistPicker } from '@/components/ui/watchlist-picker';
import { CompareBar } from '@/components/compare-bar';
import { CompareToggle } from '@/components/compare-toggle';
import { VerifyBanner } from '@/components/get-verified/verify-banner';
import { ExplorerUpgradeBanner, ExplorerLockedFooter, EXPLORER_CAP } from '@/components/ui/explorer-upgrade';
import { useUserProfile, getUserType } from '@/hooks/use-user-profile';

interface RoundType { id: string; name: string; slug: string }
interface FavoriteCompany { company_id: string }
interface FavoritesResponse { data: FavoriteCompany[] }

/**
 * Companies list — pixel-aligned to `ui_design_2/app/screens-2.jsx`
 * CompaniesScreen.
 *
 * Layout: PageTitle + FilterRail (9 facets) + ActiveFiltersBar with view
 * toggle + card grid OR sortable table. Row/card click opens the
 * `<CompanyDrawer>`; Cmd-click opens the full profile in a new tab.
 */

interface CompanyRow {
	id: string;
	name: string;
	slug?: string | null;
	description?: string | null;
	primary_sector?: string | null;
	primary_sector_slug?: string | null;
	hq_city?: string | null;
	hq_country?: string | null;
	founded_year?: number | null;
	total_funding_usd?: number | string | null;
	is_verified?: boolean | null;
	is_actively_raising?: boolean | null;
	last_round_type?: string | null;
	business_model?: string | null;
	website?: string | null;
	custom_logo_url?: string | null;
}

interface CompaniesResponse {
	data: CompanyRow[];
	total: number;
	page: number;
	totalPages: number;
}

interface SectorRef { id: string; name: string; slug: string; parent_id?: string | null }
interface TechTagRef { id: string; name: string; slug: string }
interface LocationFacets { cities: string[]; continents: string[]; regions: string[] }
interface RefResponse<T> { data: T[] }

const COMMON_COUNTRIES = [
	'United States', 'United Kingdom', 'Germany', 'France', 'Spain', 'Italy',
	'Netherlands', 'Sweden', 'Switzerland', 'Belgium', 'Portugal', 'India',
	'China', 'Japan', 'Singapore', 'Australia', 'Brazil', 'Canada',
];

/** Safe id-or-slug resolver — never falls back to the literal string "undefined". */
function resolveTarget(c: { id?: string; slug?: string | null }): string | null {
	const s = c.slug && c.slug !== 'null' ? c.slug : null;
	if (s) return s;
	if (c.id) return c.id;
	return null;
}

export default function CompaniesPage() {
	const router = useRouter();
	const pathname = usePathname();
	const params = useSearchParams();

	// Default = table — denser, sortable, and what most operators want to land on
	// when comparing companies. `?view=grid` opts into the card layout.
	const [view, setView] = useState<'grid' | 'table'>((params.get('view') as 'grid' | 'table') ?? 'table');
	const [page, setPage] = useState(Number(params.get('page') ?? '1'));
	const [drawerTarget, setDrawerTarget] = useState<string | null>(null);
	const [sort, setSort] = useState<SortState | null>(paramToSort(params.get('sort')));
	const [pickerOpen, setPickerOpen] = useState(false);

	const { data: sectorsResp } = useSWR<RefResponse<SectorRef> | SectorRef[]>(qk.reference.sectors(), {
		dedupingInterval: 60 * 60_000,
	});
	const sectorList = Array.isArray(sectorsResp) ? sectorsResp : (sectorsResp?.data ?? []);

	// Split the flat sector list into its three hierarchy tiers (pillar →
	// sub-sector → sub-sub-sector) by walking `parent_id`, and provide a
	// `expand(slug)` that returns a slug plus all descendant slugs — so picking
	// a pillar/sub-sector filters every leaf beneath it (the backend matches
	// `company.sector_id` by slug, which is otherwise leaf-only).
	const sectorTiers = useMemo(() => {
		const byId = new Map(sectorList.map((s) => [s.id, s]));
		const depthOf = (s: SectorRef) => {
			let d = 0; let cur: SectorRef | undefined = s;
			while (cur?.parent_id && d < 6) { d++; cur = byId.get(cur.parent_id); }
			return d;
		};
		const childrenByParent = new Map<string, string[]>();
		sectorList.forEach((s) => {
			if (!s.parent_id) return;
			const arr = childrenByParent.get(s.parent_id) ?? [];
			arr.push(s.id);
			childrenByParent.set(s.parent_id, arr);
		});
		const bySlug = new Map(sectorList.map((s) => [s.slug, s]));
		const expand = (slug: string): string[] => {
			const root = bySlug.get(slug);
			if (!root) return [slug];
			const out = [slug];
			const stack = [root.id];
			while (stack.length) {
				const id = stack.pop()!;
				for (const cid of childrenByParent.get(id) ?? []) {
					const c = byId.get(cid);
					if (c) { out.push(c.slug); stack.push(cid); }
				}
			}
			return out;
		};
		return {
			tops: sectorList.filter((s) => depthOf(s) === 0),
			subs: sectorList.filter((s) => depthOf(s) === 1),
			subSubs: sectorList.filter((s) => depthOf(s) >= 2),
			expand,
		};
	}, [sectorList]);

	const { data: roundTypesResp } = useSWR<RefResponse<RoundType> | RoundType[]>(qk.reference.roundTypes(), {
		dedupingInterval: 60 * 60_000,
	});
	const roundTypes = Array.isArray(roundTypesResp) ? roundTypesResp : (roundTypesResp?.data ?? []);

	const { data: sportsResp } = useSWR<RefResponse<SectorRef> | SectorRef[]>(qk.reference.sports(), {
		dedupingInterval: 60 * 60_000,
	});
	const sportList = Array.isArray(sportsResp) ? sportsResp : (sportsResp?.data ?? []);

	// Tech tags + location facets back the advanced (Growth-gated) filters. Both
	// are tiny, near-static reference lists — cache for an hour.
	const { data: techTagsResp } = useSWR<RefResponse<TechTagRef> | TechTagRef[]>(qk.reference.techTags(), {
		dedupingInterval: 60 * 60_000,
	});
	const techTags = Array.isArray(techTagsResp) ? techTagsResp : (techTagsResp?.data ?? []);

	const { data: locationFacets } = useSWR<LocationFacets>(qk.reference.locationFacets(), {
		dedupingInterval: 60 * 60_000,
	});

	const { data: favoritesResp } = useSWR<FavoritesResponse>(qk.favorites.list('companies'));
	const favoriteIds = useMemo(
		() => (favoritesResp?.data ?? []).map((r) => r.company_id),
		[favoritesResp],
	);

	// Faceted filters mirroring `ui_design_2/app/screens-2.jsx:31-45`. `favorites`
	// is a client-side gate that injects `ids=` from `/api/favorites/companies`.
	// Order matches the design: top toggles, then SECTOR / BUSINESS DETAILS /
	// LOCATION sections (driven by the `section` field on each facet).
	const facets = useMemo<Facet[]>(() => [
		{ key: 'favorites', label: 'Favorites', kind: 'bool' },
		{ key: 'is_verified', label: 'Verified', kind: 'bool' },
		{ key: 'is_actively_raising', label: 'Actively raising', kind: 'bool' },
		{ key: 'is_unicorn', label: 'Unicorn', kind: 'bool' },
		{
			key: 'sector_slug',
			label: 'Sector',
			kind: 'multi',
			section: 'Sector',
			options: () => sectorTiers.tops.map((s) => ({ value: s.slug, label: s.name })),
			maxHeight: 260,
		},
		{
			key: 'sub_sector_slug',
			label: 'Sub-sector',
			kind: 'multi',
			section: 'Sector',
			options: () => sectorTiers.subs.map((s) => ({ value: s.slug, label: s.name })),
			maxHeight: 260,
		},
		{
			key: 'sub_sub_sector_slug',
			label: 'Sub-sub-sector',
			kind: 'multi',
			section: 'Sector',
			gate: 'advanced_filters',
			options: () => sectorTiers.subSubs.map((s) => ({ value: s.slug, label: s.name })),
			maxHeight: 260,
		},
		{
			key: 'business_model',
			label: 'Business model',
			kind: 'multi',
			section: 'Business details',
			options: () => [
				{ value: 'b2b', label: 'B2B' },
				{ value: 'b2c', label: 'B2C' },
				{ value: 'b2b2c', label: 'B2B2C' },
				{ value: 'd2c', label: 'D2C' },
				{ value: 'b2g', label: 'B2G' },
			],
		},
		{
			key: 'last_round_type',
			label: 'Stage',
			kind: 'multi',
			section: 'Business details',
			options: () => roundTypes.map((r) => ({ value: r.slug, label: r.name })),
			maxHeight: 240,
		},
		{
			key: 'sport_slug',
			label: 'Sport',
			kind: 'multi',
			section: 'Business details',
			options: () => sportList.map((s) => ({ value: s.slug, label: s.name })),
			maxHeight: 240,
		},
		{
			key: 'founded',
			label: 'Founded year',
			kind: 'range',
			section: 'Business details',
			min: 1990,
			max: new Date().getFullYear(),
			step: 1,
		},
		{
			key: 'raised',
			label: 'Total funding (USD millions)',
			kind: 'range',
			section: 'Business details',
			min: 0,
			max: 250,
			step: 5,
		},
		{ key: 'unfunded', label: 'Unfunded only', kind: 'bool' },
		{
			key: 'country',
			label: 'Country',
			kind: 'multi',
			section: 'Location',
			options: () => COMMON_COUNTRIES.map((c) => ({ value: c, label: c })),
		},
		// Advanced location facets — gated on `advanced_filters` (Growth+). The
		// FilterRail renders a working Upgrade teaser for users without access and
		// the real multi-select for entitled users. Options come from the live
		// /api/locations/facets reference list, so they reflect actual data.
		{
			key: 'city', label: 'City', kind: 'multi', section: 'Location', gate: 'advanced_filters',
			options: () => (locationFacets?.cities ?? []).map((c) => ({ value: c, label: c })),
			maxHeight: 220,
		},
		{
			key: 'continent', label: 'Continent', kind: 'multi', section: 'Location', gate: 'advanced_filters',
			options: () => (locationFacets?.continents ?? []).map((c) => ({ value: c, label: c })),
		},
		{
			key: 'region', label: 'Region', kind: 'multi', section: 'Location', gate: 'advanced_filters',
			options: () => (locationFacets?.regions ?? []).map((r) => ({ value: r, label: r })),
		},
		// Tech tags — gated on `advanced_filters`. Backed by /api/tech-tags; the
		// selected slugs map to the backend `tech_tag_slug` param.
		{
			key: 'tech_tag_slug', label: 'Tech tags', kind: 'multi', section: 'Other', gate: 'advanced_filters',
			options: () => techTags.map((t) => ({ value: t.slug, label: t.name })),
			maxHeight: 240,
		},
	], [sectorTiers, roundTypes, sportList, techTags, locationFacets]);

	const [filterState, setFilterState] = useState<FilterState>(() => {
		const init = emptyFilterState(facets, { search: params.get('q') ?? '' });
		const v = params.get('is_verified'); if (v) init.is_verified = v === 'true';
		const r = params.get('is_actively_raising'); if (r) init.is_actively_raising = r === 'true';
		const u = params.get('is_unicorn'); if (u) init.is_unicorn = u === 'true';
		const fav = params.get('favorites'); if (fav) init.favorites = fav === 'true';
		const s = params.get('sector_slug') ?? params.get('sector');
		if (s) init.sector_slug = s.split(',').filter(Boolean);
		const ss = params.get('sub_sector_slug');
		if (ss) init.sub_sector_slug = ss.split(',').filter(Boolean);
		const sss = params.get('sub_sub_sector_slug');
		if (sss) init.sub_sub_sector_slug = sss.split(',').filter(Boolean);
		const unf = params.get('unfunded'); if (unf) init.unfunded = unf === 'true';
		const c = params.get('country');
		if (c) init.country = c.split(',').filter(Boolean);
		const city = params.get('city');
		if (city) init.city = city.split(',').filter(Boolean);
		const cont = params.get('continent');
		if (cont) init.continent = cont.split(',').filter(Boolean);
		const reg = params.get('region');
		if (reg) init.region = reg.split(',').filter(Boolean);
		const tech = params.get('tech_tag_slug');
		if (tech) init.tech_tag_slug = tech.split(',').filter(Boolean);
		const bm = params.get('business_model');
		if (bm) init.business_model = bm.split(',').filter(Boolean);
		const stage = params.get('last_round_type');
		if (stage) init.last_round_type = stage.split(',').filter(Boolean);
		const fMin = params.get('founded_year_min');
		const fMax = params.get('founded_year_max');
		if (fMin && fMax) init.founded = [Number(fMin), Number(fMax)] as [number, number];
		const rMin = params.get('min_funding');
		const rMax = params.get('max_funding');
		if (rMin && rMax) init.raised = [Number(rMin) / 1_000_000, Number(rMax) / 1_000_000] as [number, number];
		return init;
	});

	useEffect(() => {
		const sp = new URLSearchParams();
		if (filterState.search) sp.set('q', filterState.search);
		if (filterState.is_verified === true) sp.set('is_verified', 'true');
		if (filterState.is_actively_raising === true) sp.set('is_actively_raising', 'true');
		if (filterState.is_unicorn === true) sp.set('is_unicorn', 'true');
		if (filterState.favorites === true) sp.set('favorites', 'true');
		const sec = filterState.sector_slug as string[] | undefined;
		if (sec?.length) sp.set('sector_slug', sec.join(','));
		const subSec = filterState.sub_sector_slug as string[] | undefined;
		if (subSec?.length) sp.set('sub_sector_slug', subSec.join(','));
		const subSubSec = filterState.sub_sub_sector_slug as string[] | undefined;
		if (subSubSec?.length) sp.set('sub_sub_sector_slug', subSubSec.join(','));
		if (filterState.unfunded === true) sp.set('unfunded', 'true');
		const ctry = filterState.country as string[] | undefined;
		if (ctry?.length) sp.set('country', ctry.join(','));
		const cityF = filterState.city as string[] | undefined;
		if (cityF?.length) sp.set('city', cityF.join(','));
		const contF = filterState.continent as string[] | undefined;
		if (contF?.length) sp.set('continent', contF.join(','));
		const regF = filterState.region as string[] | undefined;
		if (regF?.length) sp.set('region', regF.join(','));
		const techF = filterState.tech_tag_slug as string[] | undefined;
		if (techF?.length) sp.set('tech_tag_slug', techF.join(','));
		const bm = filterState.business_model as string[] | undefined;
		if (bm?.length) sp.set('business_model', bm.join(','));
		const stage = filterState.last_round_type as string[] | undefined;
		if (stage?.length) sp.set('last_round_type', stage.join(','));
		const f = filterState.founded as [number, number] | undefined;
		if (f && (f[0] !== 1990 || f[1] !== new Date().getFullYear())) {
			sp.set('founded_year_min', String(f[0]));
			sp.set('founded_year_max', String(f[1]));
		}
		const raised = filterState.raised as [number, number] | undefined;
		if (raised && (raised[0] !== 0 || raised[1] !== 250)) {
			sp.set('min_funding', String(raised[0] * 1_000_000));
			sp.set('max_funding', String(raised[1] * 1_000_000));
		}
		if (page > 1) sp.set('page', String(page));
		if (view !== 'grid') sp.set('view', view);
		const sortParam = sortToParam(sort);
		if (sortParam) sp.set('sort', sortParam);
		const qs = sp.toString();
		router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [filterState, page, view, sort]);

	const debouncedSearch = useDebouncedValue(filterState.search ?? '', 300);

	const queryParams: Record<string, unknown> = { page, limit: 24 };
	if (debouncedSearch) queryParams.search = debouncedSearch;
	// Merge all three sector tiers and expand each selection to its descendant
	// slugs so a pillar/sub-sector also matches the leaf sectors beneath it.
	const sectorSel = [
		...(filterState.sector_slug as string[] ?? []),
		...(filterState.sub_sector_slug as string[] ?? []),
		...(filterState.sub_sub_sector_slug as string[] ?? []),
	];
	if (sectorSel.length) {
		const expanded = Array.from(new Set(sectorSel.flatMap((s) => sectorTiers.expand(s))));
		queryParams.sector_slug = expanded.join(',');
	}
	const ctry = filterState.country as string[] | undefined;
	if (ctry?.length === 1) queryParams.country = ctry[0];
	const cityF = filterState.city as string[] | undefined;
	if (cityF?.length) queryParams.city = cityF.join(',');
	const contF = filterState.continent as string[] | undefined;
	if (contF?.length) queryParams.continent = contF.join(',');
	const regF = filterState.region as string[] | undefined;
	if (regF?.length) queryParams.region = regF.join(',');
	const techF = filterState.tech_tag_slug as string[] | undefined;
	if (techF?.length) queryParams.tech_tag_slug = techF.join(',');
	const sportF = filterState.sport_slug as string[] | undefined;
	if (sportF?.length) queryParams.sport_slug = sportF.join(',');
	const bm = filterState.business_model as string[] | undefined;
	if (bm?.length) queryParams.business_model = bm.join(',');
	const stage = filterState.last_round_type as string[] | undefined;
	if (stage?.length) queryParams.last_round_type = stage.join(',');
	if (filterState.is_verified === true) queryParams.is_verified = true;
	if (filterState.is_actively_raising === true) queryParams.is_actively_raising = true;
	if (filterState.is_unicorn === true) queryParams.is_unicorn = true;
	if (filterState.favorites === true) {
		// `ids` short-circuits the list to the user's saved set. If the user
		// has no favorites, force an empty result by passing a sentinel UUID
		// that won't match anything.
		queryParams.ids = favoriteIds.length ? favoriteIds.join(',') : '00000000-0000-0000-0000-000000000000';
	}
	const f = filterState.founded as [number, number] | undefined;
	if (f && (f[0] !== 1990 || f[1] !== new Date().getFullYear())) {
		queryParams.founded_year_min = f[0];
		queryParams.founded_year_max = f[1];
	}
	const raised = filterState.raised as [number, number] | undefined;
	if (raised && (raised[0] !== 0 || raised[1] !== 250)) {
		queryParams.min_funding = raised[0] * 1_000_000;
		queryParams.max_funding = raised[1] * 1_000_000;
	}
	// "Unfunded only" overrides the funding range with a hard 0-cap.
	if (filterState.unfunded === true) {
		queryParams.min_funding = 0;
		queryParams.max_funding = 0;
	}
	const sortParam = sortToParam(sort);
	if (sortParam) queryParams.sort = sortParam;

	const { data, isLoading } = useSWR<CompaniesResponse>(qk.companies.list(queryParams), {
		dedupingInterval: 3 * 60_000,
	});

	const rawCompanies = data?.data ?? [];
	const total = data?.total ?? 0;

	// Free (Explorer) tier sees only the first EXPLORER_CAP companies. Cap the
	// rows on the boundary page and the reachable page count; everything past
	// the cap is "locked" behind a Growth upgrade.
	const { data: profile } = useUserProfile();
	const isExplorer = getUserType(profile) === 'free';
	const PAGE_SIZE = 24;
	const capPages = Math.ceil(EXPLORER_CAP / PAGE_SIZE);
	const rowsAllowedThisPage = isExplorer ? Math.max(0, EXPLORER_CAP - (page - 1) * PAGE_SIZE) : Infinity;
	const companies = isExplorer ? rawCompanies.slice(0, rowsAllowedThisPage) : rawCompanies;
	const totalPages = isExplorer ? Math.min(data?.totalPages ?? 1, capPages) : (data?.totalPages ?? 1);
	const hiddenCount = isExplorer ? Math.max(0, total - EXPLORER_CAP) : 0;

	const handleRowClick = (c: CompanyRow, e: React.MouseEvent) => {
		// Skip if the click landed on an inner button (fav, compare, etc.)
		if ((e.target as HTMLElement).closest('button, a')) return;
		const target = resolveTarget(c);
		if (!target) return;
		if (e.metaKey || e.ctrlKey) {
			window.open(`/companies/${target}`, '_blank');
			return;
		}
		setDrawerTarget(target);
	};

	return (
		<Page>
			<PageTitle
				kicker={`Database · ${total.toLocaleString()} entries`}
				title="Companies"
				action={
					<div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
						<MyListsBtn />
						<button
							className="btn"
							onClick={() => setPickerOpen(true)}
							title="Create or edit your watchlists"
						>
							<Plus size={12} /> Add to watchlist
						</button>
					</div>
				}
			/>

			<VerifyBanner />

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
						placeholder="Search companies, descriptions…"
						total={total}
						shown={companies.length}
						viewToggle={<ViewToggle view={view} setView={setView} />}
					/>

					{isExplorer && total > 0 && <ExplorerUpgradeBanner capped={hiddenCount > 0} />}

					{isLoading && companies.length === 0 ? (
						<Empty msg="Loading…" />
					) : companies.length === 0 ? (
						<div className="card flt-empty-state">
							<h3>No companies match</h3>
							<p>Try clearing some filters or widening your ranges.</p>
						</div>
					) : view === 'grid' ? (
						<div className="co-grid">
							{companies.map((c) => (
								<CompanyCard key={c.id} c={c} onClick={handleRowClick} />
							))}
						</div>
					) : (
						<div className="card">
							<table className="data-table co-table">
								<thead>
									<tr>
										<th style={{ width: 36 }} />
										<SortHeader label="Company" sortKey="name" sort={sort} setSort={setSort} />
										<th>Audience</th>
										<th>Sector</th>
										<th>Stage</th>
										<th>HQ</th>
										<SortHeader label="Raised" sortKey="total_funding" sort={sort} setSort={setSort} align="right" defaultDir="desc" />
										<SortHeader label="Founded" sortKey="founded_year" sort={sort} setSort={setSort} defaultDir="desc" />
									</tr>
								</thead>
								<tbody>
									{companies.map((c) => {
										const cc = c.hq_country ? countryCode(c.hq_country) : '';
										return (
											<tr
												key={c.id}
												style={{ cursor: 'pointer' }}
												onClick={(e) => handleRowClick(c, e)}
											>
												<td>
													<RowHeartBtn id={c.id} />
												</td>
												<td>
													<div className="tbl-name-cell">
														<Logo co={{ name: c.name, website: c.website, custom_logo_url: c.custom_logo_url }} size={28} />
														<div className="tbl-name-text">
															<div className="tbl-name-line">
																<button
																	className="tbl-name co-row-name"
																	onClick={(e) => {
																		e.stopPropagation();
																		const target = resolveTarget(c);
																		if (target) router.push(`/companies/${target}`);
																	}}
																>
																	{c.name}
																</button>
																{c.is_verified && <VerifiedBadge size={12} />}
																{c.is_actively_raising && <RaisingDot size={7} />}
															</div>
															{c.description && <div className="tbl-sub">{c.description}</div>}
														</div>
													</div>
												</td>
												<td>
													{c.primary_sector_slug ? (
														<AudiencePill sectorSlug={c.primary_sector_slug} size="sm" />
													) : '—'}
												</td>
												<td>
													{c.primary_sector ? (
														<Tag>{c.primary_sector}</Tag>
													) : '—'}
												</td>
												<td>
													{c.last_round_type ? <Tag>{c.last_round_type}</Tag> : '—'}
												</td>
												<td>
													<span className="tbl-ellipsis" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
														{cc && <Flag cc={cc} />}
														{[c.hq_city, c.hq_country].filter(Boolean).join(', ') || '—'}
													</span>
												</td>
												<td className="num" style={{ textAlign: 'right', fontWeight: 700 }}>
													{formatRaised(c.total_funding_usd)}
												</td>
												<td className="num">{c.founded_year ?? '—'}</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>
					)}

					{isExplorer && hiddenCount > 0 && companies.length > 0 && (
						<ExplorerLockedFooter hiddenCount={hiddenCount} />
					)}

					<CompanyDrawer
						idOrSlug={drawerTarget}
						onClose={() => setDrawerTarget(null)}
					/>

					<WatchlistPicker
						open={pickerOpen}
						onClose={() => setPickerOpen(false)}
						companyId={null}
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

function RowHeartBtn({ id, size = 13 }: { id: string; size?: number }) {
	const { isFavorite, toggle, pending } = useFavorite('companies', id);
	return (
		<button
			className="co-fav-btn"
			disabled={pending}
			onClick={(e) => { e.stopPropagation(); void toggle(); }}
			title={isFavorite ? 'Saved' : 'Save'}
			aria-label={isFavorite ? 'Saved' : 'Save'}
		>
			<Heart size={size} style={isFavorite ? { color: 'var(--accent)', fill: 'currentColor' } : undefined} />
		</button>
	);
}

function CompanyCard({
	c, onClick,
}: {
	c: CompanyRow;
	onClick: (c: CompanyRow, e: React.MouseEvent) => void;
}) {
	const cc = c.hq_country ? countryCode(c.hq_country) : '';
	return (
		<div
			role="button"
			tabIndex={0}
			className="card co-card"
			style={{ display: 'block', width: '100%', textAlign: 'left', cursor: 'pointer' }}
			onClick={(e) => onClick(c, e)}
			onKeyDown={(e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					if ((e.target as HTMLElement).closest('button, a')) return;
					e.preventDefault();
					onClick(c, e as unknown as React.MouseEvent);
				}
			}}
		>
			<div className="co-card-head">
				<RowHeartBtn id={c.id} size={14} />
				<Logo co={{ name: c.name, website: c.website, custom_logo_url: c.custom_logo_url }} size={44} />
				<div style={{ flex: 1, minWidth: 0 }}>
					<div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
						<span style={{ fontWeight: 700, fontSize: 15 }}>{c.name}</span>
						{c.is_verified && <VerifiedBadge size={13} />}
						{c.is_actively_raising && <RaisingDot size={8} />}
					</div>
					<div style={{ fontSize: 11, color: 'var(--fg-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
						{cc && <Flag cc={cc} />}
						{[c.hq_city, c.hq_country].filter(Boolean).join(', ') || '—'}
						{c.founded_year && <> · Founded {c.founded_year}</>}
					</div>
				</div>
			</div>
			{c.description && <p className="co-sub">{c.description}</p>}
			<div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 10, alignItems: 'center' }}>
				{c.primary_sector && (
					<SectorPill
						name={c.primary_sector}
						slug={c.primary_sector_slug ?? null}
					/>
				)}
				{c.primary_sector_slug && (
					<AudiencePill sectorSlug={c.primary_sector_slug} size="sm" />
				)}
			</div>
			<div className="co-card-compare">
				<CompareToggle id={c.id} kind="companies" />
			</div>
		</div>
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
		Ireland: 'IE', Finland: 'FI', Norway: 'NO', Denmark: 'DK', Israel: 'IL',
		'Saudi Arabia': 'SA', UAE: 'AE', 'United Arab Emirates': 'AE',
		Mexico: 'MX', 'South Korea': 'KR', Korea: 'KR',
	};
	return map[countryName] ?? countryName.slice(0, 2).toUpperCase();
}
