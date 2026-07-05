'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import useSWR from 'swr';
import { ChevronLeft, ChevronRight, ExternalLink, X, Globe, MapPin } from 'lucide-react';
import { qk } from '@/lib/query-keys';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { recordSearchSignal } from '@/lib/personalization';
import { Page, Flag, Tag, Empty, PageTitle } from '@/components/ui/atoms';
import { ExportButton } from '@/components/exports/export-button';
import {
	FilterRail, ActiveFiltersBar, ViewToggle,
	emptyFilterState, type Facet, type FilterState,
} from '@/components/ui/filter-rail';
import {
	locationFacets, setLocationUrlParams, readLocationParams, applyLocationQueryParams,
	type LocationFacets,
} from '@/lib/location-facets';

interface EcosystemEntity {
	id: string;
	name: string;
	slug?: string | null;
	description?: string | null;
	entity_type?: string | null;
	category?: string | null;
	website?: string | null;
	hq_city?: string | null;
	hq_country?: string | null;
	founded_year?: number | null;
	is_verified?: boolean | null;
}

interface EcosystemResponse {
	data: EcosystemEntity[];
	total: number;
	page: number;
	totalPages: number;
}

interface SportRef { id: string; name: string; slug: string }

const ENTITY_TYPE_OPTIONS = [
	{ value: 'organization', label: 'Organisation' },
	{ value: 'initiative', label: 'Initiative' },
	{ value: 'program', label: 'Program' },
	{ value: 'event', label: 'Event' },
];

const COMMON_COUNTRIES = [
	'United States', 'United Kingdom', 'Germany', 'France', 'Spain', 'Italy',
	'Netherlands', 'Sweden', 'Switzerland', 'Belgium', 'Portugal', 'India',
	'China', 'Japan', 'Singapore', 'Australia', 'Brazil', 'Canada',
];

const CURRENT_YEAR = new Date().getFullYear();

export default function EcosystemPage() {
	const router = useRouter();
	const pathname = usePathname();
	const params = useSearchParams();

	const [page, setPage] = useState(Number(params.get('page') ?? '1'));
	const [view, setView] = useState<'table' | 'grid'>((params.get('view') as 'table' | 'grid') ?? 'table');
	const [selectedId, setSelectedId] = useState<string>(params.get('item') ?? '');

	const { data: sportsResp } = useSWR<{ data: SportRef[] } | SportRef[]>(qk.reference.sports(), {
		dedupingInterval: 60 * 60_000,
	});
	const sportList = Array.isArray(sportsResp) ? sportsResp : (sportsResp?.data ?? []);

	const { data: locFacets } = useSWR<LocationFacets>(qk.reference.locationFacets(), {
		dedupingInterval: 60 * 60_000,
	});

	const facets = useMemo<Facet[]>(() => [
		{ key: 'entity_type', label: 'Type', kind: 'multi', options: () => ENTITY_TYPE_OPTIONS },
		{
			key: 'sport_slug', label: 'Sport', kind: 'multi', section: 'Focus',
			options: () => sportList.map((s) => ({ value: s.slug, label: s.name })),
			maxHeight: 240,
		},
		{
			key: 'country', label: 'Country', kind: 'multi', section: 'Location',
			options: () => COMMON_COUNTRIES.map((c) => ({ value: c, label: c })),
		},
		...locationFacets(locFacets),
		{
			key: 'founded', label: 'Year launched', kind: 'range', section: 'Other',
			min: 1950, max: CURRENT_YEAR, step: 1,
		},
	], [sportList, locFacets]);

	const [filterState, setFilterState] = useState<FilterState>(() => {
		const init = emptyFilterState(facets, { search: params.get('q') ?? '' });
		const et = params.get('entity_type'); if (et) init.entity_type = et.split(',').filter(Boolean);
		const sp = params.get('sport_slug'); if (sp) init.sport_slug = sp.split(',').filter(Boolean);
		const c = params.get('country'); if (c) init.country = c.split(',').filter(Boolean);
		Object.assign(init, readLocationParams(params as unknown as URLSearchParams));
		const fMin = params.get('founded_year_min');
		const fMax = params.get('founded_year_max');
		if (fMin && fMax) init.founded = [Number(fMin), Number(fMax)] as [number, number];
		return init;
	});

	useEffect(() => {
		const sp = new URLSearchParams();
		if (filterState.search) sp.set('q', filterState.search);
		const et = filterState.entity_type as string[] | undefined;
		if (et?.length) sp.set('entity_type', et.join(','));
		const spt = filterState.sport_slug as string[] | undefined;
		if (spt?.length) sp.set('sport_slug', spt.join(','));
		const ctry = filterState.country as string[] | undefined;
		if (ctry?.length) sp.set('country', ctry.join(','));
		setLocationUrlParams(sp, filterState);
		const f = filterState.founded as [number, number] | undefined;
		if (f && (f[0] !== 1950 || f[1] !== CURRENT_YEAR)) {
			sp.set('founded_year_min', String(f[0]));
			sp.set('founded_year_max', String(f[1]));
		}
		if (selectedId) sp.set('item', selectedId);
		if (page > 1) sp.set('page', String(page));
		if (view !== 'table') sp.set('view', view);
		const qs = sp.toString();
		router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [filterState, page, view, selectedId]);

	const debouncedSearch = useDebouncedValue(filterState.search ?? '', 300);
	useEffect(() => { recordSearchSignal(debouncedSearch); }, [debouncedSearch]);

	const queryParams: Record<string, unknown> = { page, limit: 24 };
	if (debouncedSearch) queryParams.q = debouncedSearch;
	const et = filterState.entity_type as string[] | undefined;
	if (et?.length) queryParams.entity_type = et.join(',');
	const spt = filterState.sport_slug as string[] | undefined;
	if (spt?.length) queryParams.sport_slug = spt.join(',');
	const ctry = filterState.country as string[] | undefined;
	if (ctry?.length) queryParams.country = ctry.join(',');
	applyLocationQueryParams(queryParams, filterState);
	const f = filterState.founded as [number, number] | undefined;
	if (f && (f[0] !== 1950 || f[1] !== CURRENT_YEAR)) {
		queryParams.founded_year_min = f[0];
		queryParams.founded_year_max = f[1];
	}

	const { data, isLoading } = useSWR<EcosystemResponse>(qk.ecosystem.list(queryParams), {
		dedupingInterval: 3 * 60_000,
	});

	const entities = data?.data ?? [];
	const total = data?.total ?? 0;
	const totalPages = data?.totalPages ?? 1;
	const selected = entities.find((e) => e.id === selectedId) ?? null;

	return (
		<Page>
			<PageTitle
				kicker={`Ecosystem · ${total.toLocaleString()} entities`}
				title="Ecosystem"
				sub="Leagues, federations, teams, brands, media and agencies across the sports-tech landscape."
				action={
					// Export targets the programs dataset specifically; only offer it
					// when the user has narrowed the page to programs.
					(filterState.entity_type as string[] | undefined)?.join(',') === 'program'
						? <ExportButton entity="programs" search={filterState.search} filters={queryParams} />
						: undefined
				}
			/>

			<div className="flt-layout">
				<FilterRail
					facets={facets}
					state={filterState}
					setState={(s) => { setFilterState(s); setPage(1); }}
					defaultOpen={{ entity_type: true }}
				/>

				<div className="flt-main">
					<ActiveFiltersBar
						facets={facets}
						state={filterState}
						setState={setFilterState}
						placeholder="Search ecosystem, locations…"
						total={total}
						shown={entities.length}
						viewToggle={<ViewToggle view={view} setView={setView} />}
					/>

					<div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
						<div style={{ flex: 1, minWidth: 0 }}>
							{isLoading && entities.length === 0 ? (
								<Empty msg="Loading…" />
							) : entities.length === 0 ? (
								<div className="card flt-empty-state">
									<h3>No entities match</h3>
									<p>Try clearing some filters.</p>
								</div>
							) : view === 'grid' ? (
								<div className="co-grid">
									{entities.map((e) => (
										<EcoCard key={e.id} e={e} onClick={() => setSelectedId(e.id === selectedId ? '' : e.id)} />
									))}
								</div>
							) : (
								<div className="card">
									<table className="data-table">
										<thead>
											<tr>
												<th>Entity</th>
												<th>Type</th>
												<th>Location</th>
											</tr>
										</thead>
										<tbody>
											{entities.map((e) => {
												const cc = e.hq_country ? countryCode(e.hq_country) : '';
												return (
													<tr
														key={e.id}
														style={{ cursor: 'pointer' }}
														onClick={() => setSelectedId(e.id === selectedId ? '' : e.id)}
													>
														<td>
															<div className="tbl-name-cell">
																<div className="tbl-name-text">
																	<div className="tbl-name-line">
																		<span className="tbl-name">{e.name}</span>
																	</div>
																	{e.description && <div className="tbl-sub">{e.description}</div>}
																</div>
															</div>
														</td>
														<td>{e.entity_type ? <Tag>{titleCase(e.entity_type)}</Tag> : '—'}</td>
														<td>
															<span className="tbl-ellipsis" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
																{cc && <Flag cc={cc} />}
																{[e.hq_city, e.hq_country].filter(Boolean).join(', ') || '—'}
															</span>
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

						{selected && <EntityDetailPanel entity={selected} onClose={() => setSelectedId('')} />}
					</div>
				</div>
			</div>
		</Page>
	);
}

function EcoCard({ e, onClick }: { e: EcosystemEntity; onClick: () => void }) {
	const cc = e.hq_country ? countryCode(e.hq_country) : '';
	return (
		<div role="button" tabIndex={0} className="card co-card" style={{ cursor: 'pointer' }} onClick={onClick}
			onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); onClick(); } }}>
			<div className="co-card-head">
				<div style={{ width: 44, height: 44, display: 'grid', placeItems: 'center', background: 'var(--bg-3)' }}>
					<Globe size={18} style={{ color: 'var(--fg-muted)' }} />
				</div>
				<div style={{ flex: 1, minWidth: 0 }}>
					<div style={{ fontWeight: 700, fontSize: 15 }}>{e.name}</div>
					<div style={{ fontSize: 11, color: 'var(--fg-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
						{cc && <Flag cc={cc} />}
						{[e.hq_city, e.hq_country].filter(Boolean).join(', ') || '—'}
					</div>
				</div>
			</div>
			{e.description && <p className="co-sub">{e.description}</p>}
			{e.entity_type && <div style={{ marginTop: 10 }}><Tag>{titleCase(e.entity_type)}</Tag></div>}
		</div>
	);
}

function EntityDetailPanel({ entity, onClose }: { entity: EcosystemEntity; onClose: () => void }) {
	const cc = entity.hq_country ? countryCode(entity.hq_country) : '';
	return (
		<aside className="card" style={{ width: 320, flexShrink: 0, position: 'sticky', top: 12, padding: 0 }}>
			<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderBottom: '1px solid var(--border)' }}>
				<span style={{ fontWeight: 700, fontSize: 14 }}>{entity.name}</span>
				<button className="btn ghost" style={{ padding: 4 }} onClick={onClose} aria-label="Close">
					<X size={14} />
				</button>
			</div>
			<div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
				{entity.entity_type && <Tag>{titleCase(entity.entity_type)}</Tag>}
				{entity.description && <p style={{ fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.5 }}>{entity.description}</p>}
				<div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
					<MapPin size={14} style={{ color: 'var(--fg-muted)' }} />
					{cc && <Flag cc={cc} />}
					<span>{[entity.hq_city, entity.hq_country].filter(Boolean).join(', ') || '—'}</span>
				</div>
				{entity.founded_year && (
					<div style={{ fontSize: 13, color: 'var(--fg-2)' }}>Launched {entity.founded_year}</div>
				)}
				{entity.website && (
					<a href={entity.website} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
						<button className="btn ghost" style={{ width: '100%', justifyContent: 'center' }}>
							<ExternalLink size={13} /> Visit website
						</button>
					</a>
				)}
			</div>
		</aside>
	);
}

function titleCase(s: string): string {
	return s.charAt(0).toUpperCase() + s.slice(1);
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
