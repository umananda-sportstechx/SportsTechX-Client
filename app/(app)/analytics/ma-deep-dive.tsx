'use client';

import useSWR from 'swr';
import { qk } from '@/lib/query-keys';
import { Stat, SectionHead, Empty, Tag } from '@/components/ui/atoms';

/**
 * M&A deep dive — count, largest, median + acquirer leaderboard.
 * Reads `/api/analytics/ma-stats` + `/api/acquisitions`.
 */

interface MaStats {
	count: number;
	largest_value: number;
	median_value: number;
	acquisition_pct: number;
}

interface AcquisitionRow {
	id: string;
	acquirer_name?: string | null;
	acquiree_name?: string | null;
	acquisition_type?: string | null;
	acquisition_date?: string | null;
	amount_usd?: number | string | null;
	primary_sector?: string | null;
}

interface AcquisitionsResponse { data: AcquisitionRow[]; total: number }

export function MaDeepDiveTab() {
	const { data: stats } = useSWR<MaStats>(qk.analytics.maStats('12m'), { dedupingInterval: 10 * 60_000 });
	const { data: recent } = useSWR<AcquisitionsResponse>(
		qk.acquisitions.list({ limit: 100, sort: '-acquisition_date' }),
		{ dedupingInterval: 10 * 60_000 },
	);

	const acqs = recent?.data ?? [];
	const acquirerLeaderboard = topByKey(acqs, (a) => a.acquirer_name ?? null).slice(0, 10);

	return (
		<>
			<div className="grid-4" style={{ marginBottom: 'var(--space-5)' }}>
				<StatCard label="Acquisitions · 12mo" value={{ value: (stats?.count ?? 0).toLocaleString(), unit: '' }} />
				<StatCard label="Largest · 12mo" value={splitDollars(stats?.largest_value ?? 0)} />
				<StatCard label="Median value" value={splitDollars(stats?.median_value ?? 0)} />
				<StatCard
					label="Acquisitions share"
					value={{ value: (stats?.acquisition_pct ?? 0).toString(), unit: '%' }}
				/>
			</div>

			<div className="grid-2" style={{ marginBottom: 'var(--space-5)' }}>
				<div className="card">
					<SectionHead title="Top acquirers" meta="By deal count" />
					{acquirerLeaderboard.length === 0 ? (
						<Empty msg="No acquirer data yet." />
					) : (
						<RankList items={acquirerLeaderboard} unit="deals" />
					)}
				</div>
				<div className="card">
					<SectionHead title="Latest activity" meta={`${acqs.length} recent`} />
					{acqs.length === 0 ? (
						<Empty msg="No acquisitions tracked." />
					) : (
						<table className="data-table">
							<thead>
								<tr>
									<th>Target</th>
									<th>Acquirer</th>
									<th>Type</th>
									<th style={{ textAlign: 'right' }}>Value</th>
								</tr>
							</thead>
							<tbody>
								{acqs.slice(0, 10).map((a) => (
									<tr key={a.id}>
										<td style={{ fontWeight: 600 }}>{a.acquiree_name ?? '—'}</td>
										<td>{a.acquirer_name ?? '—'}</td>
										<td><Tag>{formatType(a.acquisition_type)}</Tag></td>
										<td className="num" style={{ textAlign: 'right', fontWeight: 700 }}>
											{formatDollars(a.amount_usd)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					)}
				</div>
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

function RankList({ items, unit }: { items: Array<{ name: string; count: number }>; unit: string }) {
	const max = items[0]?.count ?? 1;
	return (
		<div>
			{items.map((it, i) => (
				<div key={`${it.name}-${i}`} className="rank-row">
					<span className="rank-idx">{(i + 1).toString().padStart(2, '0')}</span>
					<span className="rank-name">{it.name}</span>
					<span className="rank-bar"><span style={{ transform: `scaleX(${it.count / max})` }} /></span>
					<span className="rank-val">{it.count} {unit}</span>
				</div>
			))}
		</div>
	);
}

function topByKey<T>(rows: T[], pick: (r: T) => string | null): Array<{ name: string; count: number }> {
	const counts = new Map<string, number>();
	for (const r of rows) {
		const k = pick(r);
		if (!k) continue;
		counts.set(k, (counts.get(k) ?? 0) + 1);
	}
	return Array.from(counts.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
}

function formatType(t: string | null | undefined): string {
	if (!t) return 'Deal';
	switch (t) {
		case 'acquisition': return 'Strategic';
		case 'merger': return 'Merger';
		case 'asset_purchase': return 'Asset';
		default: return t;
	}
}

function splitDollars(n: number): { value: string; unit: string } {
	if (!Number.isFinite(n) || n <= 0) return { value: '—', unit: '' };
	if (n >= 1_000_000_000) return { value: `$${(n / 1_000_000_000).toFixed(2)}`, unit: 'B' };
	if (n >= 1_000_000) return { value: `$${(n / 1_000_000).toFixed(1)}`, unit: 'M' };
	if (n >= 1_000) return { value: `$${(n / 1_000).toFixed(0)}`, unit: 'K' };
	return { value: `$${n.toFixed(0)}`, unit: '' };
}

function formatDollars(value: number | string | null | undefined): string {
	if (value == null) return '—';
	const n = typeof value === 'string' ? Number(value) : value;
	if (!Number.isFinite(n) || n <= 0) return '—';
	if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
	if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(0)}M`;
	if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
	return `$${n.toFixed(0)}`;
}
