'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { ArrowUpRight, Globe } from 'lucide-react';
import { Action, Empty, Loading, Logo, Seg } from '@/components/atlas';
import { qk } from '@/lib/query-keys';
import { ago, place } from '@/components/features/market/format';
import { SaveToWatchlist } from '@/components/features/watchlists/save-to-watchlist';
import type { Signal, SignalType } from '@/types/api';
import './signals.css';

/**
 * Discover → Signals (Claude Design "Signals"): company activity worth watching —
 * funding, fundraising, growth, partnerships, leadership and product news.
 *
 * Shared by Raise and Scout, both against the un-gated `GET /api/signals`.
 * Scout's own `/api/scout/signals` returns the same rows behind the scout tier;
 * this component uses the shared route so one cache entry serves both products.
 *
 * Only `funding` and `fundraising` carry data today — the other four types are
 * in the enum but have no source yet, so they show the empty state. That is
 * correct, not a gap.
 */
const TYPES: SignalType[] = ['funding', 'fundraising', 'growth', 'partnership', 'leadership', 'product'];
/** The DB enum is lowercase and the design labels are Title Case. That is the
 *  whole mapping — capitalisation, not a lookup table. */
const label = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
/** Company sites are stored bare as often as not. */
const href = (site: string) => (/^https?:\/\//i.test(site) ? site : `https://${site}`);

export function Signals({ companiesHref }: { companiesHref: string }) {
	const [type, setType] = useState<'All' | SignalType>('All');
	// Filtered server-side, not with rows.filter — otherwise `limit` would cap
	// the feed before the filter ran and a quiet type could look empty.
	const params = useMemo(() => (type === 'All' ? { limit: 50 } : { type, limit: 50 }), [type]);
	const res = useSWR<{ data: Signal[] }>(qk.signals.list(params), { keepPreviousData: true });
	const rows = res.data?.data ?? [];

	return (
		<>
			<div className="atlas-sig-head">
				<h2 className="atlas-h2">Signals</h2>
				<p className="atlas-sig-muted">Companies showing activity worth watching.</p>
			</div>
			<div className="atlas-sig-filter">
				<Seg ariaLabel="Signal type" value={type} onChange={setType} options={[{ key: 'All', label: 'All' }, ...TYPES.map((t) => ({ key: t, label: label(t) }))]} />
			</div>
			{res.isLoading && rows.length === 0 ? <Loading />
				: rows.length === 0 ? <Empty>No {type === 'All' ? '' : `${label(type).toLowerCase()} `}signals yet.</Empty>
					: (
						<div className="atlas-sig-list">
							{rows.map((s) => {
								const name = s.company_name ?? 'Unknown company';
								const meta = [s.sector, s.last_round_type, place(s.hq_city, s.hq_country)].filter(Boolean).join(' · ');
								return (
									<article key={s.id} className="atlas-card atlas-sig">
										<Logo co={{ name, website: s.company_website, custom_logo_url: s.company_custom_logo_url }} size={40} radius={8} />
										<div className="atlas-sig__main">
											<div className="atlas-sig__top">
												<span className="atlas-sig__name">{name}</span>
												<span className="atlas-sig__type">{label(s.signal_type)}</span>
												<span className="atlas-sig-muted">· {ago(s.occurred_at)}</span>
											</div>
											<p className="atlas-sig__text">{s.headline}</p>
											{meta && <div className="atlas-sig-muted">{meta}</div>}
										</div>
										<div className="atlas-sig__actions">
											<SaveToWatchlist companyId={s.company_id} companyName={name} />
											{s.company_website && <Action icon={<Globe />} href={href(s.company_website)} external>Website</Action>}
											<Link className="atlas-action" href={`${companiesHref}/${s.company_slug ?? s.company_id}`}><span className="atlas-action__icon"><ArrowUpRight /></span>View company</Link>
										</div>
									</article>
								);
							})}
						</div>
					)}
		</>
	);
}
