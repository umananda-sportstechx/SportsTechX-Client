'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { toast } from 'sonner';
import { Check, Plus, ExternalLink, Loader2, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { qk } from '@/lib/query-keys';
import { apiRequest } from '@/lib/query-client';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { Screen, H1, Card, Button, Tabs, Input, Select, Loading, Empty } from '@/components/atlas/kit';
import { Logo, Flag } from '@/components/atlas/entity-logo';
import { FSelect, LockedFilters, useSectorTierData, useSportOptions, useLocationFacetOptions, useTechTagOptions, SINCE_YEARS, DEALS_BUCKETS } from '@/components/atlas/catalog';
import { useFeatureAccess } from '@/contexts/feature-access-context';

/**
 * Atlas Raise — Investors (mock-ups 10/11 / Notion "Investors"). Recommended
 * (reuses the investor-matching engine at /api/recommendations/investors) and All
 * (the investor database, with search + filters + pagination). Recommendations
 * lead with the *reasons* Atlas matched them — not a mystery % score (Notion).
 * "Add to pipeline" posts to raise Pipeline.
 */
interface Match { id: string; name: string; slug: string | null; website: string | null; logo_url?: string | null; hq_country?: string | null; category: string | null; description: string | null; score: number; match_reasons: string[] }
interface MatchResult { company: { id: string; name: string } | null; reason?: string; results: Match[] }
interface Investor { id: string; name: string; slug: string | null; category: string | null; description: string | null; website: string | null; logo_url?: string | null; hq_country?: string | null }
interface RoundRef { id: string; name: string; slug: string }

const PAGE_SIZE = 24;
// Firm-type enum → founder-facing label (mirrors the investors.category enum).
const CATEGORY_OPTIONS: [string, string][] = [
	['venture_capital', 'Venture Capital'], ['financial_services', 'Corporate VC'],
	['private_equity', 'Private Equity'], ['family_investment_office', 'Family Office'],
	['sovereign_wealth_fund', 'Sovereign Wealth Fund'], ['angel', 'Angel'], ['other', 'Other'],
];
// Country options — the OPTION VALUE is a CSV of every spelling that country
// appears under in the data (the backend `country` filter splits CSV and matches
// any), so one option catches all variants. Ordered by investor frequency.
// e.g. the DB stores both "USA" and "United States"; "UK" and "United Kingdom".
const COUNTRY_OPTIONS: [string, string][] = [
	['USA,United States', 'United States'],
	['UK,United Kingdom', 'United Kingdom'],
	['India', 'India'], ['Singapore', 'Singapore'], ['France', 'France'],
	['Australia', 'Australia'], ['Germany', 'Germany'], ['Hong Kong', 'Hong Kong'],
	['Canada', 'Canada'], ['Israel', 'Israel'], ['Spain', 'Spain'], ['Brazil', 'Brazil'],
	['UAE,United Arab Emirates', 'United Arab Emirates'], ['The Netherlands,Netherlands', 'Netherlands'],
	['Sweden', 'Sweden'], ['China', 'China'], ['Switzerland', 'Switzerland'], ['Belgium', 'Belgium'],
	['Japan', 'Japan'], ['Italy', 'Italy'], ['Denmark', 'Denmark'], ['South Korea', 'South Korea'],
	['Ireland', 'Ireland'], ['Portugal', 'Portugal'], ['Finland', 'Finland'], ['Luxembourg', 'Luxembourg'],
	['Saudi Arabia', 'Saudi Arabia'],
];
const SORT_OPTIONS: [string, string][] = [['-created_at', 'Newest'], ['name', 'Name A–Z'], ['-deals', 'Most deals']];

export default function RaiseInvestorsPage() {
	const [tab, setTab] = useState<'recommended' | 'all'>('recommended');

	const [dismissed, setDismissed] = useState<Set<string>>(new Set());
	const matches = useSWR<MatchResult>(['/api/recommendations/investors', { limit: 24 }]);
	const pipe = useSWR<{ data: Array<{ investor_id: string | null }> }>(qk.raise.pipeline());
	const criteria = useSWR<{ criteria: { investor_types?: string[]; geographies?: string[]; cheque_min?: string | null; cheque_max?: string | null } | null }>(qk.raise.current());
	const inPipeline = useMemo(() => new Set((pipe.data?.data ?? []).map((r) => r.investor_id).filter(Boolean) as string[]), [pipe.data]);

	// Only factors the engine actually matches on (sector/stage come from the company;
	// type + geographies from criteria). Cheque size isn't matched — no investor cheque
	// data — so it's shown as a stated preference, not a match factor.
	const criteriaSummary = useMemo(() => {
		const c = criteria.data?.criteria;
		if (!c) return null;
		const parts: string[] = [];
		if (c.investor_types?.length) parts.push(c.investor_types.join(', '));
		if (c.geographies?.length) parts.push(c.geographies.join(', '));
		return parts.length ? `Matching on ${parts.join(' · ')}` : null;
	}, [criteria.data]);

	const add = async (investorId: string) => {
		try {
			await apiRequest('POST', '/api/raise/pipeline', { investor_id: investorId, stage: 'target' });
			toast.success('Added to pipeline');
			void pipe.mutate();
		} catch (e) { toast.error((e as Error).message); }
	};

	return (
		<Screen>
			<H1>Investors</H1>
			<div style={{ marginTop: 16 }}>
				<Tabs tabs={[{ key: 'recommended', label: 'Recommended' }, { key: 'all', label: 'All investors' }]} value={tab} onChange={setTab} />
			</div>

			<div style={{ marginTop: 20 }}>
				{tab === 'recommended' ? (
					matches.isLoading ? <Loading />
						: matches.data?.reason === 'no_company_claim' || !matches.data?.company ? (
							<Empty>Atlas needs your company category to match investors. Set it under{' '}<Link href="/raise/settings" style={{ color: 'var(--a-navy)' }}>Raise settings → Category</Link>.</Empty>
						) : (matches.data?.results.length ?? 0) === 0 ? <Empty>No matches yet. Broaden your investor criteria in setup.</Empty>
							: <>
								{criteriaSummary && (
									<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap', border: '1px solid var(--a-border)', borderRadius: 10, padding: '14px 20px', marginBottom: 14 }}>
										<span style={{ fontSize: 13, color: 'var(--a-muted)' }}>{criteriaSummary}</span>
										<Button href="/raise/settings" variant="outline" size="sm">Edit criteria</Button>
									</div>
								)}
								<Grid>
									{matches.data!.results.filter((m) => !dismissed.has(m.id)).map((m) => (
										<InvestorCard key={m.id} inv={m} added={inPipeline.has(m.id)} onAdd={() => add(m.id)} reasons={m.match_reasons}
											onDismiss={() => setDismissed((s) => new Set(s).add(m.id))} />
									))}
								</Grid>
							</>
				) : (
					<AllInvestorsTab inPipeline={inPipeline} onAdd={add} />
				)}
			</div>
		</Screen>
	);
}

/** The "All investors" tab — search + filters + sort + pagination over /api/investors. */
function AllInvestorsTab({ inPipeline, onAdd }: { inPipeline: Set<string>; onAdd: (id: string) => void }) {
	const [q, setQ] = useState('');
	const dq = useDebouncedValue(q);
	const [category, setCategory] = useState('');
	const [roundType, setRoundType] = useState('');
	const [sector, setSector] = useState('');
	const [subSector, setSubSector] = useState('');
	const [subSubSector, setSubSubSector] = useState('');
	const [sport, setSport] = useState('');
	const [country, setCountry] = useState('');
	const [city, setCity] = useState('');
	const [continent, setContinent] = useState('');
	const [region, setRegion] = useState('');
	const [techTag, setTechTag] = useState('');
	const [launched, setLaunched] = useState('');
	const [deals, setDeals] = useState('');
	const [verified, setVerified] = useState(false);
	const [active, setActive] = useState(false);
	const [sort, setSort] = useState('-created_at');
	const [page, setPage] = useState(1);
	const reset = () => setPage(1); // any filter/search change returns to page 1

	const roundsResp = useSWR<RoundRef[] | { data: RoundRef[] }>(qk.reference.roundTypes(), { dedupingInterval: 60 * 60_000 });
	const rounds = Array.isArray(roundsResp.data) ? roundsResp.data : (roundsResp.data?.data ?? []);
	const sectors = useSectorTierData();
	const sportOptions = useSportOptions();
	const loc = useLocationFacetOptions();
	const techTags = useTechTagOptions();
	const adv = useFeatureAccess('advanced_filters');

	const params = useMemo(() => {
		const p: Record<string, unknown> = { page, limit: PAGE_SIZE, sort };
		// Backend `q` is min(1).max(120): trim (drop whitespace-only) and cap so a
		// spaces-only or over-long search never 400s the whole list request.
		const term = dq.trim().slice(0, 120);
		if (term) p.q = term;
		if (category) p.category = category;
		if (roundType) p.round_type_slug = roundType;
		const secSlug = sectors.sectorSlug(sector, adv.hasAccess ? subSector : '', adv.hasAccess ? subSubSector : '');
		if (secSlug) p.sector_slug = secSlug;
		if (sport) p.sport_id = sport;
		if (country) p.country = country;
		if (launched) p.year_launched_min = launched;
		if (deals) p.deals_min = deals;
		if (verified) p.is_verified = true;
		if (active) p.actively_investing = true;
		if (adv.hasAccess) {
			if (city) p.city = city;
			if (continent) p.continent = continent;
			if (region) p.region = region;
			if (techTag) p.tech_tag_slug = techTag;
		}
		return p;
	}, [page, sort, dq, category, roundType, sectors, sector, subSector, subSubSector, sport, country, launched, deals, verified, active, adv.hasAccess, city, continent, region, techTag]);

	const all = useSWR<{ data: Investor[]; total: number; totalPages: number }>(qk.investors.list(params), { keepPreviousData: true });
	const rows = all.data?.data ?? [];
	const total = all.data?.total ?? 0;
	const totalPages = all.data?.totalPages ?? 1;
	const anyFilter = !!(dq || category || roundType || sector || subSector || subSubSector || sport || country || city || continent || region || techTag || launched || deals || verified || active);
	const clearAll = () => { setQ(''); setCategory(''); setRoundType(''); setSector(''); setSubSector(''); setSubSubSector(''); setSport(''); setCountry(''); setCity(''); setContinent(''); setRegion(''); setTechTag(''); setLaunched(''); setDeals(''); setVerified(false); setActive(false); setSort('-created_at'); setPage(1); };

	return (
		<>
			<div style={{ position: 'relative', marginBottom: 12 }}>
				<Search size={14} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--a-faint)', pointerEvents: 'none' }} />
				<Input placeholder="Search investors by name or website" value={q} onChange={(e) => { setQ(e.target.value); reset(); }} style={{ paddingLeft: 34 }} />
			</div>
			<div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
				<FSelect><Select value={category} placeholder="All firm types" options={CATEGORY_OPTIONS} onChange={(e) => { setCategory(e.target.value); reset(); }} /></FSelect>
				<FSelect><Select value={roundType} placeholder="All stages" options={rounds.map((r) => [r.slug, r.name] as [string, string])} onChange={(e) => { setRoundType(e.target.value); reset(); }} /></FSelect>
				<FSelect><Select value={sector} placeholder="All sectors" options={sectors.topOptions} onChange={(e) => { setSector(e.target.value); reset(); }} /></FSelect>
				<FSelect><Select value={sport} placeholder="All sports" options={sportOptions} onChange={(e) => { setSport(e.target.value); reset(); }} /></FSelect>
				<FSelect><Select value={country} placeholder="All countries" options={COUNTRY_OPTIONS} onChange={(e) => { setCountry(e.target.value); reset(); }} /></FSelect>
				<FSelect minWidth={130}><Select value={launched} placeholder="Any launch year" options={SINCE_YEARS} onChange={(e) => { setLaunched(e.target.value); reset(); }} /></FSelect>
				<FSelect minWidth={130}><Select value={deals} placeholder="Any deal count" options={DEALS_BUCKETS} onChange={(e) => { setDeals(e.target.value); reset(); }} /></FSelect>
				<FSelect minWidth={130}><Select value={sort} options={SORT_OPTIONS} onChange={(e) => { setSort(e.target.value); reset(); }} /></FSelect>
				<FilterChip active={verified} onClick={() => { setVerified((v) => !v); reset(); }}>Verified</FilterChip>
				<FilterChip active={active} onClick={() => { setActive((v) => !v); reset(); }}>Actively investing</FilterChip>
				{anyFilter && <button className="atlas-btn atlas-btn--ghost atlas-btn--sm" onClick={clearAll}>Clear</button>}
			</div>
			{adv.hasAccess ? (
				<div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
					<FSelect><Select value={subSector} placeholder="All sub-sectors" options={sectors.subOptions} onChange={(e) => { setSubSector(e.target.value); reset(); }} /></FSelect>
					<FSelect><Select value={subSubSector} placeholder="All sub-sub-sectors" options={sectors.subSubOptions} onChange={(e) => { setSubSubSector(e.target.value); reset(); }} /></FSelect>
					<FSelect><Select value={techTag} placeholder="All tech tags" options={techTags} onChange={(e) => { setTechTag(e.target.value); reset(); }} /></FSelect>
					<FSelect><Select value={continent} placeholder="All continents" options={loc.continent} onChange={(e) => { setContinent(e.target.value); reset(); }} /></FSelect>
					<FSelect><Select value={region} placeholder="All regions" options={loc.region} onChange={(e) => { setRegion(e.target.value); reset(); }} /></FSelect>
					<FSelect><Select value={city} placeholder="All cities" options={loc.city} onChange={(e) => { setCity(e.target.value); reset(); }} /></FSelect>
				</div>
			) : adv.isLocked ? (
				<div style={{ marginBottom: 14 }}><LockedFilters requiredTier={adv.requiredTier} /></div>
			) : null}
			<div style={{ fontSize: 12, color: 'var(--a-faint)', marginBottom: 12 }}>{total.toLocaleString()} investor{total === 1 ? '' : 's'}</div>

			{all.isLoading && rows.length === 0 ? <Loading />
				: rows.length === 0 ? <Empty>No investors match your filters.</Empty>
					: <Grid>{rows.map((inv) => <InvestorCard key={inv.id} inv={inv} added={inPipeline.has(inv.id)} onAdd={() => onAdd(inv.id)} />)}</Grid>}

			{totalPages > 1 && (
				<div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8, marginTop: 22 }}>
					<span style={{ fontSize: 12, color: 'var(--a-faint)', marginRight: 6 }}>Page {page} of {totalPages}</span>
					<Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft size={14} /></Button>
					<Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}><ChevronRight size={14} /></Button>
				</div>
			)}
		</>
	);
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
	return (
		<button className="atlas-btn atlas-btn--outline atlas-btn--sm" aria-pressed={active} onClick={onClick}
			style={active ? { borderColor: 'var(--a-navy)', color: 'var(--a-navy)', background: 'var(--a-navy-soft)' } : undefined}>
			{children}
		</button>
	);
}

function InvestorCard({ inv, added, onAdd, reasons, onDismiss }: { inv: Investor; added: boolean; onAdd: () => void; reasons?: string[]; onDismiss?: () => void }) {
	const [busy, setBusy] = useState(false);
	const doAdd = async () => { setBusy(true); await onAdd(); setBusy(false); };
	return (
		<Card style={{ display: 'flex', flexDirection: 'column' }}>
			<div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
				<Logo co={{ name: inv.name, website: inv.website, custom_logo_url: inv.logo_url }} size={36} />
				<div style={{ minWidth: 0 }}>
					<div style={{ fontWeight: 600, fontSize: 15 }}>{inv.name}</div>
					{(inv.category || inv.hq_country) && (
						<div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--a-faint)', marginTop: 2 }}>
							{inv.category && <span>{inv.category}</span>}
							{inv.category && inv.hq_country && <span>·</span>}
							{inv.hq_country && <Flag cc={inv.hq_country} size={14} />}
							{inv.hq_country && <span>{inv.hq_country}</span>}
						</div>
					)}
				</div>
			</div>
			{inv.description && <div style={{ fontSize: 13, color: 'var(--a-muted)', lineHeight: 1.5, marginBottom: 10, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{inv.description}</div>}
			{reasons && reasons.length > 0 && (
				<div style={{ fontSize: 13, color: 'var(--a-muted)', lineHeight: 1.5, marginBottom: 12 }}>
					<span style={{ color: 'var(--a-ink)', fontWeight: 500 }}>Why Atlas recommends this: </span>{reasons.slice(0, 2).join('; ')}.
				</div>
			)}
			<div style={{ display: 'flex', gap: 8, marginTop: 'auto', alignItems: 'center', flexWrap: 'wrap' }}>
				{added
					? <Button variant="ghost" size="sm" disabled><Check size={13} /> In pipeline</Button>
					: <Button size="sm" disabled={busy} onClick={() => void doAdd()}>{busy ? <Loader2 className="spin" size={13} /> : <><Plus size={13} /> Add to pipeline</>}</Button>}
				{!added && onDismiss && <Button variant="outline" size="sm" onClick={onDismiss}>Not relevant</Button>}
				<Button href={`/raise/investors/${inv.id}`} variant="ghost" size="sm"><ExternalLink size={13} /> View profile</Button>
			</div>
		</Card>
	);
}

function Grid({ children }: { children: React.ReactNode }) { return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))', gap: 14 }}>{children}</div>; }

