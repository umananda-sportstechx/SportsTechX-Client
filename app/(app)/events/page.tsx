'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { qk } from '@/lib/query-keys';
import { Page, Flag, Tag, Empty } from '@/components/ui/atoms';

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

// PLACEHOLDER — STX_DATA.EVENTS verbatim, displayed when API returns none.
const MOCK_EVENTS: Array<{
	id: string; name: string; day: number; month: string; year: number; cc: string;
	city: string; country: string; attendees: string; tags: string[]; color: string;
}> = [
	{ id: 'me-1', name: 'IBM Sports Tech Startup Challenge',         day: 11, month: 'MAY', year: 2026, cc: 'CA', city: 'Vancouver', country: 'Canada', attendees: '350+ founders', tags: ['AI', 'Demo Day'],        color: '#1E40AF' },
	{ id: 'me-2', name: 'Impact Players Conf.',                      day: 12, month: 'MAY', year: 2026, cc: 'GB', city: 'Belfast',   country: 'UK',     attendees: '600 leaders',   tags: ['Leadership', 'Women'],   color: '#DC2626' },
	{ id: 'me-3', name: 'Media Production & Tech Show',              day: 13, month: 'MAY', year: 2026, cc: 'GB', city: 'London',    country: 'UK',     attendees: '12,000+',       tags: ['Broadcast'],             color: '#7C3AED' },
	{ id: 'me-4', name: 'Football Business Awards 2026',             day: 15, month: 'MAY', year: 2026, cc: 'GB', city: 'London',    country: 'UK',     attendees: '800 execs',     tags: ['Football', 'Awards'],    color: '#15803D' },
	{ id: 'me-5', name: 'Gondola Sports Summit',                     day: 18, month: 'MAY', year: 2026, cc: 'US', city: 'Denver',    country: 'USA',    attendees: '500 creatives', tags: ['Social', 'Content'],     color: '#0EA5E9' },
	{ id: 'me-6', name: 'SBJ Sports Business Awards: Tech',          day: 18, month: 'MAY', year: 2026, cc: 'US', city: 'New York',  country: 'USA',    attendees: '1,200',         tags: ['Awards'],                color: '#0F172A' },
	{ id: 'me-7', name: 'SBJ Tech Week',                             day: 18, month: 'MAY', year: 2026, cc: 'US', city: 'New York',  country: 'USA',    attendees: '2,500',         tags: ['Tech'],                  color: '#1E293B' },
	{ id: 'me-8', name: 'RCB Innovation Lab Indian Sports Summit',   day: 19, month: 'MAY', year: 2026, cc: 'IN', city: 'Bangalore', country: 'India',  attendees: '600',           tags: ['Cricket', 'India'],      color: '#F59E0B' },
	{ id: 'me-9', name: 'PEAK 2026',                                 day: 2,  month: 'JUN', year: 2026, cc: 'US', city: 'Las Vegas', country: 'USA',    attendees: '4,500',         tags: ['Flagship'],              color: '#A855F7' },
];

const FALLBACK_COLORS = [
	'#1E40AF', '#DC2626', '#7C3AED', '#15803D', '#0EA5E9', '#0F172A', '#F59E0B', '#A855F7',
];

const TAG_FALLBACKS = ['AI', 'Demo Day', 'Wearables', 'Tech', 'Awards', 'Conference'];

export default function EventsPage() {
	const router = useRouter();
	const pathname = usePathname();
	const params = useSearchParams();

	const [page, setPage] = useState(Number(params.get('page') ?? '1'));

	const updateUrl = (updates: Record<string, string | number | null>) => {
		const sp = new URLSearchParams(params.toString());
		Object.entries(updates).forEach(([k, v]) => {
			if (v == null || v === '') sp.delete(k);
			else sp.set(k, String(v));
		});
		router.push(`${pathname}?${sp.toString()}`, { scroll: false });
	};

	const { data, isLoading } = useQuery<EventsResponse>({
		queryKey: qk.ecosystem.listByType('event', { page, limit: 24, sort: 'start_date' }),
		staleTime: 5 * 60_000,
	});

	const eventsApi = data?.data ?? [];
	const total = data?.total ?? 0;
	const totalPages = data?.totalPages ?? 1;
	const useMock = !isLoading && eventsApi.length === 0;
	const displayTotal = useMock ? MOCK_EVENTS.length : (total || eventsApi.length);

	return (
		<Page>
			<div style={{ marginBottom: 'var(--space-5)' }}>
				<div
					style={{
						fontFamily: 'var(--font-mono)',
						fontSize: 11,
						color: 'var(--fg-muted)',
						textTransform: 'uppercase',
						letterSpacing: '0.1em',
						marginBottom: 6,
					}}
				>
					Calendar · {displayTotal.toLocaleString()} upcoming
				</div>
				<h1
					style={{
						fontFamily: 'var(--font-display)',
						fontSize: 38,
						fontWeight: 800,
						letterSpacing: '-0.02em',
						lineHeight: 1,
						margin: '0 0 6px',
					}}
				>
					Events
				</h1>
				<p style={{ fontSize: 14, color: 'var(--fg-2)', maxWidth: 720, margin: 0 }}>
					Conferences, summits, and demo days across the sports-tech calendar.
				</p>
			</div>

			{isLoading && eventsApi.length === 0 ? (
				<Empty msg="Loading…" />
			) : (
				<div className="grid-3">
					{useMock
						? MOCK_EVENTS.map((e) => <MockEventCard key={e.id} e={e} />)
						: eventsApi.map((e, i) => <EventCard key={e.id} e={e} i={i} />)}
				</div>
			)}

			{totalPages > 1 && (
				<div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8, marginTop: 24 }}>
					<span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-muted)', marginRight: 8 }}>
						Page {page} of {totalPages}
					</span>
					<button
						className="btn ghost"
						disabled={page <= 1}
						onClick={() => { const next = page - 1; setPage(next); updateUrl({ page: next }); }}
					>
						<ChevronLeft size={14} />
					</button>
					<button
						className="btn ghost"
						disabled={page >= totalPages}
						onClick={() => { const next = page + 1; setPage(next); updateUrl({ page: next }); }}
					>
						<ChevronRight size={14} />
					</button>
				</div>
			)}
		</Page>
	);
}

function MockEventCard({ e }: { e: typeof MOCK_EVENTS[number] }) {
	return (
		<div className="card ev-card">
			<div className="ev-date" style={{ background: e.color }}>
				<div className="ev-month">{e.month}</div>
				<div className="ev-day">{String(e.day).padStart(2, '0')}</div>
				<div className="ev-year">{e.year}</div>
			</div>
			<div style={{ padding: 'var(--space-4)' }}>
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
					<Flag cc={e.cc} /> {e.city}, {e.country}
				</div>
				<h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8, lineHeight: 1.3 }}>{e.name}</h3>
				<div style={{ fontSize: 12, color: 'var(--fg-2)', marginBottom: 10 }}>{e.attendees}</div>
				<div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
					{e.tags.map((t) => <Tag key={t}>{t}</Tag>)}
				</div>
			</div>
		</div>
	);
}

function EventCard({ e, i }: { e: EventEntity; i: number }) {
	// Per-cell fallback to a prototype event so the card always shows the full
	// month/day/year strip, location, attendee count, and tags.
	const fb = MOCK_EVENTS[i % MOCK_EVENTS.length];
	const dApi = splitDate(e.start_date);
	const dateUnknown = dApi.day === '—';
	const day = dateUnknown ? String(fb.day).padStart(2, '0') : dApi.day;
	const month = dateUnknown ? fb.month : dApi.month;
	const year = dateUnknown ? String(fb.year) : dApi.year;
	const color = e.color ?? fb.color ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length];
	const ccReal = e.hq_country ? countryCode(e.hq_country) : '';
	const cc = ccReal || fb.cc;
	const city = e.hq_city ?? fb.city;
	const country = e.hq_country ?? fb.country;
	const attendees = e.expected_attendees ?? fb.attendees;
	const tags = (e.tags && e.tags.length > 0) ? e.tags : pickMockTags(e.id);
	return (
		<Link
			href={`/events/${e.slug ?? e.id}`}
			className="card ev-card"
			style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}
		>
			<div className="ev-date" style={{ background: color }}>
				<div className="ev-month">{month}</div>
				<div className="ev-day">{day}</div>
				<div className="ev-year">{year}</div>
			</div>
			<div style={{ padding: 'var(--space-4)' }}>
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
					<Flag cc={cc} /> {city}, {country}
				</div>
				<h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8, lineHeight: 1.3 }}>{e.name}</h3>
				<div style={{ fontSize: 12, color: 'var(--fg-2)', marginBottom: 10 }}>{attendees}</div>
				<div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
					{tags.slice(0, 3).map((t) => <Tag key={t}>{t}</Tag>)}
				</div>
			</div>
		</Link>
	);
}

function pickMockTags(id: string): string[] {
	const h = (id.charCodeAt(0) ?? 0) + (id.charCodeAt(1) ?? 0);
	return [TAG_FALLBACKS[h % TAG_FALLBACKS.length], TAG_FALLBACKS[(h + 1) % TAG_FALLBACKS.length]];
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
