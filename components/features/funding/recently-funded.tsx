'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { qk } from '@/lib/query-keys';
import type { Deal } from '@/types/api';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useRoundTypeOptions } from '@/hooks/use-catalog-options';
import { COUNTRY_OPTIONS } from '@/lib/catalog-options';
import { Empty, FilterBar, Loading, Logo, Pager, type FilterDef } from '@/components/atlas';
import { fmtUsd } from '@/components/features/market/format';
import './funding.css';

/**
 * Recently Funded — disclosed funding rounds, newest first (GET /api/deals).
 * Toolbar: search · round · country · period; table: company, date, round,
 * investors, amount. Shared feature — products pass where company links go.
 */


const PAGE_SIZE = 25;
const PERIODS: [string, string][] = [['30', 'Last 30 days'], ['90', 'Last 90 days'], ['365', 'Last 12 months']];
const SORTS: [string, string][] = [['-announced_date', 'Newest'], ['-amount_usd', 'Largest']];
const isoDaysAgo = (days: number) => new Date(Date.now() - days * 864e5).toISOString().slice(0, 10);
const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

export function RecentlyFunded({ companyHref }: { companyHref: (idOrSlug: string) => string }) {
	const [q, setQ] = useState('');
	const dq = useDebouncedValue(q);
	const [round, setRound] = useState('');
	const [country, setCountry] = useState('');
	const [period, setPeriod] = useState('');
	const [sort, setSort] = useState('-announced_date');
	const [page, setPage] = useState(1);
	const reset = () => setPage(1);
	const roundOptions = useRoundTypeOptions();
	const sel = (key: string, label: string, value: string, options: [string, string][], set: (v: string) => void): FilterDef =>
		({ kind: 'select', key, label, value, options, onChange: (v) => { set(v); reset(); } });

	const params = useMemo(() => {
		const p: Record<string, unknown> = { page, limit: PAGE_SIZE, sort };
		const term = dq.trim().slice(0, 120);
		if (term) p.q = term;
		if (round) p.round_type_slug = round;
		if (country) p.country = country;
		if (period) p.from = isoDaysAgo(Number(period));
		return p;
	}, [page, sort, dq, round, country, period]);
	const res = useSWR<{ data: Deal[]; total: number; totalPages: number }>(qk.deals.list(params), { keepPreviousData: true });
	const rows = res.data?.data ?? [];
	const total = res.data?.total ?? 0;
	const anyFilter = !!(dq || round || country || period);

	return (
		<>
			<FilterBar
				search={{ value: q, onChange: (v) => { setQ(v); reset(); }, placeholder: 'Search companies or investors' }}
				groups={[
					{ label: 'Round', filters: [sel('round', 'Round', round, roundOptions, setRound)] },
					{ label: 'Geography', filters: [sel('country', 'Country', country, COUNTRY_OPTIONS, setCountry)] },
					{ label: 'Date', filters: [sel('period', 'Period', period, PERIODS, setPeriod)] },
				]}
				sort={{ value: sort, options: SORTS, onChange: (v) => { setSort(v); reset(); } }}
				canClear={anyFilter}
				onClear={() => { setQ(''); setRound(''); setCountry(''); setPeriod(''); reset(); }}
				count={`${total.toLocaleString()} round${total === 1 ? '' : 's'}`}
			/>

			<section className="atlas-card atlas-funded">
				<div className="atlas-funded__head">
					<h2 className="atlas-h2">Funding rounds</h2>
					<span className="atlas-eyebrow">Disclosed rounds · {PERIODS.find(([k]) => k === period)?.[1] ?? 'All time'} · sorted by {sort === '-amount_usd' ? 'amount' : 'date'}</span>
				</div>
				{res.isLoading && rows.length === 0 ? <Loading /> : rows.length === 0 ? <Empty>No funding rounds match your filters.</Empty> : (
					<div className="atlas-funded__table" role="table" aria-label="Funding rounds">
						<div className="atlas-funded__row atlas-funded__row--head" role="row">
							<span role="columnheader">#</span><span role="columnheader">Company</span><span role="columnheader">Date</span>
							<span role="columnheader">Round</span><span role="columnheader">Investors</span><span role="columnheader" className="atlas-funded__amt">Amount</span>
						</div>
						{rows.map((d, i) => {
							const investors = d.investors?.length ? d.investors : d.lead_investor ? [d.lead_investor] : [];
							return (
								<div key={d.id} className="atlas-funded__row" role="row">
									<span className="atlas-funded__n" role="cell">{(page - 1) * PAGE_SIZE + i + 1}</span>
									<span className="atlas-funded__co" role="cell">
										<Logo co={{ name: d.company_name, website: d.company_website ?? null, custom_logo_url: d.company_custom_logo_url }} size={32} radius={6} />
										<span>
											<Link href={companyHref(d.company_slug ?? d.company_id)} className="atlas-funded__name">{d.company_name}</Link>
											<span className="atlas-funded__sub">{[d.primary_sector, d.hq_country].filter(Boolean).join(' · ')}</span>
										</span>
									</span>
									<span role="cell">{fmtDate(d.announced_date)}</span>
									<span role="cell">{d.round_type_name ?? '—'}</span>
									<span role="cell" className="atlas-funded__inv">{investors.join(', ') || 'Undisclosed'}</span>
									<span role="cell" className="atlas-funded__amt">{d.amount_usd == null ? 'Undisclosed' : fmtUsd(Number(d.amount_usd))}</span>
								</div>
							);
						})}
					</div>
				)}
			</section>
			<Pager page={page} totalPages={res.data?.totalPages ?? 1} onPage={setPage} />
		</>
	);
}
