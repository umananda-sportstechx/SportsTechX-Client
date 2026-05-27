'use client';

import useSWR from 'swr';
import { qk } from '@/lib/query-keys';
import { Stat, SectionHead, Empty } from '@/components/ui/atoms';

/**
 * Funding deep dive — totals + median ticket trend + top-funded companies.
 * Reads `/api/analytics/funding-totals` + `/api/analytics/top-funded-companies`.
 */

interface FundingTotals {
	total_amount: number;
	round_count: number;
	median_amount: number;
	largest_amount: number;
}

interface TopCompany {
	id: string;
	name: string;
	slug?: string;
	total_funding_usd: number;
	primary_sector?: string | null;
	hq_country?: string | null;
}

export function FundingDeepDiveTab() {
	const { data: totalsYtd } = useSWR<FundingTotals>(qk.analytics.fundingTotals('ytd'), { dedupingInterval: 10 * 60_000 });
	const { data: totals12m } = useSWR<FundingTotals>(qk.analytics.fundingTotals('12m'), { dedupingInterval: 10 * 60_000 });
	const { data: topFunded } = useSWR<TopCompany[]>(qk.analytics.topFunded('12m', 15), { dedupingInterval: 10 * 60_000 });

	const top = topFunded ?? [];
	const max = Math.max(1, ...top.map((c) => c.total_funding_usd));

	return (
		<>
			<div className="grid-4" style={{ marginBottom: 'var(--space-5)' }}>
				<StatCard label="Capital · YTD" value={splitDollars(totalsYtd?.total_amount ?? 0)} />
				<StatCard label="Capital · 12mo" value={splitDollars(totals12m?.total_amount ?? 0)} />
				<StatCard
					label="Median ticket · 12mo"
					value={splitDollars(totals12m?.median_amount ?? 0)}
				/>
				<StatCard label="Largest round · 12mo" value={splitDollars(totals12m?.largest_amount ?? 0)} />
			</div>

			<div className="card">
				<SectionHead title="Top-funded companies · 12 mo" meta={top.length > 0 ? `${top.length} ranked` : ''} />
				{top.length === 0 ? (
					<Empty msg="No companies in this window." />
				) : (
					<div>
						{top.map((c, i) => (
							<div key={c.id} className="rank-row">
								<span className="rank-idx">{(i + 1).toString().padStart(2, '0')}</span>
								<span className="rank-name">{c.name}</span>
								<span className="rank-bar"><span style={{ transform: `scaleX(${c.total_funding_usd / max})` }} /></span>
								<span className="rank-val">{formatDollars(c.total_funding_usd)}</span>
							</div>
						))}
					</div>
				)}
			</div>
		</>
	);
}

function StatCard({ label, value }: { label: string; value: { value: string; unit: string } }) {
	return (
		<div className="card" style={{ padding: 'var(--space-4)' }}>
			<Stat label={label} value={value.value} unit={value.unit} deltaDir="pos" />
		</div>
	);
}

function splitDollars(n: number): { value: string; unit: string } {
	if (!Number.isFinite(n) || n <= 0) return { value: '—', unit: '' };
	if (n >= 1_000_000_000) return { value: `$${(n / 1_000_000_000).toFixed(2)}`, unit: 'B' };
	if (n >= 1_000_000) return { value: `$${(n / 1_000_000).toFixed(1)}`, unit: 'M' };
	if (n >= 1_000) return { value: `$${(n / 1_000).toFixed(0)}`, unit: 'K' };
	return { value: `$${n.toFixed(0)}`, unit: '' };
}

function formatDollars(value: number): string {
	if (!Number.isFinite(value) || value <= 0) return '—';
	if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
	if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(0)}M`;
	if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
	return `$${value.toFixed(0)}`;
}
