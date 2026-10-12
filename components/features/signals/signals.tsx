'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { ArrowUpRight } from 'lucide-react';
import { Empty, Loading, PillTabs } from '@/components/atlas';
import { qk } from '@/lib/query-keys';
import { ago, place } from '@/components/features/market/format';
import { SaveToWatchlist } from '@/components/features/watchlists/save-to-watchlist';
import type { Signal, SignalType } from '@/types/api';
import './signals.css';

/**
 * Discover → Signals: company activity worth watching — funding, fundraising,
 * growth, partnerships, leadership and product news.
 *
 * One component for Raise and Scout, against the un-gated `GET /api/signals`
 * (Scout's `/api/scout/signals` returns the same rows behind the tier; using
 * the shared route lets one cache entry serve both products).
 *
 * Laid out as the Scout mockup's signal row: name, type and age on one line,
 * the headline, then a rule over the company's context and the actions. The
 * filters are separate outline pills in the mockup's order.
 *
 * Only `funding` and `fundraising` carry data today — the other four types are
 * in the enum but have no source yet, so they show the empty state.
 */
const FILTERS: { key: 'All' | SignalType; label: string }[] = [
	{ key: 'All', label: 'All' },
	{ key: 'funding', label: 'Funding' },
	{ key: 'growth', label: 'Growth' },
	{ key: 'partnership', label: 'Partnerships' },
	{ key: 'leadership', label: 'Leadership' },
	{ key: 'product', label: 'Product' },
	{ key: 'fundraising', label: 'Fundraising' },
];
const TYPE_LABEL: Record<string, string> = {
	funding: 'Funding', growth: 'Growth', partnership: 'Partnership', leadership: 'Leadership',
	product: 'Product', fundraising: 'Fundraising',
};

export function Signals({ companiesHref }: { companiesHref: string }) {
	const [type, setType] = useState<'All' | SignalType>('All');
	// Filtered server-side, not with rows.filter — otherwise `limit` would cap
	// the feed before the filter ran and a quiet type could look empty.
	const params = useMemo(() => (type === 'All' ? { limit: 50 } : { type, limit: 50 }), [type]);
	const res = useSWR<{ data: Signal[] }>(qk.signals.list(params), { keepPreviousData: true });
	const rows = res.data?.data ?? [];
	const typeName = FILTERS.find((f) => f.key === type)?.label ?? '';

	return (
		<>
			<div className="atlas-sig-head">
				<h2 className="atlas-h2">Signals</h2>
				<p className="atlas-sig-lede">Companies showing activity worth watching.</p>
			</div>
			<div className="atlas-sig-filter">
				<PillTabs ariaLabel="Signal type" value={type} onChange={setType} options={FILTERS} />
			</div>

			{res.isLoading && rows.length === 0 ? <Loading />
				: rows.length === 0 ? (
					<Empty>
						{type === 'All'
							? 'No signals yet.'
							: `No ${typeName.toLowerCase()} signals yet — this type has no source feeding it today.`}
					</Empty>
				) : (
					<div className="atlas-sig-list">
						{rows.map((s) => {
							const name = s.company_name ?? 'Unknown company';
							const href = `${companiesHref}/${s.company_slug ?? s.company_id}`;
							const ctx = [s.sector, s.last_round_type, place(s.hq_city, s.hq_country)].filter(Boolean).join(' · ');
							return (
								<article key={s.id} className="atlas-sig">
									<div className="atlas-sig__top">
										<Link href={href} className="atlas-sig__name">{name}</Link>
										<span className="atlas-sig__type">{TYPE_LABEL[s.signal_type] ?? s.signal_type}</span>
										<span className="atlas-sig__when">· {ago(s.occurred_at)}</span>
									</div>
									<p className="atlas-sig__text">{s.headline}</p>
									<div className="atlas-sig__foot">
										<span className="atlas-sig__ctx">{ctx}</span>
										<div className="atlas-sig__actions">
											<SaveToWatchlist companyId={s.company_id} companyName={name} />
											<Link className="atlas-action" href={href}>
												<span className="atlas-action__icon"><ArrowUpRight /></span>View company
											</Link>
										</div>
									</div>
								</article>
							);
						})}
					</div>
				)}
		</>
	);
}
