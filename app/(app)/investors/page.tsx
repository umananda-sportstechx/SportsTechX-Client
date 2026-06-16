'use client';

import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { qk } from '@/lib/query-keys';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { Page, Flag, Tag, Empty, PageTitle, VerifiedBadge } from '@/components/ui/atoms';
import { FeatureGate } from '@/components/shell/screen-lock';
import {
	FilterRail, ActiveFiltersBar, ViewToggle,
	emptyFilterState, type Facet, type FilterState,
} from '@/components/ui/filter-rail';
import {
	locationFacets, setLocationUrlParams, readLocationParams, applyLocationQueryParams,
	type LocationFacets,
} from '@/lib/location-facets';
import { SortHeader, sortToParam, paramToSort, type SortState } from '@/components/ui/sort-header';
import { InvestorDrawer } from '@/components/ui/investor-drawer';
import { CompareBar } from '@/components/compare-bar';
import { CompareToggle } from '@/components/compare-toggle';

interface InvestorRow {
	id: string;
	name: string;
	slug?: string;
	is_verified?: boolean | null;
	description?: string | null;
	thesis?: string | null;
	category?: string | null;
	type?: string | null;
	hq_country?: string | null;
	hq_city?: string | null;
	total_aum_usd?: number | string | null;
	deals_count?: number | null;
	primary_focus?: string | null;
	recent_investment?: string | null;
	year_launched?: number | null;
}

interface InvestorsResponse {
	data: InvestorRow[];
	total: number;
	page: number;
	totalPages: number;
}

const COMMON_COUNTRIES = [
	'United States', 'United Kingdom', 'Germany', 'France', 'Spain', 'Italy',
	'Netherlands', 'Sweden', 'Switzerland', 'Belgium', 'Portugal', 'India',
	'China', 'Japan', 'Singapore', 'Australia', 'Brazil', 'Canada',
];

interface RoundRef { id: string; name: string; slug: string }
interface SectorRef { id: string; name: string; slug: string }
interface SportRef { id: string; name: string; slug: string }
interface TechTagRef { id: string; name: string; slug: string }

const CATEGORY_OPTIONS = [
	{ value: 'venture_capital', label: 'VC' },
	{ value: 'financial_services', label: 'CVC' },
	{ value: 'private_equity', label: 'PE' },
	{ value: 'family_investment_office', label: 'Family Office' },
	{ value: 'sovereign_wealth_fund', label: 'SWF' },
	{ value: 'angel', label: 'Angel' },
];

const TYPE_COLORS: Record<string, string> = {
	venture_capital: 'oklch(62% 0.18 240)',
	financial_services: 'oklch(62% 0.16 160)',
	private_equity: 'oklch(62% 0.18 30)',
	family_investment_office: 'oklch(62% 0.20 290)',
	sovereign_wealth_fund: 'oklch(62% 0.18 60)',
	angel: 'oklch(62% 0.18 350)',
	other: 'oklch(62% 0.04 240)',
};

export default function InvestorsPage() {
	return (
		<FeatureGate slug="investors_full" screen="investors">
			<InvestorsPageInner />
		</FeatureGate>
	);
}

function InvestorsPageInner() {
	const router = useRouter();
	const pathname = usePathname();
	const params = useSearchParams();

	const [page, setPage] = useState(Number(params.get('page') ?? '1'));
	const [drawerTarget, setDrawerTarget] = useState<string | null>(null);
	const [view, setView] = useState<'table' | 'grid'>((params.get('view') as 'table' | 'grid') ?? 'grid');
	const [sort, setSort] = useState<SortState | null>(paramToSort(params.get('sort')));

	const { data: roundsResp } = useSWR<{ data: RoundRef[] } | RoundRef[]>(qk.reference.roundTypes(), {
		dedupingInterval: 60 * 60_000,
	});
	const roundList = Array.isArray(roundsResp) ? roundsResp : (roundsResp?.data ?? []);

	const { data: sectorsResp } = useSWR<{ data: SectorRef[] } | SectorRef[]>(qk.reference.sectors(), {
		dedupingInterval: 60 * 60_000,
	});
	const sectorList = Array.isArray(sectorsResp) ? sectorsResp : (sectorsResp?.data ?? []);

	const { data: sportsResp } = useSWR<{ data: SportRef[] } | SportRef[]>(qk.reference.sports(), {
		dedupingInterval: 60 * 60_000,
	});
	const sportList = Array.isArray(sportsResp) ? sportsResp : (sportsResp?.data ?? []);

	const { data: techTagsResp } = useSWR<{ data: TechTagRef[] } | TechTagRef[]>(qk.reference.techTags(), {
		dedupingInterval: 60 * 60_000,
	});
	const techTags = Array.isArray(techTagsResp) ? techTagsResp : (techTagsResp?.data ?? []);

	const { data: locFacets } = useSWR<LocationFacets>(qk.reference.locationFacets(), {
		dedupingInterval: 60 * 60_000,
	});

	const currentYear = new Date().getFullYear();

	const facets = useMemo<Facet[]>(() => [
		{ key: 'is_verified', label: 'Verified', kind: 'bool' },
		{ key: 'actively_investing', label: 'Actively investing', kind: 'bool' },
		{
			key: 'category',
			label: 'Firm type',
			kind: 'multi',
			options: () => CATEGORY_OPTIONS,
		},
		{
			key: 'round_type_slug',
			label: 'Stage focus',
			kind: 'multi',
			options: () => roundList.map((r) => ({ value: r.slug, label: r.name })),
			maxHeight: 220,
		},
		{
			key: 'country',
			label: 'Country',
			kind: 'multi',
			section: 'Location',
			options: () => COMMON_COUNTRIES.map((c) => ({ value: c, label: c })),
		},
		...locationFacets(locFacets),
		{
			key: 'sector_slug',
			label: 'Portfolio sector',
			kind: 'multi',
			section: 'Thesis',
			options: () => sectorList.map((s) => ({ value: s.slug, label: s.name })),
			maxHeight: 240,
		},
		{
			key: 'sport_slug',
			label: 'Sport',
			kind: 'multi',
			section: 'Thesis',
			options: () => sportList.map((s) => ({ value: s.slug, label: s.name })),
			maxHeight: 240,
		},
		{
			key: 'tech_tag_slug',
			label: 'Tech tags',
			kind: 'multi',
			section: 'Thesis',
			gate: 'advanced_filters',
			options: () => techTags.map((t) => ({ value: t.slug, label: t.name })),
			maxHeight: 240,
		},
		{
			key: 'year_launched',
			label: 'Year launched',
			kind: 'range',
			section: 'Firm',
			min: 1990,
			max: currentYear,
			step: 1,
		},
		{
			key: 'deals',
			label: 'Deal count',
			kind: 'range',
			section: 'Firm',
			min: 0,
			max: 50,
			step: 1,
		},
	], [roundList, sectorList, sportList, techTags, locFacets, currentYear]);

	const [filterState, setFilterState] = useState<FilterState>(() => {
		const init = emptyFilterState(facets, { search: params.get('q') ?? '' });
		const v = params.get('is_verified'); if (v) init.is_verified = v === 'true';
		const a = params.get('actively_investing'); if (a) init.actively_investing = a === 'true';
		const c = params.get('category');
		if (c) init.category = c.split(',').filter(Boolean);
		const rt = params.get('round_type_slug');
		if (rt) init.round_type_slug = rt.split(',').filter(Boolean);
		const ct = params.get('country');
		if (ct) init.country = ct.split(',').filter(Boolean);
		Object.assign(init, readLocationParams(params as unknown as URLSearchParams));
		const sec = params.get('sector_slug');
		if (sec) init.sector_slug = sec.split(',').filter(Boolean);
		const sp = params.get('sport_slug');
		if (sp) init.sport_slug = sp.split(',').filter(Boolean);
		const tt = params.get('tech_tag_slug');
		if (tt) init.tech_tag_slug = tt.split(',').filter(Boolean);
		const ylMin = params.get('year_launched_min');
		const ylMax = params.get('year_launched_max');
		if (ylMin && ylMax) init.year_launched = [Number(ylMin), Number(ylMax)] as [number, number];
		const dMin = params.get('deals_min');
		const dMax = params.get('deals_max');
		if (dMin && dMax) init.deals = [Number(dMin), Number(dMax)] as [number, number];
		return init;
	});

	useEffect(() => {
		const sp = new URLSearchParams();
		if (filterState.search) sp.set('q', filterState.search);
		if (filterState.is_verified === true) sp.set('is_verified', 'true');
		if (filterState.actively_investing === true) sp.set('actively_investing', 'true');
		const cat = filterState.category as string[] | undefined;
		if (cat?.length) sp.set('category', cat.join(','));
		const rt = filterState.round_type_slug as string[] | undefined;
		if (rt?.length) sp.set('round_type_slug', rt.join(','));
		const ct = filterState.country as string[] | undefined;
		if (ct?.length) sp.set('country', ct.join(','));
		setLocationUrlParams(sp, filterState);
		const sec = filterState.sector_slug as string[] | undefined;
		if (sec?.length) sp.set('sector_slug', sec.join(','));
		const spt = filterState.sport_slug as string[] | undefined;
		if (spt?.length) sp.set('sport_slug', spt.join(','));
		const tt = filterState.tech_tag_slug as string[] | undefined;
		if (tt?.length) sp.set('tech_tag_slug', tt.join(','));
		const yl = filterState.year_launched as [number, number] | undefined;
		if (yl && (yl[0] !== 1990 || yl[1] !== currentYear)) { sp.set('year_launched_min', String(yl[0])); sp.set('year_launched_max', String(yl[1])); }
		const dl = filterState.deals as [number, number] | undefined;
		if (dl && (dl[0] !== 0 || dl[1] !== 50)) { sp.set('deals_min', String(dl[0])); sp.set('deals_max', String(dl[1])); }
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
	const cat = filterState.category as string[] | undefined;
	if (cat?.length === 1) queryParams.category = cat[0];
	if (filterState.is_verified === true) queryParams.is_verified = true;
	if (filterState.actively_investing === true) queryParams.actively_investing = true;
	const rtSel = filterState.round_type_slug as string[] | undefined;
	if (rtSel?.length) queryParams.round_type_slug = rtSel.join(',');
	const ctSel = filterState.country as string[] | undefined;
	if (ctSel?.length) queryParams.country = ctSel.join(',');
	applyLocationQueryParams(queryParams, filterState);
	const secSel = filterState.sector_slug as string[] | undefined;
	if (secSel?.length) queryParams.sector_slug = secSel.join(',');
	const sptSel = filterState.sport_slug as string[] | undefined;
	if (sptSel?.length) queryParams.sport_slug = sptSel.join(',');
	const ttSel = filterState.tech_tag_slug as string[] | undefined;
	if (ttSel?.length) queryParams.tech_tag_slug = ttSel.join(',');
	const ylSel = filterState.year_launched as [number, number] | undefined;
	if (ylSel && (ylSel[0] !== 1990 || ylSel[1] !== currentYear)) { queryParams.year_launched_min = ylSel[0]; queryParams.year_launched_max = ylSel[1]; }
	const dlSel = filterState.deals as [number, number] | undefined;
	if (dlSel && (dlSel[0] !== 0 || dlSel[1] !== 50)) { queryParams.deals_min = dlSel[0]; queryParams.deals_max = dlSel[1]; }
	const sortParam = sortToParam(sort);
	if (sortParam) queryParams.sort = sortParam;

	const { data, isLoading } = useSWR<InvestorsResponse>(qk.investors.list(queryParams), {
		dedupingInterval: 3 * 60_000,
	});

	const investors = data?.data ?? [];
	const total = data?.total ?? 0;
	const totalPages = data?.totalPages ?? 1;

	return (
		<Page>
			<PageTitle
				kicker={`Capital · ${total.toLocaleString()} firms`}
				title="Investors"
				sub="The capital markets behind sports tech — VCs, corporate venture, PE and accelerators."
				action={<button className="btn"><Plus size={12} /> Add to watchlist</button>}
			/>

			<div className="flt-layout">
				<FilterRail
					facets={facets}
					state={filterState}
					setState={(s) => { setFilterState(s); setPage(1); }}
					defaultOpen={{ category: true }}
				/>

				<div className="flt-main">
					<ActiveFiltersBar
						facets={facets}
						state={filterState}
						setState={setFilterState}
						placeholder="Search firms, thesis, portfolio…"
						total={total}
						shown={investors.length}
						viewToggle={<ViewToggle view={view} setView={setView} />}
					/>

					{isLoading && investors.length === 0 ? (
						<Empty msg="Loading…" />
					) : investors.length === 0 ? (
						<div className="card flt-empty-state">
							<h3>No investors match</h3>
							<p>Try clearing some filters.</p>
						</div>
					) : view === 'grid' ? (
						<div className="inv-grid">
							{investors.map((i) => (
								<InvestorCard key={i.id} i={i} onOpenDrawer={setDrawerTarget} />
							))}
						</div>
					) : (
						<InvestorTable
							investors={investors}
							sort={sort}
							setSort={setSort}
							onOpenDrawer={setDrawerTarget}
						/>
					)}

					<InvestorDrawer
						idOrSlug={drawerTarget}
						onClose={() => setDrawerTarget(null)}
					/>

					<CompareBar kind="investors" />

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

function InvestorTable({
	investors, sort, setSort, onOpenDrawer,
}: {
	investors: InvestorRow[];
	sort: SortState | null;
	setSort: (s: SortState | null) => void;
	onOpenDrawer: (idOrSlug: string) => void;
}) {
	return (
		<div className="card">
			<table className="data-table">
				<thead>
					<tr>
						<SortHeader label="Firm" sortKey="name" sort={sort} setSort={setSort} />
						<SortHeader label="Type" sortKey="category" sort={sort} setSort={setSort} />
						<SortHeader label="HQ" sortKey="hq_country" sort={sort} setSort={setSort} />
						<SortHeader label="AUM" sortKey="aum" sort={sort} setSort={setSort} defaultDir="desc" />
						<SortHeader label="Deals" sortKey="deals" sort={sort} setSort={setSort} align="right" defaultDir="desc" />
						<th>Stage focus</th>
						<th>Recent</th>
					</tr>
				</thead>
				<tbody>
					{investors.map((i) => {
						const cc = i.hq_country ? countryCode(i.hq_country) : '';
						const color = TYPE_COLORS[i.category ?? 'other'] ?? 'oklch(62% 0.04 240)';
						const initials = i.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
						const target = i.slug ?? i.id;
						return (
							<tr
								key={i.id}
								style={{ cursor: 'pointer' }}
								onClick={(e) => {
									if ((e.target as HTMLElement).closest('button, a')) return;
									if (e.metaKey || e.ctrlKey) { window.open(`/investors/${target}`, '_blank'); return; }
									onOpenDrawer(target);
								}}
							>
								<td>
									<div className="tbl-name-cell">
										<div className="co-logo" style={{ width: 28, height: 28, background: color, color: '#fff', fontSize: 10, flexShrink: 0 }}>
											{initials}
										</div>
										<div className="tbl-name-text">
											<div className="tbl-name-line" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span className="tbl-name">{i.name}</span>{i.is_verified && <VerifiedBadge size={12} />}</div>
											{(i.thesis ?? i.description) && <div className="tbl-sub">{i.thesis ?? i.description}</div>}
										</div>
									</div>
								</td>
								<td><Tag>{formatType(i.category ?? i.type)}</Tag></td>
								<td><span className="tbl-ellipsis">{cc && <Flag cc={cc} />} {i.hq_country ?? '—'}</span></td>
								<td className="num" style={{ fontWeight: 700 }}>{formatDollars(i.total_aum_usd) ?? '—'}</td>
								<td className="num" style={{ textAlign: 'right', fontWeight: 700 }}>{i.deals_count ?? '—'}</td>
								<td style={{ fontSize: 12 }}><span className="tbl-ellipsis">{i.primary_focus ?? '—'}</span></td>
								<td style={{ fontSize: 12, color: 'var(--fg-2)' }}><span className="tbl-ellipsis">{i.recent_investment ?? '—'}</span></td>
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);
}

function InvestorCard({ i, onOpenDrawer }: { i: InvestorRow; onOpenDrawer: (idOrSlug: string) => void }) {
	const color = TYPE_COLORS[i.category ?? 'other'] ?? 'oklch(62% 0.04 240)';
	const initials = i.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
	const cc = i.hq_country ? countryCode(i.hq_country) : '';
	const typeLabel = formatType(i.category ?? i.type);
	const target = i.slug ?? i.id;
	const open = () => onOpenDrawer(target);
	const handleClick = (e: React.MouseEvent) => {
		if ((e.target as HTMLElement).closest('button, a')) return;
		if (e.metaKey || e.ctrlKey || e.button === 1) {
			window.open(`/investors/${target}`, '_blank');
			return;
		}
		open();
	};
	return (
		// `<div role="button">` — CompareToggle button inside forbids nesting.
		<div
			role="button"
			tabIndex={0}
			className="card inv-card"
			style={{ display: 'block', width: '100%', textAlign: 'left', cursor: 'pointer' }}
			onClick={handleClick}
			onKeyDown={(e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					if ((e.target as HTMLElement).closest('button, a')) return;
					e.preventDefault();
					open();
				}
			}}
		>
			<div className="inv-bar" style={{ background: color }} />
			<div style={{ padding: 'var(--space-4)' }}>
				<div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
					<div className="co-logo" style={{ width: 44, height: 44, background: color, color: '#fff', fontSize: 14 }}>
						{initials}
					</div>
					<div style={{ flex: 1, minWidth: 0 }}>
						<div style={{ fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 6 }}>{i.name}{i.is_verified && <VerifiedBadge size={12} />}</div>
						<div
							style={{
								fontSize: 11,
								color: 'var(--fg-muted)',
								display: 'flex',
								alignItems: 'center',
								gap: 4,
								flexWrap: 'wrap',
							}}
						>
							{cc && <Flag cc={cc} />}
							{i.hq_country ?? '—'}{typeLabel !== '—' && <> · <Tag>{typeLabel}</Tag></>}
						</div>
					</div>
				</div>
				<p
					style={{
						fontSize: 13,
						color: 'var(--fg-2)',
						minHeight: 36,
						marginBottom: 12,
						lineHeight: 1.4,
						display: '-webkit-box',
						WebkitLineClamp: 2,
						WebkitBoxOrient: 'vertical',
						overflow: 'hidden',
					}}
				>
					{i.thesis ?? i.description ?? '—'}
				</p>
				<div
					style={{
						display: 'grid',
						gridTemplateColumns: '1fr 1fr 1fr',
						gap: 8,
						paddingTop: 12,
						borderTop: '1px solid var(--border)',
					}}
				>
					<div>
						<div className="co-stat-label">AUM</div>
						<div className="co-stat-val">{formatDollars(i.total_aum_usd) ?? '—'}</div>
					</div>
					<div>
						<div className="co-stat-label">Deals</div>
						<div className="co-stat-val">{i.deals_count ?? '—'}</div>
					</div>
					<div>
						<div className="co-stat-label">Stage</div>
						<div className="co-stat-val" style={{ fontSize: 12 }}>{i.primary_focus ?? '—'}</div>
					</div>
				</div>
				{i.recent_investment && (
					<div style={{ marginTop: 10, fontSize: 11, color: 'var(--fg-muted)' }}>
						Recent: <b style={{ color: 'var(--fg)' }}>{i.recent_investment}</b>
					</div>
				)}
				<div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
					<CompareToggle id={i.id} kind="investors" />
				</div>
			</div>
		</div>
	);
}

function formatType(t: string | null | undefined): string {
	if (!t) return '—';
	switch (t) {
		case 'venture_capital': return 'VC';
		case 'private_equity': return 'PE';
		case 'financial_services': return 'CVC';
		case 'family_investment_office': return 'Family Office';
		case 'sovereign_wealth_fund': return 'SWF';
		case 'angel': return 'Angel';
		default: return t.replace(/_/g, ' ');
	}
}

function formatDollars(value: number | string | null | undefined): string | null {
	if (value == null) return null;
	const n = typeof value === 'string' ? Number(value) : value;
	if (!Number.isFinite(n) || n <= 0) return null;
	if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
	if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(0)}M`;
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
