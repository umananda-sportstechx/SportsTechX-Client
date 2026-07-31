'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { Search } from 'lucide-react';
import { qk } from '@/lib/query-keys';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { Screen, H1, Sub, Card, Tabs, Input, Select, Loading, Empty } from '@/components/atlas/kit';
import { Logo, Flag } from '@/components/atlas/entity-logo';
import { COUNTRY_OPTIONS, FilterChip, Pager, CardGrid, FSelect, useSportOptions, MONTHS } from '@/components/atlas/catalog';

/**
 * Atlas Raise — Programs & Events. Two tabs over /api/ecosystem-entities
 * (entity_type=program | event): accelerators/incubators/etc. and sports-tech
 * events. Read-only browse with search + filters + pagination; cards link out to
 * the entity's website.
 */
interface Eco {
	id: string; name: string; slug: string | null; entity_type: string;
	category: string | null; description: string | null; website: string | null;
	hq_country: string | null; hq_city: string | null;
	start_date?: string | null; mode?: string | null;
}

const PAGE_SIZE = 24;
const PROGRAM_CATEGORIES: [string, string][] = [
	['Accelerator', 'Accelerator'], ['Incubator', 'Incubator'], ['Competition', 'Challenge / Competition'],
	['Grant', 'Grant'], ['Venture Studio', 'Venture Studio'], ['Fellowship', 'Fellowship'],
];
const EVENT_MODES: [string, string][] = [['in_person', 'In person'], ['virtual', 'Virtual'], ['hybrid', 'Hybrid']];
const MODE_LABEL: Record<string, string> = { in_person: 'In person', virtual: 'Virtual', hybrid: 'Hybrid' };

const fmtDate = (d: string) => new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

export default function ProgramsEventsPage() {
	const [tab, setTab] = useState<'programs' | 'events'>('programs');
	return (
		<Screen>
			<div><H1>Programs & Events</H1><Sub>Accelerators, incubators and events across the sports-tech ecosystem.</Sub></div>
			<div style={{ marginTop: 16 }}>
				<Tabs tabs={[{ key: 'programs', label: 'Programs' }, { key: 'events', label: 'Events' }]} value={tab} onChange={setTab} />
			</div>
			<div style={{ marginTop: 20 }}>
				{tab === 'programs' ? <ProgramsTab /> : <EventsTab />}
			</div>
		</Screen>
	);
}

function ProgramsTab() {
	const [q, setQ] = useState('');
	const dq = useDebouncedValue(q);
	const [category, setCategory] = useState('');
	const [sport, setSport] = useState('');
	const [country, setCountry] = useState('');
	const [entriesOpen, setEntriesOpen] = useState(false);
	const [page, setPage] = useState(1);
	const reset = () => setPage(1);
	const sportOptions = useSportOptions();

	const params = useMemo(() => {
		const p: Record<string, unknown> = { entity_type: 'program', page, limit: PAGE_SIZE, sort: '-created_at' };
		const term = dq.trim().slice(0, 120);
		if (term) p.q = term;
		if (category) p.category = category;
		if (sport) p.sport_id = sport;
		if (country) p.country = country;
		if (entriesOpen) p.entries_open = true;
		return p;
	}, [page, dq, category, sport, country, entriesOpen]);
	const res = useSWR<{ data: Eco[]; total: number; totalPages: number }>(qk.ecosystem.list(params), { keepPreviousData: true });
	const rows = res.data?.data ?? [];
	const anyFilter = !!(dq || category || sport || country || entriesOpen);

	return (
		<>
			<SearchBar value={q} onChange={(v) => { setQ(v); reset(); }} placeholder="Search programs by name or website" />
			<div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
				<FSelect minWidth={160}><Select value={category} placeholder="All program types" options={PROGRAM_CATEGORIES} onChange={(e) => { setCategory(e.target.value); reset(); }} /></FSelect>
				<FSelect><Select value={sport} placeholder="All sports" options={sportOptions} onChange={(e) => { setSport(e.target.value); reset(); }} /></FSelect>
				<FSelect><Select value={country} placeholder="All countries" options={COUNTRY_OPTIONS} onChange={(e) => { setCountry(e.target.value); reset(); }} /></FSelect>
				<FilterChip active={entriesOpen} onClick={() => { setEntriesOpen((v) => !v); reset(); }}>Entries open</FilterChip>
				{anyFilter && <button className="atlas-btn atlas-btn--ghost atlas-btn--sm" onClick={() => { setQ(''); setCategory(''); setSport(''); setCountry(''); setEntriesOpen(false); reset(); }}>Clear</button>}
			</div>
			<CountLine total={res.data?.total ?? 0} noun="program" />
			{res.isLoading && rows.length === 0 ? <Loading />
				: rows.length === 0 ? <Empty>No programs match your filters.</Empty>
					: <CardGrid>{rows.map((e) => <EcoCard key={e.id} e={e} />)}</CardGrid>}
			<Pager page={page} totalPages={res.data?.totalPages ?? 1} onPage={setPage} />
		</>
	);
}

function EventsTab() {
	const [q, setQ] = useState('');
	const dq = useDebouncedValue(q);
	const [mode, setMode] = useState('');
	const [sport, setSport] = useState('');
	const [month, setMonth] = useState('');
	const [country, setCountry] = useState('');
	// Default to upcoming events, soonest first — the useful default. When showing
	// all events, flip to most-recent first (start_date ASC would surface the
	// oldest events in the DB on page 1).
	const [upcoming, setUpcoming] = useState(true);
	const [page, setPage] = useState(1);
	const reset = () => setPage(1);
	const sportOptions = useSportOptions();

	const params = useMemo(() => {
		const p: Record<string, unknown> = { entity_type: 'event', page, limit: PAGE_SIZE, sort: upcoming ? 'start_date' : '-start_date' };
		const term = dq.trim().slice(0, 120);
		if (term) p.q = term;
		if (mode) p.mode = mode;
		if (sport) p.sport_id = sport;
		if (month) p.start_month = month;
		if (country) p.country = country;
		if (upcoming) p.upcoming_only = true;
		return p;
	}, [page, dq, mode, sport, month, country, upcoming]);
	const res = useSWR<{ data: Eco[]; total: number; totalPages: number }>(qk.ecosystem.list(params), { keepPreviousData: true });
	const rows = res.data?.data ?? [];
	const anyFilter = !!(dq || mode || sport || month || country);

	return (
		<>
			<SearchBar value={q} onChange={(v) => { setQ(v); reset(); }} placeholder="Search events by name or website" />
			<div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
				<FSelect minWidth={140}><Select value={mode} placeholder="All formats" options={EVENT_MODES} onChange={(e) => { setMode(e.target.value); reset(); }} /></FSelect>
				<FSelect><Select value={sport} placeholder="All sports" options={sportOptions} onChange={(e) => { setSport(e.target.value); reset(); }} /></FSelect>
				<FSelect minWidth={140}><Select value={month} placeholder="Any month" options={MONTHS} onChange={(e) => { setMonth(e.target.value); reset(); }} /></FSelect>
				<FSelect><Select value={country} placeholder="All countries" options={COUNTRY_OPTIONS} onChange={(e) => { setCountry(e.target.value); reset(); }} /></FSelect>
				<FilterChip active={upcoming} onClick={() => { setUpcoming((v) => !v); reset(); }}>Upcoming only</FilterChip>
				{anyFilter && <button className="atlas-btn atlas-btn--ghost atlas-btn--sm" onClick={() => { setQ(''); setMode(''); setSport(''); setMonth(''); setCountry(''); setUpcoming(true); reset(); }}>Clear</button>}
			</div>
			<CountLine total={res.data?.total ?? 0} noun="event" />
			{res.isLoading && rows.length === 0 ? <Loading />
				: rows.length === 0 ? <Empty>No events match your filters.</Empty>
					: <CardGrid>{rows.map((e) => <EcoCard key={e.id} e={e} isEvent />)}</CardGrid>}
			<Pager page={page} totalPages={res.data?.totalPages ?? 1} onPage={setPage} />
		</>
	);
}

function SearchBar({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
	return (
		<div style={{ position: 'relative', marginBottom: 12 }}>
			<Search size={14} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--a-faint)', pointerEvents: 'none' }} />
			<Input placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} style={{ paddingLeft: 34 }} />
		</div>
	);
}

function CountLine({ total, noun }: { total: number; noun: string }) {
	return <div style={{ fontSize: 12, color: 'var(--a-faint)', marginBottom: 12 }}>{total.toLocaleString()} {noun}{total === 1 ? '' : 's'}</div>;
}

function EcoCard({ e, isEvent }: { e: Eco; isEvent?: boolean }) {
	const loc = [e.hq_city, e.hq_country].filter(Boolean).join(', ');
	return (
		<Card style={{ display: 'flex', flexDirection: 'column' }}>
			<div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
				<Logo co={{ name: e.name, website: e.website }} size={36} />
				<div style={{ minWidth: 0 }}>
					<div style={{ fontWeight: 600, fontSize: 15 }}>{e.name}</div>
					<div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--a-faint)', marginTop: 2, flexWrap: 'wrap' }}>
						{isEvent
							? <>{e.start_date && <span>{fmtDate(e.start_date)}</span>}{e.mode && <span>· {MODE_LABEL[e.mode] ?? e.mode}</span>}</>
							: e.category && <span>{e.category}</span>}
						{e.hq_country && <><Flag cc={e.hq_country} size={13} /><span>{loc}</span></>}
					</div>
				</div>
			</div>
			{e.description && <div style={{ fontSize: 13, color: 'var(--a-muted)', lineHeight: 1.5, marginBottom: 10, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{e.description}</div>}
			{e.website && (
				<div style={{ marginTop: 'auto' }}>
					<a className="atlas-btn atlas-btn--outline atlas-btn--sm" href={e.website} target="_blank" rel="noreferrer">Visit website</a>
				</div>
			)}
		</Card>
	);
}
