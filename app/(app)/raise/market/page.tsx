'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, RefreshCw, Search } from 'lucide-react';
import { qk } from '@/lib/query-keys';
import { apiRequest } from '@/lib/query-client';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { Screen, H1, Card, Tabs, Button, Input, Select, Loading, Empty } from '@/components/atlas/kit';
import { Logo, Flag } from '@/components/atlas/entity-logo';
import { COUNTRY_OPTIONS, FilterChip, Pager, CardGrid, FSelect, LockedFilters, useSectorTierData, useSportOptions, useLocationFacetOptions, useTechTagOptions, FUNDING_BUCKETS, SINCE_YEARS } from '@/components/atlas/catalog';
import { useFeatureAccess } from '@/contexts/feature-access-context';

/**
 * Atlas Raise — Market. Two top-level tabs:
 *   • Analysis    — the founder's own market: LLM-estimated TAM/SAM + grounded
 *                   funding/CAGR/competitor aggregates for their sector.
 *   • All companies — browse the full sports-tech company database (search +
 *                   filters + pagination), reusing /api/companies.
 */
interface Grounded { sector?: string; total_funding_usd?: number; funded_companies?: number; companies_tracked?: number; deals?: number; funding_cagr_pct?: number | null }
interface Methodology { approach?: string; grounded?: Grounded; assumptions?: string[]; sources?: string[] }
interface Competitor { id: string; name: string; website?: string | null; custom_logo_url?: string | null; hq_country: string | null; funding: string }
interface Market {
	unavailable?: boolean; reason?: string;
	tam: string | null; sam: string | null; cagr: string | null;
	classification: string | null; insight_md: string | null;
	methodology: Methodology | null; competitors: Competitor[] | null; updated_at?: string;
}
interface Company {
	id: string; name: string; slug: string | null; website: string | null;
	custom_logo_url?: string | null; business_model?: string | null; description?: string | null;
	hq_country?: string | null; primary_sector?: string | null; total_funding_usd?: string | number | null;
}

const PAGE_SIZE = 24;
const BUSINESS_MODELS: [string, string][] = [['b2b', 'B2B'], ['b2c', 'B2C'], ['b2b2c', 'B2B2C'], ['d2c', 'D2C'], ['b2g', 'B2G'], ['other', 'Other']];
const COMPANY_SORTS: [string, string][] = [['-created_at', 'Newest'], ['name', 'Name A–Z'], ['-total_funding', 'Most funded']];

const eur = (v: string | null) => {
	if (v == null) return '—';
	const n = Number(v);
	return n >= 1e9 ? `EUR ${(n / 1e9).toFixed(1)}bn` : n >= 1e6 ? `EUR ${(n / 1e6).toFixed(0)}m` : `EUR ${n.toLocaleString()}`;
};
const usd = (n?: number | null) => (n == null ? '—' : n >= 1e9 ? `$${(n / 1e9).toFixed(1)}bn` : n >= 1e6 ? `$${(n / 1e6).toFixed(0)}m` : n > 0 ? `$${n.toLocaleString()}` : '—');

export default function RaiseMarketPage() {
	const [view, setView] = useState<'analysis' | 'companies'>('analysis');
	return (
		<Screen width={1400}>
			<H1>Market</H1>
			<div style={{ marginTop: 16 }}>
				<Tabs tabs={[{ key: 'analysis', label: 'Analysis' }, { key: 'companies', label: 'All companies' }]} value={view} onChange={setView} />
			</div>
			<div style={{ marginTop: 20 }}>
				{view === 'analysis' ? <MarketAnalysis /> : <AllCompaniesTab />}
			</div>
		</Screen>
	);
}

// ── Analysis tab ────────────────────────────────────────────────────────────
function MarketAnalysis() {
	const [tab, setTab] = useState<'size' | 'competitors'>('size');
	const [recomputing, setRecomputing] = useState(false);
	// Poll while the (async) TAM/SAM estimate is generating — capped so a
	// never-resolving estimate (LLM off / unparseable) doesn't poll forever.
	const [attempts, setAttempts] = useState(0);
	const { data, isLoading, mutate } = useSWR<Market>(qk.raise.market(), {
		refreshInterval: (d) => (d && !d.unavailable && d.tam == null && attempts < 6 ? 8000 : 0),
		onSuccess: (d) => setAttempts((a) => (d && !d.unavailable && d.tam == null ? a + 1 : 0)),
	});
	const estimating = !!data && !data.unavailable && data.tam == null && attempts < 6;
	const competitors = useMemo(() => data?.competitors ?? [], [data]);
	const g = data?.methodology?.grounded;

	const recompute = async () => {
		setRecomputing(true);
		try {
			const res = await apiRequest('GET', '/api/raise/market?force=1');
			if (!res.ok) throw new Error('Could not recompute');
			setAttempts(0);
			await mutate((await res.json()) as Market, { revalidate: false });
			toast.success('Market analysis recomputed');
		} catch (e) { toast.error((e as Error).message ?? 'Recompute failed'); }
		finally { setRecomputing(false); }
	};

	if (isLoading) return <Loading />;
	if (!data || data.unavailable) return (
		<Empty>Atlas needs your company category to map your market. Set it under{' '}
			<Link href="/raise/settings" style={{ color: 'var(--a-navy)' }}>Raise settings → Category</Link>.</Empty>
	);

	return (
		<>
			<div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}>
				<Button variant="outline" size="sm" disabled={recomputing} onClick={() => void recompute()}>
					{recomputing ? <Loader2 className="spin" size={13} /> : <RefreshCw size={13} />} Recompute
				</Button>
			</div>

			<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 13 }}>
				<Kpi label="Total market (TAM)" value={estimating || recomputing ? 'Estimating…' : eur(data.tam)} estimated={data.tam != null} />
				<Kpi label="Addressable market (SAM)" value={estimating || recomputing ? 'Estimating…' : eur(data.sam)} estimated={data.sam != null} />
				<Kpi label="Market growth" value={data.cagr != null ? `${Number(data.cagr).toFixed(1)}% CAGR` : '—'} />
				<Kpi label="Competitors tracked" value={String(g?.companies_tracked ?? competitors.length)} />
				<Kpi label="Total funding raised" value={usd(g?.total_funding_usd)} />
			</div>

			<div style={{ marginTop: 28 }}>
				<Tabs tabs={[{ key: 'size', label: 'Market size' }, { key: 'competitors', label: 'Competitors' }]} value={tab} onChange={setTab} />
			</div>

			{tab === 'size' ? (
				<div style={{ marginTop: 20, display: 'grid', gap: 18 }}>
					{data.classification && (
						<Card focus style={{ padding: '18px 24px' }}>
							<div style={{ fontSize: 13, color: 'var(--a-muted)' }}>Your market classification</div>
							<div style={{ fontSize: 15, fontWeight: 600, marginTop: 10 }}>{data.classification}</div>
						</Card>
					)}
					{data.insight_md && (
						<Card focus style={{ padding: '20px 24px 24px' }}>
							<div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Market insights</div>
							<p style={{ margin: 0, fontSize: 13, color: 'var(--a-muted)', lineHeight: 1.6 }}>{data.insight_md}</p>
						</Card>
					)}
					<Card style={{ padding: '20px 24px' }}>
						<div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>How these figures are derived</div>
						{data.methodology?.approach && <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--a-muted)', lineHeight: 1.5 }}>{data.methodology.approach}</p>}
						{g && (
							<div style={{ fontSize: 12, color: 'var(--a-muted)', display: 'grid', gap: 4, marginBottom: 12 }}>
								<span><strong style={{ color: 'var(--a-ink)' }}>Grounded (from our dataset):</strong> {usd(g.total_funding_usd)} raised · {g.funded_companies ?? 0} funded of {g.companies_tracked ?? 0} companies · {g.deals ?? 0} deals{g.funding_cagr_pct != null ? ` · funding CAGR ${g.funding_cagr_pct}%` : ''}.</span>
							</div>
						)}
						{(data.methodology?.assumptions?.length ?? 0) > 0 && (
							<div style={{ marginBottom: 10 }}>
								<div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Assumptions</div>
								<ul style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 4 }}>{data.methodology!.assumptions!.map((a, i) => <li key={i} style={{ fontSize: 12, color: 'var(--a-muted)', lineHeight: 1.5 }}>{a}</li>)}</ul>
							</div>
						)}
						<div style={{ fontSize: 11, color: 'var(--a-faint)', marginTop: 8 }}>TAM/SAM are estimates; funding, competitor counts and CAGR are computed from SportsTechX data.</div>
					</Card>
				</div>
			) : (
				<div style={{ marginTop: 20 }}>
					{competitors.length === 0 ? <Empty>No competitors mapped yet.</Empty> : (
						<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
							{competitors.map((c) => (
								<Card key={c.id} style={{ padding: 16, minHeight: 110 }}>
									<div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
										<Logo co={{ name: c.name, website: c.website, custom_logo_url: c.custom_logo_url }} size={36} />
										<div><div style={{ fontSize: 14, fontWeight: 600 }}>{c.name}</div>{c.hq_country && <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--a-faint)', marginTop: 4 }}><Flag cc={c.hq_country} size={14} />{c.hq_country}</div>}</div>
									</div>
									<div style={{ fontSize: 12, color: 'var(--a-muted)', marginTop: 14 }}>{c.funding}</div>
								</Card>
							))}
						</div>
					)}
				</div>
			)}
		</>
	);
}

function Kpi({ label, value, estimated }: { label: string; value: string; estimated?: boolean }) {
	return (
		<div className="atlas-stat">
			<div className="atlas-stat__label">{label}{estimated && <span style={{ color: 'var(--a-faint)', fontWeight: 400 }}> · est.</span>}</div>
			<div className="atlas-stat__value">{value}</div>
		</div>
	);
}

// ── All companies tab ───────────────────────────────────────────────────────
function AllCompaniesTab() {
	const [q, setQ] = useState('');
	const dq = useDebouncedValue(q);
	const [model, setModel] = useState('');
	const [sector, setSector] = useState('');
	const [subSector, setSubSector] = useState('');
	const [subSubSector, setSubSubSector] = useState('');
	const [sport, setSport] = useState('');
	const [country, setCountry] = useState('');
	const [city, setCity] = useState('');
	const [continent, setContinent] = useState('');
	const [region, setRegion] = useState('');
	const [techTag, setTechTag] = useState('');
	const [funding, setFunding] = useState('');
	const [founded, setFounded] = useState('');
	const [verified, setVerified] = useState(false);
	const [raising, setRaising] = useState(false);
	const [unicorn, setUnicorn] = useState(false);
	const [sort, setSort] = useState('-created_at');
	const [page, setPage] = useState(1);
	const reset = () => setPage(1);
	const sectors = useSectorTierData();
	const sportOptions = useSportOptions();
	const loc = useLocationFacetOptions();
	const techTags = useTechTagOptions();
	const adv = useFeatureAccess('advanced_filters');

	const params = useMemo(() => {
		const p: Record<string, unknown> = { page, limit: PAGE_SIZE, sort };
		const term = dq.trim().slice(0, 120);
		if (term) p.q = term;
		if (model) p.business_model = model;
		const secSlug = sectors.sectorSlug(sector, adv.hasAccess ? subSector : '', adv.hasAccess ? subSubSector : '');
		if (secSlug) p.sector_slug = secSlug;
		if (sport) p.sport_id = sport;
		if (country) p.country = country;
		if (funding) p.min_funding = funding;
		if (founded) p.founded_year_min = founded;
		if (verified) p.is_verified = true;
		if (raising) p.is_actively_raising = true;
		if (unicorn) p.is_unicorn = true;
		// Advanced (gated) — only applied when the tier includes advanced_filters.
		if (adv.hasAccess) {
			if (city) p.city = city;
			if (continent) p.continent = continent;
			if (region) p.region = region;
			if (techTag) p.tech_tag_slug = techTag;
		}
		return p;
	}, [page, sort, dq, model, sectors, sector, subSector, subSubSector, sport, country, funding, founded, verified, raising, unicorn, adv.hasAccess, city, continent, region, techTag]);

	const all = useSWR<{ data: Company[]; total: number; totalPages: number }>(qk.companies.list(params), { keepPreviousData: true });
	const rows = all.data?.data ?? [];
	const total = all.data?.total ?? 0;
	const anyFilter = !!(dq || model || sector || subSector || subSubSector || sport || country || city || continent || region || techTag || funding || founded || verified || raising || unicorn);
	const clearAll = () => { setQ(''); setModel(''); setSector(''); setSubSector(''); setSubSubSector(''); setSport(''); setCountry(''); setCity(''); setContinent(''); setRegion(''); setTechTag(''); setFunding(''); setFounded(''); setVerified(false); setRaising(false); setUnicorn(false); setSort('-created_at'); setPage(1); };

	return (
		<>
			<div style={{ position: 'relative', marginBottom: 12 }}>
				<Search size={14} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--a-faint)', pointerEvents: 'none' }} />
				<Input placeholder="Search companies by name or website" value={q} onChange={(e) => { setQ(e.target.value); reset(); }} style={{ paddingLeft: 34 }} />
			</div>
			<div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
				<FSelect><Select value={sector} placeholder="All sectors" options={sectors.topOptions} onChange={(e) => { setSector(e.target.value); reset(); }} /></FSelect>
				<FSelect><Select value={sport} placeholder="All sports" options={sportOptions} onChange={(e) => { setSport(e.target.value); reset(); }} /></FSelect>
				<FSelect><Select value={model} placeholder="All business models" options={BUSINESS_MODELS} onChange={(e) => { setModel(e.target.value); reset(); }} /></FSelect>
				<FSelect><Select value={country} placeholder="All countries" options={COUNTRY_OPTIONS} onChange={(e) => { setCountry(e.target.value); reset(); }} /></FSelect>
				<FSelect minWidth={130}><Select value={funding} placeholder="Any funding" options={FUNDING_BUCKETS} onChange={(e) => { setFunding(e.target.value); reset(); }} /></FSelect>
				<FSelect minWidth={130}><Select value={founded} placeholder="Any founding year" options={SINCE_YEARS} onChange={(e) => { setFounded(e.target.value); reset(); }} /></FSelect>
				<FSelect minWidth={130}><Select value={sort} options={COMPANY_SORTS} onChange={(e) => { setSort(e.target.value); reset(); }} /></FSelect>
				<FilterChip active={verified} onClick={() => { setVerified((v) => !v); reset(); }}>Verified</FilterChip>
				<FilterChip active={raising} onClick={() => { setRaising((v) => !v); reset(); }}>Raising now</FilterChip>
				<FilterChip active={unicorn} onClick={() => { setUnicorn((v) => !v); reset(); }}>Unicorn</FilterChip>
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
			<div style={{ fontSize: 12, color: 'var(--a-faint)', marginBottom: 12 }}>{total.toLocaleString()} compan{total === 1 ? 'y' : 'ies'}</div>

			{all.isLoading && rows.length === 0 ? <Loading />
				: rows.length === 0 ? <Empty>No companies match your filters.</Empty>
					: <CardGrid>{rows.map((c) => <CompanyCard key={c.id} c={c} />)}</CardGrid>}

			<Pager page={page} totalPages={all.data?.totalPages ?? 1} onPage={setPage} />
		</>
	);
}

function CompanyCard({ c }: { c: Company }) {
	const meta = [c.business_model ? c.business_model.toUpperCase() : null, c.primary_sector].filter(Boolean).join(' · ');
	const funding = usd(c.total_funding_usd == null ? null : Number(c.total_funding_usd));
	return (
		<Card style={{ display: 'flex', flexDirection: 'column' }}>
			<div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
				<Logo co={{ name: c.name, website: c.website, custom_logo_url: c.custom_logo_url }} size={36} />
				<div style={{ minWidth: 0 }}>
					<div style={{ fontWeight: 600, fontSize: 15 }}>{c.name}</div>
					{(meta || c.hq_country) && (
						<div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--a-faint)', marginTop: 2, flexWrap: 'wrap' }}>
							{meta && <span>{meta}</span>}
							{meta && c.hq_country && <span>·</span>}
							{c.hq_country && <Flag cc={c.hq_country} size={13} />}
							{c.hq_country && <span>{c.hq_country}</span>}
						</div>
					)}
				</div>
			</div>
			{c.description && <div style={{ fontSize: 13, color: 'var(--a-muted)', lineHeight: 1.5, marginBottom: 10, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{c.description}</div>}
			<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 'auto' }}>
				<span style={{ fontSize: 12, color: 'var(--a-muted)' }}>{funding !== '—' ? `${funding} raised` : ''}</span>
				{c.website && <a className="atlas-btn atlas-btn--ghost atlas-btn--sm" href={c.website} target="_blank" rel="noreferrer">Website</a>}
			</div>
		</Card>
	);
}
