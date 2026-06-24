'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { qk } from '@/lib/query-keys';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { Page, Flag, Empty, PageTitle } from '@/components/ui/atoms';
import {
	FilterRail, ActiveFiltersBar,
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
	status?: string | null;
	cohort_label?: string | null;
	cohort_number?: number | null;
	investment_amount?: number | string | null;
	investment_label?: string | null;
	duration_label?: string | null;
	hq_city?: string | null;
	hq_country?: string | null;
	application_deadline?: string | null;
	color?: string | null;
}

interface EcosystemResponse {
	data: EcosystemEntity[];
	total: number;
	page: number;
	totalPages: number;
}

const STATUS_OPTIONS = [
	{ value: 'open', label: 'Open' },
	{ value: 'closing_soon', label: 'Closing soon' },
	{ value: 'closed', label: 'Closed' },
];

const COMMON_COUNTRIES = [
	'United States', 'United Kingdom', 'Germany', 'France', 'Spain', 'Italy',
	'Netherlands', 'Sweden', 'Switzerland', 'Belgium', 'Portugal', 'India',
	'China', 'Japan', 'Singapore', 'Australia', 'Brazil', 'Canada',
];

interface SportRef { id: string; name: string; slug: string }

const FALLBACK_COLORS = [
	'#A855F7', '#0F172A', '#22D3EE', '#94A3B8', '#0EA5E9', '#A78BFA',
];

export default function ProgramsPage() {
	const router = useRouter();
	const pathname = usePathname();
	const params = useSearchParams();

	const [page, setPage] = useState(Number(params.get('page') ?? '1'));

	const { data: sportsResp } = useSWR<{ data: SportRef[] } | SportRef[]>(qk.reference.sports(), {
		dedupingInterval: 60 * 60_000,
	});
	const sportList = Array.isArray(sportsResp) ? sportsResp : (sportsResp?.data ?? []);

	const { data: locFacets } = useSWR<LocationFacets>(qk.reference.locationFacets(), {
		dedupingInterval: 60 * 60_000,
	});

	const facets = useMemo<Facet[]>(() => [
		{ key: 'entries_open', label: 'Entries open', kind: 'bool' },
		{
			key: 'status',
			label: 'Application status',
			kind: 'multi',
			options: () => STATUS_OPTIONS,
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
		if (params.get('entries_open') === 'true') init.entries_open = true;
		const s = params.get('status');
		if (s) init.status = s.split(',').filter(Boolean);
		const c = params.get('country'); if (c) init.country = c.split(',').filter(Boolean);
		const sp = params.get('sport_slug'); if (sp) init.sport_slug = sp.split(',').filter(Boolean);
		Object.assign(init, readLocationParams(params as unknown as URLSearchParams));
		return init;
	});

	useEffect(() => {
		const sp = new URLSearchParams();
		if (filterState.search) sp.set('q', filterState.search);
		if (filterState.entries_open === true) sp.set('entries_open', 'true');
		const st = filterState.status as string[] | undefined;
		if (st?.length) sp.set('status', st.join(','));
		const ctry = filterState.country as string[] | undefined;
		if (ctry?.length) sp.set('country', ctry.join(','));
		const spt = filterState.sport_slug as string[] | undefined;
		if (spt?.length) sp.set('sport_slug', spt.join(','));
		setLocationUrlParams(sp, filterState);
		if (page > 1) sp.set('page', String(page));
		const qs = sp.toString();
		router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [filterState, page]);

	const debouncedSearch = useDebouncedValue(filterState.search ?? '', 300);
	const queryParams: Record<string, unknown> = { page, limit: 24 };
	if (debouncedSearch) queryParams.search = debouncedSearch;
	if (filterState.entries_open === true) queryParams.entries_open = true;
	const st = filterState.status as string[] | undefined;
	if (st?.length === 1) queryParams.status = st[0];
	const ctrySel = filterState.country as string[] | undefined;
	if (ctrySel?.length) queryParams.country = ctrySel.join(',');
	const sptSel = filterState.sport_slug as string[] | undefined;
	if (sptSel?.length) queryParams.sport_slug = sptSel.join(',');
	applyLocationQueryParams(queryParams, filterState);

	const { data, isLoading } = useSWR<EcosystemResponse>(
		qk.ecosystem.listByType('program', queryParams),
		{ dedupingInterval: 5 * 60_000 },
	);

	const programs = data?.data ?? [];
	const total = data?.total ?? 0;
	const totalPages = data?.totalPages ?? 1;

	return (
		<Page>
			<PageTitle
				kicker="Ecosystem · accelerators"
				title="Programs"
				sub="Sports-tech accelerators, incubators and innovation programs — application status, terms, and partners."
			/>

			<div className="flt-layout">
				<FilterRail
					facets={facets}
					state={filterState}
					setState={(s) => { setFilterState(s); setPage(1); }}
					defaultOpen={{ status: true }}
				/>

				<div className="flt-main">
					<ActiveFiltersBar
						facets={facets}
						state={filterState}
						setState={setFilterState}
						placeholder="Search programs, locations…"
						total={total}
						shown={programs.length}
					/>

					{isLoading && programs.length === 0 ? (
						<Empty msg="Loading…" />
					) : programs.length === 0 ? (
						<div className="card flt-empty-state">
							<h3>No programs match</h3>
							<p>Try clearing some filters.</p>
						</div>
					) : (
						<div className="prog-grid">
							{programs.map((p, i) => <ProgramCard key={p.id} p={p} i={i} />)}
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

function ProgramCard({ p, i }: { p: EcosystemEntity; i: number }) {
	const color = p.color ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length];
	const status = p.status ?? null;
	const statusClass = status === 'open' ? 'on' : status === 'closing_soon' ? 'warn' : 'off';
	const cc = p.hq_country ? countryCode(p.hq_country) : '';
	const location = [p.hq_city, p.hq_country].filter(Boolean).join(', ') || null;
	return (
		<div className="card prog-card">
			<div className="prog-cover" style={{ background: `linear-gradient(135deg, ${color} 0%, ${color}aa 100%)` }}>
				{p.cohort_label && <div className="prog-cohort">{p.cohort_label}</div>}
				<div className="prog-name">{p.name}</div>
				{status && (
					<div className={`prog-status ${statusClass}`}>
						<span className="live-dot" /> {formatStatus(status)}
					</div>
				)}
			</div>
			<div style={{ padding: 'var(--space-4)' }}>
				{p.description && (
					<p
						style={{
							fontSize: 13,
							color: 'var(--fg-2)',
							lineHeight: 1.5,
							minHeight: 60,
							marginBottom: 12,
							display: '-webkit-box',
							WebkitLineClamp: 3,
							WebkitBoxOrient: 'vertical',
							overflow: 'hidden',
						}}
					>
						{p.description}
					</p>
				)}
				<div
					style={{
						display: 'grid',
						gridTemplateColumns: '1fr 1fr',
						gap: 12,
						paddingTop: 12,
						borderTop: '1px solid var(--border)',
					}}
				>
					<div>
						<div className="co-stat-label">Investment</div>
						<div className="co-stat-val">{p.investment_label ?? formatDollars(p.investment_amount) ?? '—'}</div>
					</div>
					<div>
						<div className="co-stat-label">Duration</div>
						<div className="co-stat-val">{p.duration_label ?? '—'}</div>
					</div>
					<div>
						<div className="co-stat-label">Location</div>
						<div className="co-stat-val" style={{ fontSize: 12 }}>
							{cc && <Flag cc={cc} />} {location ?? '—'}
						</div>
					</div>
					<div>
						<div className="co-stat-label">Deadline</div>
						<div className="co-stat-val" style={{ fontSize: 12 }}>
							{p.application_deadline ? formatShortDate(p.application_deadline) : '—'}
						</div>
					</div>
				</div>
				<Link href={`/programs/${p.slug ?? p.id}`} style={{ textDecoration: 'none' }}>
					<button
						className={`btn ${status === 'open' ? '' : 'ghost'}`}
						style={{ marginTop: 14, width: '100%', justifyContent: 'center' }}
					>
						{status === 'open' ? 'Apply' : 'View'} <ArrowRight size={12} />
					</button>
				</Link>
			</div>
		</div>
	);
}

function formatStatus(s: string | null | undefined): string {
	switch (s) {
		case 'open': return 'Open';
		case 'closing_soon': return 'Closing soon';
		case 'closed': return 'Closed';
		default: return s ?? '—';
	}
}

function formatDollars(value: number | string | null | undefined): string | null {
	if (value == null) return null;
	const n = typeof value === 'string' ? Number(value) : value;
	if (!Number.isFinite(n) || n <= 0) return null;
	if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(0)}M`;
	if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
	return `$${n.toFixed(0)}`;
}

function formatShortDate(iso: string | null | undefined): string {
	if (!iso) return '—';
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return '—';
	return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
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
