'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { ArrowUpRight, Calendar, LayoutGrid, List, ChevronLeft, ChevronRight } from 'lucide-react';
import { ExportButton } from '@/components/features/exports/export-button';
import { qk } from '@/lib/query-keys';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { Loading, Empty, Action, FilterBar, type FilterDef, Logo, Flag, Pager, CardGrid, ViewToggle as AtlasViewToggle, type ViewMode, lockedFiltersNote } from '@/components/atlas';
import { ResultCapNote } from '../market/result-cap-note';
import { MONTHS } from '@/lib/catalog-options';
import { useSportOptions, useLocationFacetOptions, useCountryOptions } from '@/hooks/use-catalog-options';
import { useFeatureAccess } from '@/contexts/feature-access-context';
import './events-calendar.css';

/**
 * Ecosystem catalogues — Programs and Events lists (shared by Raise and Scout;
 * e.g. /app/programs, /app/events).
 */
interface Eco {
	id: string; name: string; slug: string | null; entity_type: string;
	category: string | null; description: string | null; website: string | null;
	hq_country: string | null; hq_city: string | null;
	start_date?: string | null; end_date?: string | null; mode?: string | null;
	cover_url?: string | null;
}

const PAGE_SIZE = 24;
const PROGRAM_CATEGORIES: [string, string][] = [
	['Accelerator', 'Accelerator'], ['Incubator', 'Incubator'], ['Competition', 'Challenge / Competition'],
	['Grant', 'Grant'], ['Venture Studio', 'Venture Studio'], ['Fellowship', 'Fellowship'],
];
const EVENT_MODES: [string, string][] = [['in_person', 'In person'], ['virtual', 'Virtual'], ['hybrid', 'Hybrid']];
const MODE_LABEL: Record<string, string> = { in_person: 'In person', virtual: 'Virtual', hybrid: 'Hybrid' };

const fmtDate = (d: string) => new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
const fmtShortDate = (d: string) => new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
const extUrl = (u: string | null | undefined) => u ? (/^https?:\/\//i.test(u) ? u : `https://${u}`) : undefined;

type EventView = 'calendar' | 'table' | 'cards';

/** Programs catalogue (accelerators, incubators…): filter toolbar + card grid + pager. */
export function ProgramsList() {
	const [view, setView] = useState<ViewMode>('table'); // list is the default for every database
	const [q, setQ] = useState('');
	const dq = useDebouncedValue(q);
	const [category, setCategory] = useState('');
	const [sport, setSport] = useState('');
	const [country, setCountry] = useState('');
	const [city, setCity] = useState('');
	const [continent, setContinent] = useState('');
	const [region, setRegion] = useState('');
	const [entriesOpen, setEntriesOpen] = useState(false);
	const [page, setPage] = useState(1);
	const reset = () => setPage(1);
	const sportOptions = useSportOptions();
	const countryOptions = useCountryOptions();
	const loc = useLocationFacetOptions();
	const adv = useFeatureAccess('advanced_filters');
	// Filter defs for the toolbar — each change resets to page 1, as before.
	const sel = (key: string, label: string, value: string, options: [string, string][], set: (v: string) => void): FilterDef =>
		({ kind: 'select', key, label, value, options, onChange: (v) => { set(v); reset(); } });
	const tog = (key: string, label: string, value: boolean, set: (v: boolean) => void): FilterDef =>
		({ kind: 'toggle', key, label, value, onChange: (v) => { set(v); reset(); } });

	const params = useMemo(() => {
		const p: Record<string, unknown> = { entity_type: 'program', page, limit: PAGE_SIZE, sort: '-created_at' };
		const term = dq.trim().slice(0, 120);
		if (term) p.q = term;
		if (category) p.category = category;
		if (sport) p.sport_id = sport;
		if (country) p.country = country;
		if (entriesOpen) p.entries_open = true;
		if (adv.hasAccess) {
			if (city) p.city = city;
			if (continent) p.continent = continent;
			if (region) p.region = region;
		}
		return p;
	}, [page, dq, category, sport, country, entriesOpen, adv.hasAccess, city, continent, region]);
	const res = useSWR<{ data: Eco[]; total: number; totalPages: number; cap?: number }>(qk.ecosystem.list(params), { keepPreviousData: true });
	const rows = res.data?.data ?? [];
	const anyFilter = !!(dq || category || sport || country || city || continent || region || entriesOpen);

	return (
		<>
			<FilterBar
				search={{ value: q, onChange: (v) => { setQ(v); reset(); }, placeholder: 'Search programs by name or website' }}
				groups={[
					{ label: 'Program', filters: [
						sel('category', 'Program type', category, PROGRAM_CATEGORIES, setCategory),
						sel('sport', 'Sport', sport, sportOptions, setSport),
						tog('entriesOpen', 'Entries open', entriesOpen, setEntriesOpen),
					] },
					{ label: 'Geography & location', filters: [
						sel('country', 'Country', country, countryOptions, setCountry),
						...(adv.hasAccess ? [
							sel('continent', 'Continent', continent, loc.continent, setContinent),
							sel('region', 'Region', region, loc.region, setRegion),
							sel('city', 'City', city, loc.city, setCity),
						] : []),
					] },
					...(adv.isLocked ? [{ label: 'Advanced', filters: [], locked: lockedFiltersNote(adv.requiredTier) }] : []),
				]}
				canClear={anyFilter}
				onClear={() => { setQ(''); setCategory(''); setSport(''); setCountry(''); setCity(''); setContinent(''); setRegion(''); setEntriesOpen(false); reset(); }}
				count={`${(res.data?.total ?? 0).toLocaleString()} program${(res.data?.total ?? 0) === 1 ? '' : 's'}`}
				actions={<><AtlasViewToggle value={view} onChange={setView} /><ExportButton entity="programs" search={dq} params={params} /></>}
			/>
			<Divider />
			{res.isLoading && rows.length === 0 ? <Loading />
				: rows.length === 0 ? <Empty>No programs match your filters.</Empty>
				: view === 'cards'
					? <CardGrid>{rows.map((e) => <EcoCard key={e.id} e={e} />)}</CardGrid>
					: (
					<div className="atlas-table" role="table">
						<div className="atlas-table__head">
							<span className="atlas-table__name">Program</span>
							<span className="atlas-table__col hide-sm" style={{ width: 120 }}>Type</span>
							<span className="atlas-table__col hide-sm" style={{ width: 120 }}>Location</span>
							<span className="atlas-table__col" style={{ width: 70 }}>Website</span>
						</div>
						{rows.map((e) => {
							const loc = [e.hq_city, e.hq_country].filter(Boolean).join(', ');
							const href = extUrl(e.website);
							return (
								<div key={e.id} className="atlas-table__row" style={href ? { cursor: 'pointer' } : undefined} onClick={href ? () => window.open(href, '_blank', 'noopener') : undefined}>
									<div className="atlas-table__name">
										<Logo co={{ name: e.name, website: e.website }} size={28} radius={5} />
										<div className="atlas-table__name-main">
											<div className="atlas-ellipsis" style={{ fontWeight: 600 }}>{e.name}</div>
											{e.description && <div style={{ fontSize: 11, color: 'var(--a-muted)' }} className="atlas-ellipsis">{e.description}</div>}
										</div>
									</div>
									<span className="atlas-table__col hide-sm" style={{ width: 120 }}>{e.category ?? '—'}</span>
									<span className="atlas-table__col hide-sm" style={{ width: 120 }}>{e.hq_country ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Flag cc={e.hq_country} size={11} />{loc}</span> : loc || '—'}</span>
									<span className="atlas-table__col" style={{ width: 70 }}>{href ? <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--a-navy)' }} onClick={(ev) => ev.stopPropagation()}><ArrowUpRight size={13} /></a> : '—'}</span>
								</div>
							);
						})}
					</div>
					)}
			<Pager page={page} totalPages={res.data?.totalPages ?? 1} onPage={setPage} />
		</>
	);
}

/** Events catalogue: calendar (default), table, or card view. */
export function EventsList() {
	const [q, setQ] = useState('');
	const dq = useDebouncedValue(q);
	const [mode, setMode] = useState('');
	const [sport, setSport] = useState('');
	const [month, setMonth] = useState('');
	const [country, setCountry] = useState('');
	const [city, setCity] = useState('');
	const [continent, setContinent] = useState('');
	const [region, setRegion] = useState('');
	const [upcoming, setUpcoming] = useState(true);
	const [page, setPage] = useState(1);
	const [view, setView] = useState<EventView>('table'); // list is the default for every database
	const reset = () => setPage(1);
	const sportOptions = useSportOptions();
	const countryOptions = useCountryOptions();
	const loc = useLocationFacetOptions();
	const adv = useFeatureAccess('advanced_filters');
	const sel = (key: string, label: string, value: string, options: [string, string][], set: (v: string) => void): FilterDef =>
		({ kind: 'select', key, label, value, options, onChange: (v) => { set(v); reset(); } });
	const tog = (key: string, label: string, value: boolean, set: (v: boolean) => void): FilterDef =>
		({ kind: 'toggle', key, label, value, onChange: (v) => { set(v); reset(); } });

	// Calendar month state
	const today = new Date();
	const [calYear, setCalYear] = useState(today.getFullYear());
	const [calMonth, setCalMonth] = useState(today.getMonth()); // 0-based

	const baseFilters = useMemo(() => {
		const p: Record<string, unknown> = { entity_type: 'event' };
		const term = dq.trim().slice(0, 120);
		if (term) p.q = term;
		if (mode) p.mode = mode;
		if (sport) p.sport_id = sport;
		if (month) p.start_month = month;
		if (country) p.country = country;
		if (adv.hasAccess) {
			if (city) p.city = city;
			if (continent) p.continent = continent;
			if (region) p.region = region;
		}
		return p;
	}, [dq, mode, sport, month, country, adv.hasAccess, city, continent, region]);

	// List/table params (paginated, with upcoming toggle)
	const listParams = useMemo(() => {
		const p: Record<string, unknown> = { ...baseFilters, page, limit: PAGE_SIZE, sort: upcoming ? 'start_date' : '-start_date' };
		if (upcoming) p.upcoming_only = true;
		return p;
	}, [baseFilters, page, upcoming]);

	// Calendar params (date-range, high limit, no pagination)
	const calParams = useMemo(() => {
		const first = new Date(calYear, calMonth, 1);
		const last = new Date(calYear, calMonth + 1, 0);
		const pad = (n: number) => String(n).padStart(2, '0');
		return {
			...baseFilters,
			start_date_min: `${first.getFullYear()}-${pad(first.getMonth() + 1)}-01`,
			start_date_max: `${last.getFullYear()}-${pad(last.getMonth() + 1)}-${pad(last.getDate())}`,
			sort: 'start_date' as const,
			limit: 200,
			page: 1,
		};
	}, [baseFilters, calYear, calMonth]);

	const listRes = useSWR<{ data: Eco[]; total: number; totalPages: number; cap?: number }>(
		view !== 'calendar' ? qk.ecosystem.list(listParams) : null,
		{ keepPreviousData: true },
	);
	const calRes = useSWR<{ data: Eco[]; total: number }>(
		view === 'calendar' ? qk.ecosystem.list(calParams) : null,
		{ keepPreviousData: true },
	);

	const listRows = listRes.data?.data ?? [];
	const calRows = calRes.data?.data ?? [];
	const anyFilter = !!(dq || mode || sport || month || country || city || continent || region);

	const prevMonth = () => {
		if (calMonth === 0) { setCalYear((y) => y - 1); setCalMonth(11); }
		else setCalMonth((m) => m - 1);
	};
	const nextMonth = () => {
		if (calMonth === 11) { setCalYear((y) => y + 1); setCalMonth(0); }
		else setCalMonth((m) => m + 1);
	};
	const goToday = () => { setCalYear(today.getFullYear()); setCalMonth(today.getMonth()); };

	const totalCount = view === 'calendar'
		? (calRes.data?.total ?? 0)
		: (listRes.data?.total ?? 0);

	return (
		<>
			<FilterBar
				search={{ value: q, onChange: (v) => { setQ(v); reset(); }, placeholder: 'Search events by name or website' }}
				groups={[
					{ label: 'Event', filters: [
						sel('mode', 'Format', mode, EVENT_MODES, setMode),
						sel('sport', 'Sport', sport, sportOptions, setSport),
						sel('month', 'Month', month, MONTHS, setMonth),
						...(view !== 'calendar' ? [tog('upcoming', 'Upcoming only', upcoming, setUpcoming)] : []),
					] },
					{ label: 'Geography & location', filters: [
						sel('country', 'Country', country, countryOptions, setCountry),
						...(adv.hasAccess ? [
							sel('continent', 'Continent', continent, loc.continent, setContinent),
							sel('region', 'Region', region, loc.region, setRegion),
							sel('city', 'City', city, loc.city, setCity),
						] : []),
					] },
					...(adv.isLocked ? [{ label: 'Advanced', filters: [], locked: lockedFiltersNote(adv.requiredTier) }] : []),
				]}
				canClear={anyFilter}
				onClear={() => { setQ(''); setMode(''); setSport(''); setMonth(''); setCountry(''); setCity(''); setContinent(''); setRegion(''); setUpcoming(true); reset(); }}
				count={`${totalCount.toLocaleString()} event${totalCount === 1 ? '' : 's'}`}
				actions={
					<>
						<ExportButton entity="events" search={dq} params={view === 'calendar' ? calParams : listParams} />
						<ViewToggle view={view} onChange={setView} />
					</>
				}
			/>
			<Divider />

			{view === 'calendar' && (
				<>
					<CalendarNav year={calYear} month={calMonth} onPrev={prevMonth} onNext={nextMonth} onToday={goToday} />
					{calRes.isLoading && calRows.length === 0
						? <Loading />
						: <CalendarGrid year={calYear} month={calMonth} events={calRows} />}
				</>
			)}

			{view === 'table' && (
				<>
					{listRes.isLoading && listRows.length === 0 ? <Loading />
						: listRows.length === 0 ? <Empty>No events match your filters.</Empty>
							: <EventsTable rows={listRows} />}
					<Pager page={page} totalPages={listRes.data?.totalPages ?? 1} onPage={setPage} />
				</>
			)}

			{view === 'cards' && (
				<>
					{listRes.isLoading && listRows.length === 0 ? <Loading />
						: listRows.length === 0 ? <Empty>No events match your filters.</Empty>
							: <CardGrid>{listRows.map((e) => <EcoCard key={e.id} e={e} isEvent />)}</CardGrid>}
					<ResultCapNote cap={listRes.data?.cap} total={listRes.data?.total ?? 0} noun="events" />
					<Pager page={page} totalPages={listRes.data?.totalPages ?? 1} onPage={setPage} />
				</>
			)}
		</>
	);
}

/* ── View toggle ────────────────────────────────────────────────────────── */

function ViewToggle({ view, onChange }: { view: EventView; onChange: (v: EventView) => void }) {
	const views: { key: EventView; icon: typeof Calendar; label: string }[] = [
		{ key: 'calendar', icon: Calendar, label: 'Calendar' },
		{ key: 'table', icon: List, label: 'Table' },
		{ key: 'cards', icon: LayoutGrid, label: 'Cards' },
	];
	return (
		<div className="ecal-view-toggle">
			{views.map(({ key, icon: Icon, label }) => (
				<button
					key={key}
					type="button"
					className={`ecal-view-toggle__btn ${view === key ? 'ecal-view-toggle__btn--active' : ''}`}
					onClick={() => onChange(key)}
					title={label}
					aria-pressed={view === key}
				>
					<Icon size={15} />
				</button>
			))}
		</div>
	);
}

/* ── Calendar navigation ────────────────────────────────────────────────── */

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function CalendarNav({ year, month, onPrev, onNext, onToday }: {
	year: number; month: number; onPrev: () => void; onNext: () => void; onToday: () => void;
}) {
	return (
		<div className="ecal-nav">
			<button type="button" className="atlas-btn atlas-btn--outline ecal-nav__today" onClick={onToday}>Today</button>
			<button type="button" className="ecal-nav__arrow" onClick={onPrev} aria-label="Previous month"><ChevronLeft size={18} /></button>
			<button type="button" className="ecal-nav__arrow" onClick={onNext} aria-label="Next month"><ChevronRight size={18} /></button>
			<h2 className="ecal-nav__title">{MONTH_NAMES[month]} {year}</h2>
		</div>
	);
}

/* ── Calendar grid ──────────────────────────────────────────────────────── */

const DAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function CalendarGrid({ year, month, events }: { year: number; month: number; events: Eco[] }) {
	const today = new Date();
	const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

	// Build a day-of-month → events map
	const byDay = useMemo(() => {
		const map = new Map<number, Eco[]>();
		for (const ev of events) {
			if (!ev.start_date) continue;
			const d = new Date(ev.start_date);
			if (d.getFullYear() === year && d.getMonth() === month) {
				const day = d.getDate();
				if (!map.has(day)) map.set(day, []);
				map.get(day)!.push(ev);
			}
		}
		return map;
	}, [events, year, month]);

	// Calendar grid cells: padding days from prev month + days of month + padding from next
	const firstOfMonth = new Date(year, month, 1);
	const daysInMonth = new Date(year, month + 1, 0).getDate();
	// Monday = 0
	const startDow = (firstOfMonth.getDay() + 6) % 7;

	const cells: Array<{ day: number; inMonth: boolean; dateStr: string }> = [];
	// Previous month padding
	const prevMonthDays = new Date(year, month, 0).getDate();
	for (let i = startDow - 1; i >= 0; i--) {
		const d = prevMonthDays - i;
		const m = month === 0 ? 12 : month;
		const y = month === 0 ? year - 1 : year;
		cells.push({ day: d, inMonth: false, dateStr: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}` });
	}
	// Current month
	for (let d = 1; d <= daysInMonth; d++) {
		cells.push({ day: d, inMonth: true, dateStr: `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}` });
	}
	// Next month padding (fill to complete weeks)
	const remaining = 7 - (cells.length % 7);
	if (remaining < 7) {
		for (let d = 1; d <= remaining; d++) {
			const m = month === 11 ? 1 : month + 2;
			const y = month === 11 ? year + 1 : year;
			cells.push({ day: d, inMonth: false, dateStr: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}` });
		}
	}

	const [expanded, setExpanded] = useState<number | null>(null);

	return (
		<div className="ecal">
			<div className="ecal__header">
				{DAY_HEADERS.map((d) => <div key={d} className="ecal__dow">{d}</div>)}
			</div>
			<div className="ecal__grid">
				{cells.map((cell, i) => {
					const dayEvents = cell.inMonth ? (byDay.get(cell.day) ?? []) : [];
					const isToday = cell.dateStr === todayStr;
					const isExpanded = expanded === cell.day && cell.inMonth;
					const maxVisible = 3;
					const hasMore = dayEvents.length > maxVisible;
					return (
						<div key={i} className={`ecal__cell ${!cell.inMonth ? 'ecal__cell--outside' : ''} ${isToday ? 'ecal__cell--today' : ''}`}>
							<div className={`ecal__day-num ${isToday ? 'ecal__day-num--today' : ''}`}>{cell.day}</div>
							<div className="ecal__events">
								{(isExpanded ? dayEvents : dayEvents.slice(0, maxVisible)).map((ev) => (
									<CalendarEvent key={ev.id} event={ev} />
								))}
								{hasMore && !isExpanded && (
									<button type="button" className="ecal__more" onClick={() => setExpanded(cell.day)}>
										+{dayEvents.length - maxVisible} more
									</button>
								)}
								{isExpanded && hasMore && (
									<button type="button" className="ecal__more" onClick={() => setExpanded(null)}>
										Show less
									</button>
								)}
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}

function CalendarEvent({ event }: { event: Eco }) {
	const modeLabel = event.mode ? MODE_LABEL[event.mode] : null;
	const href = extUrl(event.website);
	const Tag = href ? 'a' : 'div';
	const linkProps = href ? { href, target: '_blank', rel: 'noopener noreferrer' } : {};
	return (
		<Tag className={`ecal__event ecal__event--${event.mode ?? 'default'}`} {...linkProps} title={event.name}>
			<span className="ecal__event-name">{event.name}</span>
			{modeLabel && <span className="ecal__event-mode">{modeLabel}</span>}
		</Tag>
	);
}

/* ── Table view ─────────────────────────────────────────────────────────── */

function EventsTable({ rows }: { rows: Eco[] }) {
	return (
		<div className="ecal-table-wrap">
			<table className="ecal-table">
				<thead>
					<tr>
						<th>Date</th>
						<th>Event</th>
						<th>Location</th>
						<th>Format</th>
						<th>Website</th>
					</tr>
				</thead>
				<tbody>
					{rows.map((e) => {
						const loc = [e.hq_city, e.hq_country].filter(Boolean).join(', ');
						const dateRange = e.start_date
							? e.end_date && e.end_date !== e.start_date
								? `${fmtShortDate(e.start_date)} – ${fmtShortDate(e.end_date)}`
								: fmtDate(e.start_date)
							: '—';
						return (
							<tr key={e.id}>
								<td className="ecal-table__date">{dateRange}</td>
								<td>
									<div className="ecal-table__event">
										<Logo co={{ name: e.name, website: e.website }} size={28} radius={5} />
										<div>
											<div className="ecal-table__name">{e.name}</div>
											{e.description && <div className="ecal-table__desc">{e.description}</div>}
										</div>
									</div>
								</td>
								<td>{e.hq_country ? <span className="ecal-table__loc"><Flag cc={e.hq_country} size={12} /> {loc}</span> : loc || '—'}</td>
								<td>{e.mode ? <span className={`ecal-table__mode ecal-table__mode--${e.mode}`}>{MODE_LABEL[e.mode] ?? e.mode}</span> : '—'}</td>
								<td>{e.website ? <a href={extUrl(e.website)} target="_blank" rel="noopener noreferrer" className="ecal-table__link"><ArrowUpRight size={13} /> Visit</a> : '—'}</td>
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);
}

/* ── Shared components ──────────────────────────────────────────────────── */

function Divider() {
	return <div style={{ borderTop: '1px solid var(--a-border)', margin: '6px 0 30px' }} />;
}

function EcoCard({ e, isEvent }: { e: Eco; isEvent?: boolean }) {
	const loc = [e.hq_city, e.hq_country].filter(Boolean).join(', ');
	const dateLine = isEvent && e.start_date ? fmtDate(e.start_date) : null;
	const modeLine = isEvent && e.mode ? (MODE_LABEL[e.mode] ?? e.mode) : null;
	const eyebrow = isEvent ? modeLine : e.category;
	return (
		<div className="atlas-card atlas-entity-card">
			<div className="atlas-entity-card__head">
				<Logo co={{ name: e.name, website: e.website }} size={62} radius={9} />
				<div style={{ minWidth: 0, paddingTop: 11 }}>
					{eyebrow && <div className="atlas-entity-card__eyebrow">{eyebrow}</div>}
					<div className="atlas-entity-card__name" title={e.name}>{e.name}</div>
					{e.hq_country && (
						<div className="atlas-entity-card__meta"><Flag cc={e.hq_country} size={11} /><span>{loc}</span></div>
					)}
				</div>
			</div>
			{e.description && <div className="atlas-entity-card__desc">{e.description}</div>}
			<div className="atlas-entity-card__foot">
				{dateLine && <span className="atlas-entity-card__date">{dateLine}</span>}
				{!dateLine && !isEvent && <span />}
				{e.website && <a href={extUrl(e.website)} target="_blank" rel="noopener noreferrer" className="atlas-entity-card__link" title="Visit website"><ArrowUpRight size={15} /></a>}
			</div>
		</div>
	);
}
