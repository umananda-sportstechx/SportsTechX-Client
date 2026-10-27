'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { ArrowRight } from 'lucide-react';
import { qk } from '@/lib/query-keys';
import { companyHref } from '@/lib/routes';
import { Logo } from '@/components/atlas';
import { fmtUsd } from '@/components/features/market/format';
import { MaDealPanel } from '@/components/features/market/ma-deal-panel';
import { partyLogo, type MaDeal } from '@/components/features/market/ma-deals';

/**
 * M&A activity for one company — the hub's M&A Tracker, scoped to deals this
 * company took part in on either side. Reuses the acquisitions list endpoint
 * (one call per party via `acquiree_company_id` / `acquirer_company_id`) and the
 * same detail slide-over the hub uses, so rows link through to the counterparty
 * and open the full panel on click. Renders nothing when the company has no
 * recorded M&A, so it never shows an empty card on the many companies with none.
 */

const TYPE_LABEL: Record<string, string> = { acquisition: 'Acquisition', merger: 'Merger', asset_purchase: 'Asset purchase' };
const fmtMonth = (d?: string | null) => (d ? new Date(d).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : '—');
const fmtValue = (n: MaDeal['amount_usd']) => (n == null || Number(n) === 0 ? 'Undisclosed' : fmtUsd(Number(n)));

// Cap matches the hub page size; a single company's deal count sits well under it.
const LIMIT = 25;

export function CompanyMa({ companyId }: { companyId: string }) {
	const asAcquiree = useSWR<{ data: MaDeal[] }>(qk.acquisitions.list({ acquiree_company_id: companyId, limit: LIMIT, sort: '-acquisition_date' }));
	const asAcquirer = useSWR<{ data: MaDeal[] }>(qk.acquisitions.list({ acquirer_company_id: companyId, limit: LIMIT, sort: '-acquisition_date' }));
	const [selected, setSelected] = useState<MaDeal | null>(null);

	// Each side's rows are tagged with this company's role so the row can name the
	// counterparty and the direction; a company is never both parties in one deal.
	const deals = useMemo(() => {
		const rows = [
			...(asAcquiree.data?.data ?? []).map((d) => ({ d, role: 'acquiree' as const })),
			...(asAcquirer.data?.data ?? []).map((d) => ({ d, role: 'acquirer' as const })),
		];
		return rows.sort((a, b) => (b.d.acquisition_date ?? '').localeCompare(a.d.acquisition_date ?? ''));
	}, [asAcquiree.data, asAcquirer.data]);

	if (deals.length === 0) return null;

	return (
		<section className="atlas-card atlas-co__funding">
			<div className="atlas-co__card-head">
				<h2 className="atlas-co__h2">M&amp;A activity</h2>
				<span className="atlas-co__aside">Acquisitions &amp; mergers</span>
			</div>
			<div className="atlas-co__deals" role="table" aria-label="M&A activity">
				<div className="atlas-co__deal atlas-co__deal--head" role="row">
					<span role="columnheader">Date</span>
					<span role="columnheader">Deal</span>
					<span role="columnheader">Value</span>
					<span role="columnheader">Counterparty</span>
				</div>
				{deals.map(({ d, role }) => {
					// From this company's point of view: it was bought (acquiree) or it
					// bought (acquirer); the counterparty is the other side.
					const bought = role === 'acquiree';
					const cpName = bought ? d.acquirer_name : d.acquiree_name;
					const cpSlug = bought ? d.acquirer_slug : d.acquiree_slug;
					// Same logo rule as the M&A list and deal panel (linked site, else the deal's, plus custom logo).
					const { website: cpWebsite, custom_logo_url: cpLogo } = partyLogo(d, bought ? 'acquirer' : 'acquiree');
					return (
						<div key={d.id} className="atlas-co__deal" role="row" tabIndex={0}
							aria-label={`${bought ? 'Acquired by' : 'Acquired'} ${cpName ?? 'undisclosed party'} — open details`}
							style={{ cursor: 'pointer' }}
							onClick={(e) => { if ((e.target as HTMLElement).closest('a')) return; setSelected(d); }}
							onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelected(d); } }}>
							<span role="cell">{fmtMonth(d.acquisition_date)}</span>
							<span role="cell" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--a-muted)' }}>
								{bought ? 'Acquired by' : 'Acquired'}
								<ArrowRight size={12} style={{ color: 'var(--a-faint)' }} aria-hidden="true" />
								{d.acquisition_type ? (TYPE_LABEL[d.acquisition_type] ?? d.acquisition_type) : ''}
							</span>
							<span className="atlas-co__amt" role="cell">{fmtValue(d.amount_usd)}</span>
							<span role="cell" style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
								<Logo co={{ name: cpName ?? '—', website: cpWebsite, custom_logo_url: cpLogo }} size={24} radius={5} />
								{cpSlug
									? <Link href={companyHref(cpSlug)} className="atlas-ellipsis" style={{ fontWeight: 500, color: 'var(--a-navy)', textDecoration: 'none' }}>{cpName ?? '—'}</Link>
									: <span className="atlas-ellipsis">{cpName ?? 'Undisclosed'}</span>}
							</span>
						</div>
					);
				})}
			</div>
			<MaDealPanel deal={selected} onClose={() => setSelected(null)} />
		</section>
	);
}
