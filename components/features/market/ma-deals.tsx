'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { ExportButton } from '@/components/features/exports/export-button';
import { qk } from '@/lib/query-keys';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useSectorTierData, useCountryOptions } from '@/hooks/use-catalog-options';
import { SINCE_YEARS, canonicalCountry } from '@/lib/catalog-options';
import { Empty, FilterBar, Loading, Logo, Flag, Pager, type FilterDef } from '@/components/atlas';
import { fmtUsd } from '@/components/features/market/format';
import { companyHref } from '@/lib/routes';
import { MaDealPanel } from '@/components/features/market/ma-deal-panel';

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

export function MaDeals() {
	const [q, setQ] = useState('');
	const dq = useDebouncedValue(q);
	const [type, setType] = useState('');
	const [sector, setSector] = useState('');
	const [country, setCountry] = useState('');
	const [year, setYear] = useState('');
	const [disclosed, setDisclosed] = useState(false);
	const [sort, setSort] = useState('-acquisition_date');
	const [page, setPage] = useState(1);
	const [selected, setSelected] = useState<MaDeal | null>(null);
	const reset = () => setPage(1);

	const sectors = useSectorTierData();
	const countryOptions = useCountryOptions();

	const params = useMemo(() => {
		const p: Record<string, unknown> = { page, limit: PAGE_SIZE, sort };
		const term = dq.trim().slice(0, 120);
		if (term) p.q = term;
		if (type) p.acquisition_type = type;
		const secSlug = sectors.sectorSlug(sector, '', '');
		if (secSlug) p.sector_slug = secSlug;
		if (country) p.country = country;
		if (year) p.year_min = year;
		if (disclosed) p.disclosed_only = true;
		return p;
	}, [page, sort, dq, type, sectors, sector, country, year, disclosed]);

	// Only wait on the async sector catalog when a sector is actually selected —
	// with no sector the key is stable and SWR can fetch immediately.
	const filtersReady = !sector || sectors.ready;
	const res = useSWR<{ data: MaDeal[]; total: number; totalPages: number }>(
		filtersReady ? qk.acquisitions.list(params) : null,
		{ keepPreviousData: true },
	);
	const rows = res.data?.data ?? [];
	const total = res.data?.total ?? 0;
	const anyFilter = !!(dq || type || sector || country || year || disclosed);

	const sel = (key: string, label: string, value: string, options: [string, string][], set: (v: string) => void): FilterDef =>
		({ kind: 'select', key, label, value, options, onChange: (v) => { set(v); reset(); } });

	return (
		<>
			<FilterBar
				search={{ value: q, onChange: (v) => { setQ(v); reset(); }, placeholder: 'Search by company or acquirer…' }}
				groups={[
					{ label: 'Deal', filters: [
						sel('type', 'Type', type, TYPE_OPTIONS, setType),
						sel('year', 'Since', year, SINCE_YEARS, setYear),
					] },
					{ label: 'Industry', filters: [sel('sector', 'Sectors', sector, sectors.topOptions, setSector)] },
					{ label: 'Geography', filters: [sel('country', 'Countries', country, countryOptions, setCountry)] },
					{ label: 'Status', filters: [{ kind: 'toggle', key: 'disclosed', label: 'Disclosed value only', value: disclosed, onChange: (v) => { setDisclosed(v); reset(); } }] },
				]}
				sort={{ value: sort, options: SORTS, onChange: (v) => { setSort(v); reset(); } }}
				canClear={anyFilter}
				onClear={() => { setQ(''); setType(''); setSector(''); setCountry(''); setYear(''); setDisclosed(false); setSort('-acquisition_date'); reset(); }}
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
						<span className="atlas-table__col" style={{ width: 200 }}>Acquirer</span>
						<span className="atlas-table__col hide-sm" style={{ width: 90 }}>Announced</span>
						<span className="atlas-table__col" style={{ width: 100, textAlign: 'right' }}>Value</span>
					</div>
					{rows.map((d) => {
						const name = d.acquiree_name ?? '—';
						return (
							<div key={d.id} className="atlas-table__row" role="row" tabIndex={0}
								aria-label={`${name} acquired by ${d.acquirer_name ?? 'undisclosed'} — open details`}
								style={{ cursor: 'pointer' }}
								onClick={(e) => { if ((e.target as HTMLElement).closest('a')) return; setSelected(d); }}
								onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelected(d); } }}>
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
								<span className="atlas-table__col" style={{ width: 200, display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
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
			<MaDealPanel deal={selected} onClose={() => setSelected(null)} />
		</>
	);
}
