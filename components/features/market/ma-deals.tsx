'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { ExportButton } from '@/components/features/exports/export-button';
import { qk } from '@/lib/query-keys';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useSectorTierData, useCountryOptions, useSportOptions, useLocationFacetOptions } from '@/hooks/use-catalog-options';
import { useFeatureAccess } from '@/contexts/feature-access-context';

import { BUSINESS_MODELS, SINCE_YEARS, canonicalCountry } from '@/lib/catalog-options';
import { Empty, FilterBar, Loading, Logo, Flag, Pager, type FilterDef, lockedFiltersNote } from '@/components/atlas';
import { fmtUsd } from '@/components/features/market/format';
import { companyHref } from '@/lib/routes';
import { MaDealPanel } from '@/components/features/market/ma-deal-panel';
import { useUrlSync, useUrlReader, useUrlModal, isUuid } from '@/hooks/use-url-state';

/**
 * M&A — a tabulated list of acquisitions (GET /api/acquisitions), newest first.
 * Columns mirror the hub's M&A Tracker: Company (acquiree) · Sector · Location ·
 * Acquirer · Announced · Value. Only the acquiree is enriched against our
 * companies table (logo, website, slug); the acquirer is a name + slug, so it
 * shows initials unless it too is a company we hold.
 */

/** One acquisition row, as /api/acquisitions returns it. The list SELECT is
 *  `f.*` (every raw acquisition column) plus the joined acquiree enrichments,
 *  so the row already carries the acquirer snapshot and both business models —
 *  enough to render the detail panel without a second fetch. */
export interface MaDeal {
	id: string;
	acquiree_name: string | null;
	acquiree_slug: string | null;
	acquiree_website: string | null;
	acquiree_website_snapshot: string | null;
	acquiree_logo: string | null;
	acquiree_business_model: string | null;
	acquirer_name: string | null;
	acquirer_slug: string | null;
	acquirer_website_snapshot: string | null;
	acquirer_business_model: string | null;
	primary_sector: string | null;
	hq_country: string | null;
	hq_city: string | null;
	acquisition_date: string | null;
	acquisition_year: number | null;
	acquisition_type: string | null;
	amount_usd: number | string | null;
	currency_code: string | null;
	source_url: string | null;
}

const PAGE_SIZE = 25;
const TYPE_OPTIONS: [string, string][] = [['acquisition', 'Acquisition'], ['merger', 'Merger'], ['asset_purchase', 'Asset purchase']];
const TYPE_LABEL = new Map(TYPE_OPTIONS);
const SORTS: [string, string][] = [['-acquisition_date', 'Newest'], ['-amount_usd', 'Largest value'], ['acquiree_name', 'Company A–Z']];
const fmtMonth = (d?: string | null) => (d ? new Date(d).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : '—');
const fmtValue = (n: MaDeal['amount_usd']) => (n == null || Number(n) === 0 ? 'Undisclosed' : fmtUsd(Number(n)));

/**
 * The filters one side of a deal carries — the acquired company and the
 * acquirer get the same set, as on the old Intelligence Hub. The server keeps
 * both sides' sector / location / model / sport on every acquisition.
 */
interface Side { sector: string; sport: string; country: string; model: string; st: boolean; city: string; continent: string; region: string }
const NO_SIDE: Side = { sector: '', sport: '', country: '', model: '', st: false, city: '', continent: '', region: '' };
type UrlReader = ReturnType<typeof useUrlReader>;
/** URL keys: the acquired company keeps the bare names (old links still work), the acquirer is `acq_*`. */
const readSide = (url: UrlReader, p: '' | 'acq_'): Side => ({
	sector: url.str(`${p}sector`), sport: url.str(`${p}sport`), country: url.str(`${p}country`),
	model: url.oneOf(`${p}model`, BUSINESS_MODELS.map(([v]) => v), ''), st: url.bool(`${p}st`),
	city: url.str(`${p}city`), continent: url.str(`${p}continent`), region: url.str(`${p}region`),
});
const sideUrl = (s: Side, p: '' | 'acq_') => ({
	[`${p}sector`]: s.sector, [`${p}sport`]: s.sport, [`${p}country`]: s.country, [`${p}model`]: s.model,
	[`${p}st`]: s.st || undefined, [`${p}city`]: s.city, [`${p}continent`]: s.continent, [`${p}region`]: s.region,
});
/** Is any filter on this side in effect? City/continent/region count only with
 *  advanced access — without it they're neither sent nor shown as pills. */
const sideActive = (s: Side, adv: boolean) => !!(s.sector || s.sport || s.country || s.model || s.st || (adv && (s.city || s.continent || s.region)));

export function MaDeals() {
	// View-state in the URL (Back/Forward restore, shareable).
	const url = useUrlReader();
	const [q, setQ] = useState(() => url.str('q'));
	const dq = useDebouncedValue(q);
	const [type, setType] = useState(() => url.oneOf('type', TYPE_OPTIONS.map(([v]) => v), ''));
	const [target, setTarget] = useState<Side>(() => readSide(url, ''));
	const [buyer, setBuyer] = useState<Side>(() => readSide(url, 'acq_'));
	const [year, setYear] = useState(() => url.oneOf('year', SINCE_YEARS.map(([v]) => v), ''));
	const [disclosed, setDisclosed] = useState(() => url.bool('disclosed'));
	const [sort, setSort] = useState(() => url.oneOf('sort', SORTS.map(([v]) => v), '-acquisition_date'));
	const [page, setPage] = useState(() => url.num('page', 1));
	// The detail panel is addressable (?deal=<uuid>) for deals on the loaded page.
	// The id must be a UUID or the param is ignored.
	const [dealId, setDealId] = useUrlModal('deal', { validate: isUuid });
	const reset = () => setPage(1);
	useUrlSync({
		q: dq, type, year, disclosed, ...sideUrl(target, ''), ...sideUrl(buyer, 'acq_'),
		sort: sort !== '-acquisition_date' ? sort : undefined,
		page: page > 1 ? page : undefined,
	});

	const sectors = useSectorTierData();
	const countryOptions = useCountryOptions();
	const sportOptions = useSportOptions();
	const loc = useLocationFacetOptions();
	// City / continent / region are advanced filters, as on Companies.
	const adv = useFeatureAccess('advanced_filters');

	const params = useMemo(() => {
		const p: Record<string, unknown> = { page, limit: PAGE_SIZE, sort };
		const term = dq.trim().slice(0, 120);
		if (term) p.q = term;
		if (type) p.acquisition_type = type;
		if (year) p.year_min = year;
		if (disclosed) p.disclosed_only = true;
		// Per side. The API's location params are bare for the acquired company
		// (`country`) and `acquirer_*` for the buyer.
		for (const [s, side, locKey] of [[target, 'acquiree', ''], [buyer, 'acquirer', 'acquirer_']] as const) {
			const secSlug = sectors.sectorSlug(s.sector, '', '');
			if (secSlug) p[`${side}_sector_slug`] = secSlug;
			if (s.sport) p[`${side}_sport_id`] = s.sport;
			if (s.model) p[`${side}_business_model`] = s.model;
			if (s.st) p[`${side}_is_sportstech`] = true;
			if (s.country) p[`${locKey}country`] = s.country;
			if (adv.hasAccess) {
				if (s.city) p[`${locKey}city`] = s.city;
				if (s.continent) p[`${locKey}continent`] = s.continent;
				if (s.region) p[`${locKey}region`] = s.region;
			}
		}
		return p;
	}, [page, sort, dq, type, year, disclosed, sectors, target, buyer, adv.hasAccess]);

	// Only wait on the async sector catalog when a sector is actually selected —
	// with no sector the key is stable and SWR can fetch immediately.
	const filtersReady = !(target.sector || buyer.sector) || sectors.ready;
	const res = useSWR<{ data: MaDeal[]; total: number; totalPages: number }>(
		filtersReady ? qk.acquisitions.list(params) : null,
		{ keepPreviousData: true },
	);
	const rows = res.data?.data ?? [];
	const total = res.data?.total ?? 0;
	// Panel content is the row matching ?deal=; closes automatically on Back.
	// If the deal isn't on the loaded page (a shared/pasted link, or a different
	// page/filter), fetch it directly so the deep link still opens the panel.
	const inRows = useMemo(() => rows.find((r) => r.id === dealId) ?? null, [rows, dealId]);
	const detail = useSWR<MaDeal>(dealId && !inRows ? qk.acquisitions.detail(dealId) : null);
	const selected = inRows ?? detail.data ?? null;
	const anyFilter = !!(dq || type || year || disclosed || sideActive(target, adv.hasAccess) || sideActive(buyer, adv.hasAccess));

	const sel = (key: string, label: string, value: string, options: [string, string][], set: (v: string) => void): FilterDef =>
		({ kind: 'select', key, label, value, options, onChange: (v) => { set(v); reset(); } });
	// One side's filters. Labels name the side ("Acquirer sector") because the
	// active-filter pills show the label without the group heading.
	const sideFilters = (s: Side, set: (fn: (s: Side) => Side) => void, p: '' | 'acq_', who: string): FilterDef[] => {
		const on = (k: keyof Side) => (v: string) => set((x) => ({ ...x, [k]: v }));
		return [
			sel(`${p}sector`, `${who} sector`, s.sector, sectors.topOptions, on('sector')),
			sel(`${p}sport`, `${who} sport`, s.sport, sportOptions, on('sport')),
			sel(`${p}country`, `${who} country`, s.country, countryOptions, on('country')),
			...(adv.hasAccess ? [
				sel(`${p}continent`, `${who} continent`, s.continent, loc.continent, on('continent')),
				sel(`${p}region`, `${who} region`, s.region, loc.region, on('region')),
				sel(`${p}city`, `${who} city`, s.city, loc.city, on('city')),
			] : []),
			sel(`${p}model`, `${who} business model`, s.model, BUSINESS_MODELS, on('model')),
			{ kind: 'toggle', key: `${p}st`, label: `${who} is SportsTech`, value: s.st, onChange: (v) => { set((x) => ({ ...x, st: v })); reset(); } },
		];
	};

	return (
		<>
			<FilterBar
				search={{ value: q, onChange: (v) => { setQ(v); reset(); }, placeholder: 'Search by company or acquirer…' }}
				groups={[
					{ label: 'Acquired company', filters: sideFilters(target, setTarget, '', 'Company') },
					{ label: 'Acquirer', filters: sideFilters(buyer, setBuyer, 'acq_', 'Acquirer') },
					{ label: 'Deal', filters: [
						sel('type', 'Type', type, TYPE_OPTIONS, setType),
						sel('year', 'Since', year, SINCE_YEARS, setYear),
						{ kind: 'toggle', key: 'disclosed', label: 'Disclosed value only', value: disclosed, onChange: (v) => { setDisclosed(v); reset(); } },
					] },
					...(adv.isLocked ? [{ label: 'Advanced', filters: [], locked: lockedFiltersNote(adv.requiredTier) }] : []),
				]}
				sort={{ value: sort, options: SORTS, onChange: (v) => { setSort(v); reset(); } }}
				canClear={anyFilter}
				onClear={() => { setQ(''); setType(''); setTarget(NO_SIDE); setBuyer(NO_SIDE); setYear(''); setDisclosed(false); setSort('-acquisition_date'); reset(); }}
				count={`${total.toLocaleString()} deal${total === 1 ? '' : 's'}`}
				actions={<ExportButton entity="acquisitions" search={dq} params={params} />}
			/>
			<div style={{ borderTop: '1px solid var(--a-border)', margin: '6px 0 30px' }} />

			{(res.isLoading || !filtersReady) && rows.length === 0 ? <Loading />
				: rows.length === 0 ? <Empty>No acquisitions match your filters.</Empty>
				: (
				<div className="atlas-table" role="table">
					<div className="atlas-table__head">
						<span className="atlas-table__name">Company</span>
						<span className="atlas-table__col hide-sm" style={{ width: 150 }}>Sector</span>
						<span className="atlas-table__col hide-sm" style={{ width: 130 }}>Location</span>
						<span className="atlas-table__col hide-sm" style={{ width: 200 }}>Acquirer</span>
						<span className="atlas-table__col hide-sm" style={{ width: 90 }}>Announced</span>
						<span className="atlas-table__col" style={{ width: 100, textAlign: 'right' }}>Value</span>
					</div>
					{rows.map((d) => {
						const name = d.acquiree_name ?? '—';
						return (
							<div key={d.id} className="atlas-table__row" role="row" tabIndex={0}
								aria-label={`${name} acquired by ${d.acquirer_name ?? 'undisclosed'} — open details`}
								style={{ cursor: 'pointer' }}
								onClick={(e) => { if ((e.target as HTMLElement).closest('a')) return; setDealId(d.id); }}
								onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setDealId(d.id); } }}>
								<div className="atlas-table__name">
									<Logo co={{ name, website: d.acquiree_website, custom_logo_url: d.acquiree_logo }} size={28} radius={5} />
									<div className="atlas-table__name-main">
										{d.acquiree_slug
											? <Link href={companyHref(d.acquiree_slug)} className="atlas-ellipsis" style={{ fontWeight: 600 }}>{name}</Link>
											: <div className="atlas-ellipsis" style={{ fontWeight: 600 }}>{name}</div>}
										{d.acquisition_type && <div style={{ fontSize: 11, color: 'var(--a-muted)' }} className="atlas-ellipsis">{TYPE_LABEL.get(d.acquisition_type) ?? d.acquisition_type}</div>}
									</div>
								</div>
								<span className="atlas-table__col hide-sm atlas-ellipsis" style={{ width: 150 }}>{d.primary_sector ?? '—'}</span>
								<span className="atlas-table__col hide-sm" style={{ width: 130, display: 'flex', alignItems: 'center', gap: 6 }}>
									{d.hq_country ? <><Flag cc={d.hq_country} size={11} /><span className="atlas-ellipsis">{canonicalCountry(d.hq_country)}</span></> : '—'}
								</span>
								<span className="atlas-table__col hide-sm" style={{ width: 200, display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
									{d.acquirer_name ? <>
										<Logo co={{ name: d.acquirer_name, website: null, custom_logo_url: null }} size={24} radius={5} />
										{d.acquirer_slug
											? <Link href={companyHref(d.acquirer_slug)} className="atlas-ellipsis" style={{ fontWeight: 500 }}>{d.acquirer_name}</Link>
											: <span className="atlas-ellipsis">{d.acquirer_name}</span>}
									</> : '—'}
								</span>
								<span className="atlas-table__col hide-sm" style={{ width: 90 }}>{fmtMonth(d.acquisition_date)}</span>
								<span className="atlas-table__col" style={{ width: 100, textAlign: 'right', fontWeight: 600 }}>{fmtValue(d.amount_usd)}</span>
							</div>
						);
					})}
				</div>
				)}

			<Pager page={page} totalPages={res.data?.totalPages ?? 1} onPage={setPage} />
			<MaDealPanel deal={selected} onClose={() => setDealId(null)} />
		</>
	);
}
