'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { ArrowUpRight } from 'lucide-react';
import { qk } from '@/lib/query-keys';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { Loading, Empty, Action, FilterBar, type FilterDef, Logo, Flag, Pager, CardGrid, lockedFiltersNote } from '@/components/atlas';
import { COUNTRY_OPTIONS, MONTHS } from '@/lib/catalog-options';
import { useSportOptions, useLocationFacetOptions } from '@/hooks/use-catalog-options';
import { useFeatureAccess } from '@/contexts/feature-access-context';

/**
 * Ecosystem catalogues for Raise — Programs and Events lists (formerly the two
 * tabs of "Programs & Events"), rendered by /raise/programs and /raise/events.
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

/** Programs catalogue (accelerators, incubators…): filter toolbar + card grid + pager. */
export function ProgramsList() {
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
	const res = useSWR<{ data: Eco[]; total: number; totalPages: number }>(qk.ecosystem.list(params), { keepPreviousData: true });
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
						sel('country', 'Country', country, COUNTRY_OPTIONS, setCountry),
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
			/>
			<Divider />
			{res.isLoading && rows.length === 0 ? <Loading />
				: rows.length === 0 ? <Empty>No programs match your filters.</Empty>
					: <CardGrid>{rows.map((e) => <EcoCard key={e.id} e={e} />)}</CardGrid>}
			<Pager page={page} totalPages={res.data?.totalPages ?? 1} onPage={setPage} />
		</>
	);
}

/** Events catalogue: filter toolbar + card grid + pager. */
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
	// Default to upcoming events, soonest first — the useful default. When showing
	// all events, flip to most-recent first (start_date ASC would surface the
	// oldest events in the DB on page 1).
	const [upcoming, setUpcoming] = useState(true);
	const [page, setPage] = useState(1);
	const reset = () => setPage(1);
	const sportOptions = useSportOptions();
	const loc = useLocationFacetOptions();
	const adv = useFeatureAccess('advanced_filters');
	// Filter defs for the toolbar — each change resets to page 1, as before.
	const sel = (key: string, label: string, value: string, options: [string, string][], set: (v: string) => void): FilterDef =>
		({ kind: 'select', key, label, value, options, onChange: (v) => { set(v); reset(); } });
	const tog = (key: string, label: string, value: boolean, set: (v: boolean) => void): FilterDef =>
		({ kind: 'toggle', key, label, value, onChange: (v) => { set(v); reset(); } });

	const params = useMemo(() => {
		const p: Record<string, unknown> = { entity_type: 'event', page, limit: PAGE_SIZE, sort: upcoming ? 'start_date' : '-start_date' };
		const term = dq.trim().slice(0, 120);
		if (term) p.q = term;
		if (mode) p.mode = mode;
		if (sport) p.sport_id = sport;
		if (month) p.start_month = month;
		if (country) p.country = country;
		if (upcoming) p.upcoming_only = true;
		if (adv.hasAccess) {
			if (city) p.city = city;
			if (continent) p.continent = continent;
			if (region) p.region = region;
		}
		return p;
	}, [page, dq, mode, sport, month, country, upcoming, adv.hasAccess, city, continent, region]);
	const res = useSWR<{ data: Eco[]; total: number; totalPages: number }>(qk.ecosystem.list(params), { keepPreviousData: true });
	const rows = res.data?.data ?? [];
	const anyFilter = !!(dq || mode || sport || month || country || city || continent || region);

	return (
		<>
			<FilterBar
				search={{ value: q, onChange: (v) => { setQ(v); reset(); }, placeholder: 'Search events by name or website' }}
				groups={[
					{ label: 'Event', filters: [
						sel('mode', 'Format', mode, EVENT_MODES, setMode),
						sel('sport', 'Sport', sport, sportOptions, setSport),
						sel('month', 'Month', month, MONTHS, setMonth),
						tog('upcoming', 'Upcoming only', upcoming, setUpcoming),
					] },
					{ label: 'Geography & location', filters: [
						sel('country', 'Country', country, COUNTRY_OPTIONS, setCountry),
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
				count={`${(res.data?.total ?? 0).toLocaleString()} event${(res.data?.total ?? 0) === 1 ? '' : 's'}`}
			/>
			<Divider />
			{res.isLoading && rows.length === 0 ? <Loading />
				: rows.length === 0 ? <Empty>No events match your filters.</Empty>
					: <CardGrid>{rows.map((e) => <EcoCard key={e.id} e={e} isEvent />)}</CardGrid>}
			<Pager page={page} totalPages={res.data?.totalPages ?? 1} onPage={setPage} />
		</>
	);
}

/** Hairline between the filter bar and the results grid (matches the Investors page). */
function Divider() {
	return <div style={{ borderTop: '1px solid var(--a-border)', margin: '6px 0 30px' }} />;
}

/** Program/event card — the Figma "Investor Card" layout (see .atlas-entity-card in components/atlas/styles/components.css). */
function EcoCard({ e, isEvent }: { e: Eco; isEvent?: boolean }) {
	const loc = [e.hq_city, e.hq_country].filter(Boolean).join(', ');
	const meta = isEvent
		? [e.start_date ? fmtDate(e.start_date) : null, e.mode ? (MODE_LABEL[e.mode] ?? e.mode) : null].filter(Boolean).join(' · ')
		: e.category;
	return (
		<div className="atlas-card atlas-entity-card">
			<div className="atlas-entity-card__head">
				<Logo co={{ name: e.name, website: e.website }} size={62} radius={9} />
				<div style={{ minWidth: 0, paddingTop: 11 }}>
					{meta && <div className="atlas-entity-card__eyebrow">{meta}</div>}
					<div className="atlas-entity-card__name">{e.name}</div>
					{e.hq_country && (
						<div className="atlas-entity-card__meta"><Flag cc={e.hq_country} size={11} /><span>{loc}</span></div>
					)}
				</div>
			</div>
			{e.description && <div className="atlas-entity-card__desc">{e.description}</div>}
			{e.website && (
				<div className="atlas-entity-card__actions">
					<Action icon={<ArrowUpRight />} href={e.website} external>Visit website</Action>
				</div>
			)}
		</div>
	);
}
