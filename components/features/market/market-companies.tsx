'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Globe, ArrowUpRight } from 'lucide-react';
import useSWR from 'swr';
import { qk } from '@/lib/query-keys';
import type { CompanyListItem as Company } from '@/types/api';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { Loading, Empty, Action, FilterBar, type FilterDef, Logo, Flag, Pager, lockedFiltersNote } from '@/components/atlas';
import { COUNTRY_OPTIONS, FUNDING_BUCKETS, SINCE_YEARS } from '@/lib/catalog-options';
import { useSectorTierData, useSportOptions, useLocationFacetOptions, useTechTagOptions } from '@/hooks/use-catalog-options';
import { fmtUsd } from './format';
import dynamic from 'next/dynamic';
// ~650 lines (plus the watchlist picker and drawer primitive it pulls in) for a
// panel that only opens on a row click, and only in the drawer variant.
const CompanyDrawer = dynamic(() => import('@/components/ui/company-drawer').then((m) => m.CompanyDrawer), { ssr: false });
import './company-drawer-atlas.css';
import { useFeatureAccess } from '@/contexts/feature-access-context';
import './market.css';



const PAGE_SIZE = 24;
const BUSINESS_MODELS: [string, string][] = [['b2b', 'B2B'], ['b2c', 'B2C'], ['b2b2c', 'B2B2C'], ['d2c', 'D2C'], ['b2g', 'B2G'], ['other', 'Other']];
const COMPANY_SORTS: [string, string][] = [['-created_at', 'Newest'], ['name', 'Name A–Z'], ['-total_funding', 'Most funded']];

/**
 * Market → Companies. The full sports-tech company database — the same search +
 * filter set as before, now rendered as list rows (per the design) with a slide-
 * over detail drawer.
 */
/** `companyHref` → rows link to a company profile page; omitted → rows open the side drawer. */
export function MarketCompanies({ companyHref }: { companyHref?: (idOrSlug: string) => string } = {}) {
	// Deep links (e.g. from the framework or Scout) can preselect ?q=, ?sector=<pillar>&sub=<category>.
	const searchParams = useSearchParams();
	const [q, setQ] = useState(() => searchParams.get('q') ?? '');
	const dq = useDebouncedValue(q);
	const [model, setModel] = useState('');
	const [sector, setSector] = useState(() => searchParams.get('sector') ?? '');
	const [subSector, setSubSector] = useState(() => searchParams.get('sub') ?? '');
	const [subSubSector, setSubSubSector] = useState(() => searchParams.get('subsub') ?? '');
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

	// Two inputs to `params` resolve asynchronously, and each can add a key to
	// the query once it lands: the sector hierarchy (which turns a `?sector=`
	// into a `sector_slug`) and the entitlement check (which lets the advanced
	// `?sub=`/`?subsub=`/location params in at all). Firing before they settle
	// means one request without the filter and a second with it.
	//
	// Only wait on each when it can actually change the key. With no such
	// filter selected the params are value-identical either way — SWR hashes
	// array keys structurally — so the common arrival is not delayed at all,
	// and a hung reference fetch can never strand the list behind a spinner.
	const needsSectors = !!(sector || subSector || subSubSector);
	const needsAdv = !!(subSector || subSubSector || city || continent || region || techTag);
	const filtersReady = (!needsSectors || sectors.ready) && (!needsAdv || !adv.isLoading);
	const all = useSWR<{ data: Company[]; total: number; totalPages: number }>(
		filtersReady ? qk.companies.list(params) : null,
		{ keepPreviousData: true },
	);
	const rows = all.data?.data ?? [];
	const total = all.data?.total ?? 0;
	const anyFilter = !!(dq || model || sector || subSector || subSubSector || sport || country || city || continent || region || techTag || funding || founded || verified || raising || unicorn);
	const clearAll = () => { setQ(''); setModel(''); setSector(''); setSubSector(''); setSubSubSector(''); setSport(''); setCountry(''); setCity(''); setContinent(''); setRegion(''); setTechTag(''); setFunding(''); setFounded(''); setVerified(false); setRaising(false); setUnicorn(false); setSort('-created_at'); setPage(1); };
	// Filter defs for the toolbar — each change resets to page 1, as before.
	const sel = (key: string, label: string, value: string, options: [string, string][], set: (v: string) => void): FilterDef =>
		({ kind: 'select', key, label, value, options, onChange: (v) => { set(v); reset(); } });
	const tog = (key: string, label: string, value: boolean, set: (v: boolean) => void): FilterDef =>
		({ kind: 'toggle', key, label, value, onChange: (v) => { set(v); reset(); } });

	return (
		<>
			<FilterBar
				search={{ value: q, onChange: (v) => { setQ(v); reset(); }, placeholder: 'Search companies' }}
				groups={[
					{ label: 'Industry & domain', filters: [
						sel('sector', 'Sector', sector, sectors.topOptions, setSector),
						...(adv.hasAccess ? [
							sel('subSector', 'Sub-sector', subSector, sectors.subOptions, setSubSector),
							sel('subSubSector', 'Sub-sub-sector', subSubSector, sectors.subSubOptions, setSubSubSector),
							sel('techTag', 'Tech tag', techTag, techTags, setTechTag),
						] : []),
						sel('sport', 'Sport', sport, sportOptions, setSport),
					] },
					{ label: 'Geography & location', filters: [
						sel('country', 'Country', country, COUNTRY_OPTIONS, setCountry),
						...(adv.hasAccess ? [
							sel('continent', 'Continent', continent, loc.continent, setContinent),
							sel('region', 'Region', region, loc.region, setRegion),
							sel('city', 'City', city, loc.city, setCity),
						] : []),
					] },
					{ label: 'Profile & funding', filters: [
						sel('model', 'Business model', model, BUSINESS_MODELS, setModel),
						sel('funding', 'Funding', funding, FUNDING_BUCKETS, setFunding),
						sel('founded', 'Founded', founded, SINCE_YEARS, setFounded),
					] },
					{ label: 'Status', filters: [
						tog('verified', 'Verified', verified, setVerified),
						tog('raising', 'Raising now', raising, setRaising),
						tog('unicorn', 'Unicorn', unicorn, setUnicorn),
					] },
					...(adv.isLocked ? [{ label: 'Advanced', filters: [], locked: lockedFiltersNote(adv.requiredTier) }] : []),
				]}
				sort={{ value: sort, options: COMPANY_SORTS, onChange: (v) => { setSort(v); reset(); } }}
				canClear={anyFilter}
				onClear={clearAll}
			/>

			{/* `!filtersReady` counts as loading: the key is still null then, so
			    SWR reports isLoading=false and this would fall through to
			    "No companies match your filters" before the first request. */}
			{(all.isLoading || !filtersReady) && rows.length === 0 ? <Loading />
				: rows.length === 0 ? <Empty>No companies match your filters.</Empty>
					: (
						<div className="atlas-card atlas-chart-card" style={{ marginTop: 10 }}>
							<div className="atlas-chart-card__head" style={{ padding: '17px 25px 16px', fontSize: 13, color: 'var(--a-muted)' }}>
								{total.toLocaleString()} compan{total === 1 ? 'y' : 'ies'}{anyFilter ? ' match your filters' : ' · Filter to refine results'}
							</div>
							<div className="mkt-list">{rows.map((c) => <CompanyRow key={c.id} c={c} href={companyHref?.(c.slug ?? c.id)} onOpen={() => setOpenId(c.slug ?? c.id)} />)}</div>
						</div>
					)}

			<Pager page={page} totalPages={all.data?.totalPages ?? 1} onPage={setPage} />

			{!companyHref && <CompanyDrawer idOrSlug={openId} onClose={() => setOpenId(null)} />}
		</>
	);
}

function CompanyRow({ c, href, onOpen }: { c: Company; href?: string; onOpen: () => void }) {
	const hq = [c.hq_city, c.hq_country].filter(Boolean).join(', ');
	const tags = [c.primary_sector, c.business_model ? c.business_model.toUpperCase() : null, c.primary_sport].filter(Boolean) as string[];
	const funding = fmtUsd(c.total_funding_usd == null ? null : Number(c.total_funding_usd));
	return (
		<div className="mkt-co">
			<Logo co={{ name: c.name, website: c.website, custom_logo_url: c.custom_logo_url }} size={72} radius={9} />
			<div className="mkt-co-body">
				<div className="mkt-co-head">
					{href ? <Link href={href} className="mkt-co-name mkt-co-name--link">{c.name}</Link> : <span className="mkt-co-name">{c.name}</span>}
					<span className="mkt-co-meta">
						{c.hq_country && <Flag cc={c.hq_country} size={11} />}
						{hq}{hq && c.founded_year ? ' · ' : ''}{c.founded_year ? `Founded ${c.founded_year}` : ''}
					</span>
				</div>
				{c.description && <div className="mkt-co-desc">{c.description}</div>}
				<div className="mkt-tags">
					{tags.map((t, i) => <span className="mkt-tag" key={i}>{t}</span>)}
					{funding !== '—' && <span className="mkt-tag">{funding} raised</span>}
				</div>
			</div>
			<div className="mkt-co-actions">
				{c.website && <Action icon={<Globe />} href={c.website.startsWith('http') ? c.website : `https://${c.website}`} external>Website</Action>}
				{href ? <Action icon={<ArrowUpRight />} href={href}>View company</Action> : <Action icon={<ArrowUpRight />} onClick={onOpen}>View company</Action>}
			</div>
		</div>
	);
}
