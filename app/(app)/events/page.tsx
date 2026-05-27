'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { qk } from '@/lib/query-keys';
import { Page, Flag, Tag, Empty, PageTitle } from '@/components/ui/atoms';
import {
	FilterRail, ActiveFiltersBar,
	emptyFilterState, type Facet, type FilterState,
} from '@/components/ui/filter-rail';

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

export default function EventsPage() {
	const router = useRouter();
	const pathname = usePathname();
	const params = useSearchParams();

	const [page, setPage] = useState(Number(params.get('page') ?? '1'));

	const facets = useMemo<Facet[]>(() => [], []);

	const [filterState, setFilterState] = useState<FilterState>(() =>
		emptyFilterState(facets, { search: params.get('q') ?? '' }),
	);

	useEffect(() => {
		const sp = new URLSearchParams();
		if (filterState.search) sp.set('q', filterState.search);
		if (page > 1) sp.set('page', String(page));
		const qs = sp.toString();
		router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [filterState, page]);

	const queryParams: Record<string, unknown> = { page, limit: 24, sort: 'start_date' };
	if (filterState.search) queryParams.search = filterState.search;

	const { data, isLoading } = useSWR<EventsResponse>(
		qk.ecosystem.listByType('event', queryParams),
		{ dedupingInterval: 5 * 60_000 },
	);

	const events = data?.data ?? [];
	const total = data?.total ?? 0;
	const totalPages = data?.totalPages ?? 1;

	return (
		<Page>
			<PageTitle
				kicker={`Calendar · ${total.toLocaleString()} upcoming`}
				title="Events"
				sub="Conferences, summits, and demo days across the sports-tech calendar."
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
					/>

					{isLoading && events.length === 0 ? (
						<Empty msg="Loading…" />
					) : events.length === 0 ? (
						<div className="card flt-empty-state">
							<h3>No events match</h3>
							<p>Try clearing some filters.</p>
						</div>
					) : (
						<div className="grid-3">
							{events.map((e, i) => <EventCard key={e.id} e={e} i={i} />)}
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
