'use client';

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import useSWR from 'swr';
import { qk } from '@/lib/query-keys';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { Input, Select, Loading, Empty } from '@/components/atlas/kit';
import { Logo, Flag } from '@/components/atlas/entity-logo';
import { CompanyDrawer } from '@/components/ui/company-drawer';
import {
	COUNTRY_OPTIONS, FilterChip, Pager, FSelect, LockedFilters,
	useSectorTierData, useSportOptions, useLocationFacetOptions, useTechTagOptions,
	FUNDING_BUCKETS, SINCE_YEARS,
} from '@/components/atlas/catalog';
import { useFeatureAccess } from '@/contexts/feature-access-context';
import { fmtUsd } from './market-shared';

interface Company {
	id: string; name: string; slug: string | null; website: string | null;
	custom_logo_url?: string | null; business_model?: string | null; description?: string | null;
	hq_country?: string | null; hq_city?: string | null; founded_year?: number | null;
	primary_sector?: string | null; primary_sport?: string | null; total_funding_usd?: string | number | null;
}

const PAGE_SIZE = 24;
const BUSINESS_MODELS: [string, string][] = [['b2b', 'B2B'], ['b2c', 'B2C'], ['b2b2c', 'B2B2C'], ['d2c', 'D2C'], ['b2g', 'B2G'], ['other', 'Other']];
const COMPANY_SORTS: [string, string][] = [['-created_at', 'Newest'], ['name', 'Name A–Z'], ['-total_funding', 'Most funded']];

/**
 * Market → Companies. The full sports-tech company database — the same search +
 * filter set as before, now rendered as list rows (per the design) with a slide-
 * over detail drawer.
 */
export function MarketCompanies() {
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
	const [openId, setOpenId] = useState<string | null>(null);
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
				<Input placeholder="Search companies by name, product or keyword" value={q} onChange={(e) => { setQ(e.target.value); reset(); }} style={{ paddingLeft: 34 }} />
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
			<div style={{ fontSize: 12, color: 'var(--a-faint)', marginBottom: 8 }}>{total.toLocaleString()} compan{total === 1 ? 'y' : 'ies'}</div>

			{all.isLoading && rows.length === 0 ? <Loading />
				: rows.length === 0 ? <Empty>No companies match your filters.</Empty>
					: <div className="mkt-list">{rows.map((c) => <CompanyRow key={c.id} c={c} onOpen={() => setOpenId(c.slug ?? c.id)} />)}</div>}

			<Pager page={page} totalPages={all.data?.totalPages ?? 1} onPage={setPage} />

			<CompanyDrawer idOrSlug={openId} onClose={() => setOpenId(null)} />
		</>
	);
}

function CompanyRow({ c, onOpen }: { c: Company; onOpen: () => void }) {
	const hq = [c.hq_city, c.hq_country].filter(Boolean).join(', ');
	const tags = [c.primary_sector, c.business_model ? c.business_model.toUpperCase() : null, c.primary_sport].filter(Boolean) as string[];
	const funding = fmtUsd(c.total_funding_usd == null ? null : Number(c.total_funding_usd));
	return (
		<div className="mkt-co">
			<Logo co={{ name: c.name, website: c.website, custom_logo_url: c.custom_logo_url }} size={38} />
			<div className="mkt-co-body">
				<div className="mkt-co-head">
					<span className="mkt-co-name">{c.name}</span>
					<span className="mkt-co-meta">
						{c.hq_country && <Flag cc={c.hq_country} size={13} />}
						{hq}{hq && c.founded_year ? ' · ' : ''}{c.founded_year ? `Founded ${c.founded_year}` : ''}
					</span>
				</div>
				{c.description && <div className="mkt-co-desc">{c.description}</div>}
				<div className="mkt-tags">
					{tags.map((t, i) => <span className="mkt-tag" key={i}>{t}</span>)}
					{funding !== '—' && <span className="mkt-tag">{funding} raised</span>}
				</div>
			</div>
			<button type="button" className="mkt-co-open" onClick={onOpen}>View company</button>
		</div>
	);
}
