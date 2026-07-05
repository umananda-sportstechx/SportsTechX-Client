'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { qk } from '@/lib/query-keys';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
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
import { SortHeader, applySort, type SortState } from '@/components/ui/sort-header';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const COMMON_COUNTRIES = [
	'United States', 'United Kingdom', 'Germany', 'France', 'Spain', 'Italy',
	'Netherlands', 'Sweden', 'Switzerland', 'Belgium', 'Portugal', 'India',
	'China', 'Japan', 'Singapore', 'Australia', 'Brazil', 'Canada',
];

interface EventEntity {
	id: string;
	name: string;
	slug?: string | null;
	description?: string | null;
	start_date?: string | null;
	end_date?: string | null;
	hq_city?: string | null;
	hq_country?: string | null;
	expected_attendees?: string | null;
	mode?: string | null;
	tags?: string[] | null;
	color?: string | null;
}

interface EventsResponse {
	data: EventEntity[];
	total: number;
	page: number;
	totalPages: number;
}

const FALLBACK_COLORS = [
	'#1E40AF', '#DC2626', '#7C3AED', '#15803D', '#0EA5E9', '#0F172A', '#F59E0B', '#A855F7',
];

const MODE_OPTIONS = [
	{ value: 'in_person', label: 'In-person' },
	{ value: 'virtual', label: 'Online' },
	{ value: 'hybrid', label: 'Hybrid' },
];

interface SportRef { id: string; name: string; slug: string }

export default function EventsPage() {
	const router = useRouter();
	const pathname = usePathname();
	const params = useSearchParams();

	const [page, setPage] = useState(Number(params.get('page') ?? '1'));
	const [view, setView] = useState<'table' | 'grid'>((params.get('view') as 'table' | 'grid') ?? 'table');
	const [sort, setSort] = useState<SortState | null>(null);

	const { data: sportsResp } = useSWR<{ data: SportRef[] } | SportRef[]>(qk.reference.sports(), {
		dedupingInterval: 60 * 60_000,
	});
	const sportList = Array.isArray(sportsResp) ? sportsResp : (sportsResp?.data ?? []);

	const { data: locFacets } = useSWR<LocationFacets>(qk.reference.locationFacets(), {
		dedupingInterval: 60 * 60_000,
	});

	const facets = useMemo<Facet[]>(() => [
		{ key: 'upcoming_only', label: 'Upcoming only', kind: 'bool' },
		{
			key: 'start_month', label: 'Month', kind: 'multi',
			options: () => MONTHS.map((m, i) => ({ value: String(i + 1), label: m })),
		},
		{
			key: 'mode', label: 'Mode', kind: 'multi',
			options: () => MODE_OPTIONS,
		},
		{
			key: 'country', label: 'Country', kind: 'multi', section: 'Location',
			options: () => COMMON_COUNTRIES.map((c) => ({ value: c, label: c })),
		},
		...locationFacets(locFacets),
		{
			key: 'sport_slug', label: 'Sport', kind: 'multi', section: 'Focus',
			options: () => sportList.map((s) => ({ value: s.slug, label: s.name })),
			maxHeight: 240,
		},
	], [sportList, locFacets]);

	const [filterState, setFilterState] = useState<FilterState>(() => {
		const init = emptyFilterState(facets, { search: params.get('q') ?? '' });
		if (params.get('upcoming_only') === 'true') init.upcoming_only = true;
		const m = params.get('start_month'); if (m) init.start_month = m.split(',').filter(Boolean);
		const c = params.get('country'); if (c) init.country = c.split(',').filter(Boolean);
		const md = params.get('mode'); if (md) init.mode = md.split(',').filter(Boolean);
		const sp = params.get('sport_slug'); if (sp) init.sport_slug = sp.split(',').filter(Boolean);
		Object.assign(init, readLocationParams(params as unknown as URLSearchParams));
		return init;
	});

	useEffect(() => {
		const sp = new URLSearchParams();
		if (filterState.search) sp.set('q', filterState.search);
		if (filterState.upcoming_only === true) sp.set('upcoming_only', 'true');
		const mon = filterState.start_month as string[] | undefined;
		if (mon?.length) sp.set('start_month', mon.join(','));
		const ctry = filterState.country as string[] | undefined;
		if (ctry?.length) sp.set('country', ctry.join(','));
		const md = filterState.mode as string[] | undefined;
		if (md?.length) sp.set('mode', md.join(','));
		const spt = filterState.sport_slug as string[] | undefined;
		if (spt?.length) sp.set('sport_slug', spt.join(','));
		setLocationUrlParams(sp, filterState);
		if (page > 1) sp.set('page', String(page));
		if (view !== 'grid') sp.set('view', view);
		const qs = sp.toString();
		router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [filterState, page, view]);

	const debouncedSearch = useDebouncedValue(filterState.search ?? '', 300);
	const queryParams: Record<string, unknown> = { page, limit: 24, sort: 'start_date' };
	if (debouncedSearch) queryParams.search = debouncedSearch;
	if (filterState.upcoming_only === true) queryParams.upcoming_only = true;
	const monSel = filterState.start_month as string[] | undefined;
	if (monSel?.length) queryParams.start_month = monSel.join(',');
	const ctrySel = filterState.country as string[] | undefined;
	if (ctrySel?.length) queryParams.country = ctrySel.join(',');
	const modeSel = filterState.mode as string[] | undefined;
	if (modeSel?.length) queryParams.mode = modeSel.join(',');
	const sptSel = filterState.sport_slug as string[] | undefined;
	if (sptSel?.length) queryParams.sport_slug = sptSel.join(',');
	applyLocationQueryParams(queryParams, filterState);

	const { data, isLoading } = useSWR<EventsResponse>(
		qk.ecosystem.listByType('event', queryParams),
		{ dedupingInterval: 5 * 60_000 },
	);

	const events = data?.data ?? [];
	const total = data?.total ?? 0;
	const totalPages = data?.totalPages ?? 1;

	// Client-side sort of the current page's rows (the list endpoint does not
	// support sorting by date/location/attendees). Mirrors the design prototype's
	// `applySort` over in-hand rows.
	const sortedEvents = useMemo(() => applySort(events, sort, {
		date: (e) => (e.start_date ? new Date(e.start_date).getTime() : null),
		name: (e) => e.name.toLowerCase(),
		location: (e) => [e.hq_country, e.hq_city].filter(Boolean).join(' ').toLowerCase() || null,
		attendees: (e) => {
			const n = parseInt(String(e.expected_attendees ?? '').replace(/[^\d]/g, ''), 10);
			return Number.isNaN(n) ? null : n;
		},
	}), [events, sort]);

	return (
		<Page>
			<PageTitle
				kicker={`Calendar · ${total.toLocaleString()} upcoming`}
				title="Events"
				sub="Conferences, summits, and demo days across the sports-tech calendar."
				action={<ExportButton entity="events" search={filterState.search} filters={queryParams} />}
			/>

			<div className="flt-layout">
				<FilterRail
					facets={facets}
					state={filterState}
					setState={(s) => { setFilterState(s); setPage(1); }}
				/>

				<div className="flt-main">
					<ActiveFiltersBar
						facets={facets}
						state={filterState}
						setState={setFilterState}
						placeholder="Search events, cities…"
						total={total}
						shown={events.length}
						viewToggle={<ViewToggle view={view} setView={setView} />}
					/>

					{isLoading && events.length === 0 ? (
						<Empty msg="Loading…" />
					) : events.length === 0 ? (
						<div className="card flt-empty-state">
							<h3>No events match</h3>
							<p>Try clearing some filters.</p>
						</div>
					) : view === 'grid' ? (
						<div className="grid-3">
							{sortedEvents.map((e, i) => <EventCard key={e.id} e={e} i={i} />)}
						</div>
					) : (
						<EventsTable events={sortedEvents} sort={sort} setSort={setSort} />
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

function EventsTable({
	events, sort, setSort,
}: {
	events: EventEntity[];
	sort: SortState | null;
	setSort: (s: SortState | null) => void;
}) {
	return (
		<div className="card">
			<table className="data-table">
				<thead>
					<tr>
						<SortHeader label="Name" sortKey="name" sort={sort} setSort={setSort} />
						<SortHeader label="Location" sortKey="location" sort={sort} setSort={setSort} />
						<SortHeader label="Date" sortKey="date" sort={sort} setSort={setSort} width={140} />
						<th>Mode</th>
						<th style={{ width: 110 }}></th>
					</tr>
				</thead>
				<tbody>
					{events.map((e) => {
						const d = splitDate(e.start_date);
						const cc = e.hq_country ? countryCode(e.hq_country) : '';
						return (
							<tr key={e.id} style={{ cursor: 'pointer' }}>
								<td>
									<Link href={`/events/${e.slug ?? e.id}`} className="tbl-name co-row-name">{e.name}</Link>
								</td>
								<td><span className="tbl-ellipsis">{cc && <Flag cc={cc} />} {[e.hq_city, e.hq_country].filter(Boolean).join(', ') || '—'}</span></td>
								<td className="num" style={{ whiteSpace: 'nowrap' }}>{d.month} {d.day} {d.year}</td>
								<td>{formatMode(e.mode)}</td>
								<td>
									<Link href={`/events/${e.slug ?? e.id}`} className="btn ghost">
										Details <ArrowRight size={11} />
									</Link>
								</td>
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);
}

function EventCard({ e, i }: { e: EventEntity; i: number }) {
	const d = splitDate(e.start_date);
	const color = e.color ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length];
	const cc = e.hq_country ? countryCode(e.hq_country) : '';
	const tags = e.tags ?? [];
	return (
		<Link
			href={`/events/${e.slug ?? e.id}`}
			className="card ev-card"
			style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}
		>
			<div className="ev-date" style={{ background: color }}>
				<div className="ev-month">{d.month}</div>
				<div className="ev-day">{d.day}</div>
				<div className="ev-year">{d.year}</div>
			</div>
			<div style={{ padding: 'var(--space-4)' }}>
				{(cc || e.hq_city || e.hq_country) && (
					<div
						style={{
							fontSize: 11,
							color: 'var(--fg-muted)',
							textTransform: 'uppercase',
							letterSpacing: '0.08em',
							marginBottom: 4,
							display: 'flex',
							alignItems: 'center',
							gap: 6,
						}}
					>
						{cc && <Flag cc={cc} />} {[e.hq_city, e.hq_country].filter(Boolean).join(', ') || '—'}
					</div>
				)}
				<h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8, lineHeight: 1.3 }}>{e.name}</h3>
				{e.expected_attendees && (
					<div style={{ fontSize: 12, color: 'var(--fg-2)', marginBottom: 10 }}>{e.expected_attendees}</div>
				)}
				{tags.length > 0 && (
					<div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
						{tags.slice(0, 3).map((t) => <Tag key={t}>{t}</Tag>)}
					</div>
				)}
			</div>
		</Link>
	);
}

function formatMode(mode: string | null | undefined): string {
	switch ((mode ?? '').toLowerCase()) {
		case 'in_person': case 'in-person': return 'In person';
		case 'virtual': return 'Virtual';
		case 'hybrid': return 'Hybrid';
		default: return '—';
	}
}

function splitDate(iso: string | null | undefined): { day: string; month: string; year: string } {
	if (!iso) return { day: '—', month: '—', year: '—' };
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return { day: '—', month: '—', year: '—' };
	return {
		month: d.toLocaleString('en-US', { month: 'short' }).toUpperCase(),
		day: String(d.getUTCDate()).padStart(2, '0'),
		year: String(d.getUTCFullYear()),
	};
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
