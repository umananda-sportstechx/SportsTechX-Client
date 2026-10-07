'use client';

import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import { ArrowUpLeft, ArrowUpRight, X } from 'lucide-react';
import { Action, Empty, Loading, Logo } from '@/components/atlas';
import { fmtUsd } from '@/components/features/market/format';
import { useCompanyWatchlists, useWatchlistCompanies, removeFromWatchlist } from './use-company-watchlists';
import './watchlists.css';

/** One company watchlist: its companies as rows, each linking to the company profile, with remove. */
export function WatchlistDetail({ id, backHref, companyHref }: { id: string; backHref: string; companyHref: (idOrSlug: string) => string }) {
	const { lists, isLoading: listsLoading } = useCompanyWatchlists();
	const { companies, isLoading } = useWatchlistCompanies(id);
	const [busy, setBusy] = useState<string | null>(null);
	const list = lists.find((l) => l.id === id);

	if (listsLoading) return <Loading />;
	if (!list) return <Empty>Watchlist not found. <Link href={backHref}>All watchlists</Link></Empty>;

	const remove = async (companyId: string, name: string) => {
		setBusy(companyId);
		try { await removeFromWatchlist(id, companyId); toast.success(`Removed ${name}`); } catch (e) { toast.error((e as Error).message); } finally { setBusy(null); }
	};

	return (
		<>
			<div className="atlas-wl-head">
				<div>
					<h2 className="atlas-h2">{list.name}</h2>
					<div className="atlas-eyebrow" style={{ marginTop: 8 }}>{companies.length} compan{companies.length === 1 ? 'y' : 'ies'}</div>
				</div>
				<Action icon={<ArrowUpLeft />} href={backHref}>All watchlists</Action>
			</div>
			{isLoading ? <Loading /> : companies.length === 0 ? (
				<Empty>No companies yet. Open any company and use “Add to watchlist”.</Empty>
			) : (
				<div className="atlas-rowlist">
					{companies.map((c) => {
						const href = companyHref(c.slug ?? c.id);
						const raised = fmtUsd(c.total_funding_usd == null ? null : Number(c.total_funding_usd));
						return (
							<div key={c.id} className="atlas-rowlist__row atlas-wl-co">
								<div className="atlas-wl-co__id">
									<Logo co={{ name: c.name, website: c.website, custom_logo_url: c.custom_logo_url }} size={48} radius={8} />
									<div className="atlas-rowlist__main">
										<Link href={href} className="atlas-rowlist__title atlas-wl-title">{c.name}</Link>
										<div className="atlas-rowlist__desc">{[c.primary_sector, [c.hq_city, c.hq_country].filter(Boolean).join(', '), raised !== '—' ? `${raised} raised` : null].filter(Boolean).join(' · ')}</div>
									</div>
								</div>
								<div className="atlas-wl-actions">
									<Action icon={<ArrowUpRight />} href={href}>View company</Action>
									<Action icon={<X />} disabled={busy === c.id} onClick={() => void remove(c.id, c.name)}>Remove</Action>
								</div>
							</div>
						);
					})}
				</div>
			)}
		</>
	);
}
