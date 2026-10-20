'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { toast } from 'sonner';
import { Check, Plus, ArrowUpRight, X, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { ExportButton } from '@/components/features/exports/export-button';
import { qk } from '@/lib/query-keys';
import type { InvestorListItem as Investor } from '@/types/api';
import { apiRequest } from '@/lib/query-client';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { Button, Loading, Empty, Action, FilterBar, type FilterDef, Logo, Flag, ViewToggle, type ViewMode, lockedFiltersNote } from '@/components/atlas';
import { useSectorTierData, useSportOptions, useLocationFacetOptions, useTechTagOptions, useCountryOptions } from '@/hooks/use-catalog-options';
import { SINCE_YEARS, DEALS_BUCKETS, canonicalCountry } from '@/lib/catalog-options';
import { useFeatureAccess } from '@/contexts/feature-access-context';
import { useUserProfile, getUserType } from '@/hooks/use-user-profile';
import { useUrlSync, useUrlReader } from '@/hooks/use-url-state';
import { hrefOf } from '@/lib/routes';

/**
 * Raise investor views, shared by Discover → Recommended (/raise/discover/recommended)
 * and Raise → Investors (/raise/investors):
 *   • RecommendedInvestors — the investor-matching engine (/api/recommendations/investors),
 *     leading with the *reasons* Atlas matched them, not a mystery % score.
 *   • AllInvestors — the investor database with search + filters + pagination.
 * "Add to watchlist" posts to the raise pipeline (/api/raise/pipeline).
 */
interface Match { id: string; name: string; slug: string | null; website: string | null; logo_url?: string | null; hq_country?: string | null; category: string | null; description: string | null; score: number; match_reasons: string[] }
interface MatchResult { company: { id: string; name: string } | null; reason?: string; results: Match[] }

interface RoundRef { id: string; name: string; slug: string }

/**
 * The render contract for InvestorCard, which shows both directory rows
 * (`InvestorListItem`) and recommendation rows (`Match`). Those two carry
 * different field sets, so the card asks for the intersection it renders
 * rather than for a whole investor.
 */
type InvestorCardData = {
	id: string; name: string; website: string | null; description: string | null;
	category: string | null; logo_url?: string | null; hq_country?: string | null;
};

const PAGE_SIZE = 24;
// Firm-type enum → founder-facing label (mirrors the investors.category enum).
const CATEGORY_OPTIONS: [string, string][] = [
	['venture_capital', 'Venture Capital'], ['financial_services', 'Corporate VC'],
	['private_equity', 'Private Equity'], ['family_investment_office', 'Family Office'],
	['sovereign_wealth_fund', 'Sovereign Wealth Fund'], ['angel', 'Angel'], ['other', 'Other'],
];
const SORT_OPTIONS: [string, string][] = [['-created_at', 'Newest'], ['name', 'Name A–Z'], ['-deals', 'Most deals']];

/** Which investors are already on the watchlist, plus an add action that refreshes it.
 *  The watchlist (raise pipeline) is a Raise-only feature — the endpoint is
 *  `@RequireTier('raise')`, so a Scout browsing the shared Investors directory
 *  passes `enabled: false` and gets the directory without the add action. */
function useWatchlistAdd(enabled = true) {
	const pipe = useSWR<{ data: Array<{ investor_id: string | null }> }>(enabled ? qk.raise.pipeline() : null);
	const inPipeline = useMemo(() => new Set((pipe.data?.data ?? []).map((r) => r.investor_id).filter(Boolean) as string[]), [pipe.data]);
	const add = async (investorId: string) => {
		if (!enabled) return;
		try {
			await apiRequest('POST', '/api/raise/pipeline', { investor_id: investorId, stage: 'target' });
			toast.success('Added to watchlist');
			void pipe.mutate();
		} catch (e) { toast.error((e as Error).message); }
	};
	return { inPipeline, add };
}

export function RecommendedInvestors() {
	const { inPipeline, add } = useWatchlistAdd();
	const [view, setView] = useState<ViewMode>('cards');
	const [dismissed, setDismissed] = useState<Set<string>>(new Set());
	const matches = useSWR<MatchResult>(qk.investorMatches(24));
	const criteria = useSWR<{ criteria: { investor_types?: string[]; geographies?: string[]; cheque_min?: string | null; cheque_max?: string | null } | null }>(qk.raise.current());

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

	return (
		matches.isLoading ? <Loading />
			: matches.data?.reason === 'no_company_claim' || !matches.data?.company ? (
				<Empty>Atlas needs your company category to match investors. Set it under{' '}<Link href={hrefOf('raise-settings')} style={{ color: 'var(--a-navy)' }}>Thesis settings → Category</Link>.</Empty>
			) : (matches.data?.results.length ?? 0) === 0 ? <Empty>No matches yet. Broaden your investor criteria in setup.</Empty>
				: <>
					{criteriaSummary && (
						<div className="atlas-card atlas-card--glow" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap', padding: '16px 23px', marginBottom: 20 }}>
							<span style={{ fontSize: 13, color: 'var(--a-muted)' }}>{criteriaSummary}</span>
							<div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
								<ViewToggle value={view} onChange={setView} />
								<Button href={hrefOf('raise-settings')} variant="outline" size="sm">Edit criteria</Button>
							</div>
						</div>
					)}
					{!criteriaSummary && <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}><ViewToggle value={view} onChange={setView} /></div>}
					{view === 'cards' ? (
					<Grid>
						{matches.data!.results.filter((m) => !dismissed.has(m.id)).map((m) => (
							<InvestorCard key={m.id} inv={m} added={inPipeline.has(m.id)} onAdd={() => add(m.id)} reasons={m.match_reasons}
								onDismiss={() => setDismissed((s) => new Set(s).add(m.id))} />
						))}
					</Grid>
					) : (
					<div className="atlas-table" role="table">
						<div className="atlas-table__head">
							<span className="atlas-table__name">Investor</span>
							<span className="atlas-table__col hide-sm" style={{ width: 110 }}>Type</span>
							<span className="atlas-table__col hide-sm" style={{ width: 110 }}>Location</span>
							<span className="atlas-table__col" style={{ width: 60 }}>Score</span>
							<span className="atlas-table__col" style={{ width: 90 }}>Status</span>
						</div>
						{matches.data!.results.filter((m) => !dismissed.has(m.id)).map((m) => (
							<Link key={m.id} className="atlas-table__row" href={`${hrefOf('investors')}/${m.id}`}>
								<div className="atlas-table__name">
									<Logo co={{ name: m.name, website: m.website, custom_logo_url: m.logo_url }} size={28} radius={5} />
									<div className="atlas-table__name-main">
										<div className="atlas-ellipsis" style={{ fontWeight: 600 }}>{m.name}</div>
										{m.match_reasons?.[0] && <div style={{ fontSize: 11, color: 'var(--a-muted)' }} className="atlas-ellipsis">{m.match_reasons[0]}</div>}
									</div>
								</div>
								<span className="atlas-table__col hide-sm" style={{ width: 110 }}>{m.category ?? '—'}</span>
								<span className="atlas-table__col hide-sm" style={{ width: 110 }}>{m.hq_country ? canonicalCountry(m.hq_country) : '—'}</span>
								<span className="atlas-table__col" style={{ width: 60 }}>{m.score}%</span>
								<span className="atlas-table__col" style={{ width: 90 }}>{inPipeline.has(m.id) ? 'In watchlist' : '—'}</span>
							</Link>
						))}
					</div>
					)}
				</>
	);
}

export function AllInvestors() {
	// Shared by Raise and Scout. Only Raise keeps a pipeline ("watchlist"), so a
	// Scout gets the same directory with the add action and status column dropped.
	const { data: profile } = useUserProfile();
	const canWatchlist = getUserType(profile) === 'raise';
	const { inPipeline, add } = useWatchlistAdd(canWatchlist);
	return <AllInvestorsTab inPipeline={inPipeline} onAdd={add} canWatchlist={canWatchlist} />;
}

/** The "All investors" tab — search + filters + sort + pagination over /api/investors. */
function AllInvestorsTab({ inPipeline, onAdd, canWatchlist }: { inPipeline: Set<string>; onAdd: (id: string) => void; canWatchlist: boolean }) {
	// View-state mirrored into the URL (Back/Forward restore, shareable links).
	const url = useUrlReader();
	const [view, setView] = useState<ViewMode>('cards');
	const [q, setQ] = useState(() => url.str('q'));
	const dq = useDebouncedValue(q);
	const [category, setCategory] = useState(() => url.oneOf('category', CATEGORY_OPTIONS.map(([v]) => v), ''));
	const [roundType, setRoundType] = useState(() => url.str('round'));
	const [sector, setSector] = useState(() => url.str('sector'));
	const [subSector, setSubSector] = useState(() => url.str('sub'));
	const [subSubSector, setSubSubSector] = useState(() => url.str('subsub'));
	const [sport, setSport] = useState(() => url.str('sport'));
	const [country, setCountry] = useState(() => url.str('country'));
	const [city, setCity] = useState(() => url.str('city'));
	const [continent, setContinent] = useState(() => url.str('continent'));
	const [region, setRegion] = useState(() => url.str('region'));
	const [techTag, setTechTag] = useState(() => url.str('tech'));
	const [launched, setLaunched] = useState(() => url.str('launched'));
	const [deals, setDeals] = useState(() => url.str('deals'));
	const [verified, setVerified] = useState(() => url.bool('verified'));
	const [active, setActive] = useState(() => url.bool('active'));
	const [sort, setSort] = useState(() => url.oneOf('sort', SORT_OPTIONS.map(([v]) => v), '-created_at'));
	const [page, setPage] = useState(() => url.num('page', 1));
	const reset = () => setPage(1); // any filter/search change returns to page 1
	useUrlSync({
		q: dq, category, round: roundType, sector, sub: subSector, subsub: subSubSector,
		sport, country, city, continent, region, tech: techTag, launched, deals,
		verified, active,
		sort: sort !== '-created_at' ? sort : undefined,
		page: page > 1 ? page : undefined,
	});

	const roundsResp = useSWR<RoundRef[] | { data: RoundRef[] }>(qk.reference.roundTypes(), { dedupingInterval: 60 * 60_000 });
	const rounds = Array.isArray(roundsResp.data) ? roundsResp.data : (roundsResp.data?.data ?? []);
	const sectors = useSectorTierData();
	const sportOptions = useSportOptions();
	const countryOptions = useCountryOptions();
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

	// Same gate as the companies list, and for the same reason — see the
	// comment there. Only wait on an async input when it can change the key.
	const needsSectors = !!(sector || subSector || subSubSector);
	const needsAdv = !!(subSector || subSubSector || city || continent || region || techTag);
	const filtersReady = (!needsSectors || sectors.ready) && (!needsAdv || !adv.isLoading);
	const all = useSWR<{ data: Investor[]; total: number; totalPages: number }>(
		filtersReady ? qk.investors.list(params) : null,
		{ keepPreviousData: true },
	);
	const rows = all.data?.data ?? [];
	const total = all.data?.total ?? 0;
	const totalPages = all.data?.totalPages ?? 1;
	const anyFilter = !!(dq || category || roundType || sector || subSector || subSubSector || sport || country || city || continent || region || techTag || launched || deals || verified || active);
	const clearAll = () => { setQ(''); setCategory(''); setRoundType(''); setSector(''); setSubSector(''); setSubSubSector(''); setSport(''); setCountry(''); setCity(''); setContinent(''); setRegion(''); setTechTag(''); setLaunched(''); setDeals(''); setVerified(false); setActive(false); setSort('-created_at'); setPage(1); };
	// Filter defs for the toolbar — each change resets to page 1, as before.
	const sel = (key: string, label: string, value: string, options: [string, string][], set: (v: string) => void): FilterDef =>
		({ kind: 'select', key, label, value, options, onChange: (v) => { set(v); reset(); } });
	const tog = (key: string, label: string, value: boolean, set: (v: boolean) => void): FilterDef =>
		({ kind: 'toggle', key, label, value, onChange: (v) => { set(v); reset(); } });

	return (
		<>
			<FilterBar
				search={{ value: q, onChange: (v) => { setQ(v); reset(); }, placeholder: 'Search investors by name or website…' }}
				groups={[
					{ label: 'Industry & domain', filters: [
						sel('sector', 'Sectors', sector, sectors.topOptions, setSector),
						...(adv.hasAccess ? [
							sel('subSector', 'Sub-sectors', subSector, sectors.subOptions, setSubSector),
							sel('subSubSector', 'Sub-sub-sectors', subSubSector, sectors.subSubOptions, setSubSubSector),
							sel('techTag', 'Tech tags', techTag, techTags, setTechTag),
						] : []),
						sel('sport', 'Sports', sport, sportOptions, setSport),
					] },
					{ label: 'Geography & location', filters: [
						sel('country', 'Countries', country, countryOptions, setCountry),
						...(adv.hasAccess ? [
							sel('continent', 'Continents', continent, loc.continent, setContinent),
							sel('region', 'Regions', region, loc.region, setRegion),
							sel('city', 'Cities', city, loc.city, setCity),
						] : []),
					] },
					{ label: 'Profile & investment', filters: [
						sel('category', 'Firm types', category, CATEGORY_OPTIONS, setCategory),
						sel('roundType', 'Stages', roundType, rounds.map((r) => [r.slug, r.name] as [string, string]), setRoundType),
						sel('launched', 'Launch year', launched, SINCE_YEARS, setLaunched),
						sel('deals', 'Deal count', deals, DEALS_BUCKETS, setDeals),
					] },
					{ label: 'Status', filters: [
						tog('verified', 'Verified', verified, setVerified),
						tog('active', 'Actively investing', active, setActive),
					] },
					...(adv.isLocked ? [{ label: 'Advanced', filters: [], locked: lockedFiltersNote(adv.requiredTier) }] : []),
				]}
				sort={{ value: sort, options: SORT_OPTIONS, onChange: (v) => { setSort(v); reset(); } }}
				canClear={anyFilter}
				onClear={clearAll}
				count={`${total.toLocaleString()} investor${total === 1 ? '' : 's'}`}
				actions={<><ViewToggle value={view} onChange={setView} /><ExportButton entity="investors" search={dq} params={params} /></>}
			/>
			<div style={{ borderTop: '1px solid var(--a-border)', margin: '6px 0 30px' }} />

			{/* `!filtersReady` counts as loading — with a null key SWR reports
			    isLoading=false, which would show the empty state first. */}
			{(all.isLoading || !filtersReady) && rows.length === 0 ? <Loading />
				: rows.length === 0 ? <Empty>No investors match your filters.</Empty>
				: view === 'cards'
					? <Grid>{rows.map((inv) => <InvestorCard key={inv.id} inv={inv} added={inPipeline.has(inv.id)} onAdd={() => onAdd(inv.id)} canAdd={canWatchlist} />)}</Grid>
					: (
					<div className="atlas-table" role="table">
						<div className="atlas-table__head">
							<span className="atlas-table__name">Investor</span>
							<span className="atlas-table__col hide-sm" style={{ width: 110 }}>Type</span>
							<span className="atlas-table__col hide-sm" style={{ width: 110 }}>Location</span>
							<span className="atlas-table__col hide-sm" style={{ width: 60 }}>Deals</span>
							<span className="atlas-table__col hide-sm" style={{ width: 80 }}>Investments</span>
							<span className="atlas-table__col hide-sm" style={{ width: 70 }}>Launched</span>
							<span className="atlas-table__col" style={{ width: 90 }}>Status</span>
						</div>
						{rows.map((inv) => (
							<Link key={inv.id} className="atlas-table__row" href={`${hrefOf('investors')}/${inv.id}`}>
								<div className="atlas-table__name">
									<Logo co={{ name: inv.name, website: inv.website, custom_logo_url: inv.logo_url }} size={28} radius={5} />
									<div className="atlas-table__name-main">
										<div className="atlas-ellipsis" style={{ fontWeight: 600 }}>{inv.name}</div>
										{inv.description && <div style={{ fontSize: 11, color: 'var(--a-muted)' }} className="atlas-ellipsis">{inv.description}</div>}
									</div>
								</div>
								<span className="atlas-table__col hide-sm" style={{ width: 110 }}>{inv.category ?? '—'}</span>
								<span className="atlas-table__col hide-sm" style={{ width: 110 }}>{inv.hq_country ? canonicalCountry(inv.hq_country) : '—'}</span>
								<span className="atlas-table__col hide-sm" style={{ width: 60 }}>{inv.deals_count ?? '—'}</span>
								<span className="atlas-table__col hide-sm" style={{ width: 80 }}>{inv.num_investments ?? '—'}</span>
								<span className="atlas-table__col hide-sm" style={{ width: 70 }}>{inv.year_launched ?? '—'}</span>
								<span className="atlas-table__col" style={{ width: 90 }}>{inv.actively_investing ? 'Active' : inPipeline.has(inv.id) ? 'Watchlist' : '—'}</span>
							</Link>
						))}
					</div>
					)}

			{totalPages > 1 && (
				<div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8, marginTop: 22 }}>
					<span style={{ fontFamily: 'var(--a-mono)', fontSize: 10, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--a-muted)', marginRight: 6 }}>Page {page} of {totalPages}</span>
					<Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft size={14} /></Button>
					<Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}><ChevronRight size={14} /></Button>
				</div>
			)}
		</>
	);
}

function InvestorCard({ inv, added, onAdd, reasons, onDismiss, canAdd = true }: { inv: InvestorCardData; added: boolean; onAdd: () => void; reasons?: string[]; onDismiss?: () => void; canAdd?: boolean }) {
	const [busy, setBusy] = useState(false);
	const doAdd = async () => { setBusy(true); await onAdd(); setBusy(false); };
	return (
		<div className="atlas-card atlas-entity-card">
			<div className="atlas-entity-card__head">
				<Logo co={{ name: inv.name, website: inv.website, custom_logo_url: inv.logo_url }} size={62} radius={9} />
				<div style={{ minWidth: 0, paddingTop: 11 }}>
					{inv.category && <div className="atlas-entity-card__eyebrow">{inv.category}</div>}
					<Link href={`${hrefOf('investors')}/${inv.id}`} className="atlas-entity-card__name" style={{ textDecoration: 'none', color: 'inherit' }}>{inv.name}</Link>
					{inv.hq_country && (
						<div className="atlas-entity-card__meta"><Flag cc={inv.hq_country} size={11} /><span>{canonicalCountry(inv.hq_country)}</span></div>
					)}
				</div>
			</div>
			{inv.description && <div className="atlas-entity-card__desc">{inv.description}</div>}
			{reasons && reasons.length > 0 && (
				<div className="atlas-entity-card__desc" style={{ WebkitLineClamp: 4 }}>
					<span style={{ color: 'var(--a-ink)', fontWeight: 500 }}>Why Atlas recommends this: </span>{reasons.slice(0, 2).join('; ')}.
				</div>
			)}
			<div className="atlas-entity-card__actions">
				{canAdd && (added
					? <Action icon={<Check />} disabled>In watchlist</Action>
					: <Action icon={busy ? <Loader2 className="animate-spin" /> : <Plus />} disabled={busy} onClick={() => void doAdd()}>Add to watchlist</Action>)}
				<Action icon={<ArrowUpRight />} href={`${hrefOf('investors')}/${inv.id}`}>View profile</Action>
				{!added && onDismiss && <Action icon={<X />} onClick={onDismiss}>Not relevant</Action>}
			</div>
		</div>
	);
}

function Grid({ children }: { children: React.ReactNode }) { return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 240px), 1fr))', gap: 16 }}>{children}</div>; }

