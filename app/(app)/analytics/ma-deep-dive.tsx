'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { Filter } from 'lucide-react';
import { qk } from '@/lib/query-keys';
import { Stat, SectionHead, Empty, Flag } from '@/components/ui/atoms';
import {
	ComboBarLine, Monogram, YearRangeToggle, HBarDrilldown,
	type ComboPoint, type YearRange, type HBarRow,
} from '@/components/ui/analytics-charts';

interface MaStats {
	count: number;
	largest_value: number;
	median_value: number;
	acquisition_pct: number;
}

interface AnnualPoint {
	year: number;
	total_amount: number;
	deal_count: number;
}

interface SectorHeatPoint {
	sector_id: string;
	sector_slug: string;
	sector_name: string;
	deal_count: number;
	total_amount: number;
}

interface TopAcquirer {
	acquirer_name: string;
	acquirer_country: string | null;
	deal_count: number;
	total_value: number;
}

interface AcquisitionRow {
	id: string;
	acquiree_name?: string | null;
	acquirer_name?: string | null;
	acquisition_date?: string | null;
	amount_usd?: number | string | null;
	hq_country?: string | null;
}

interface AcqResponse { data: AcquisitionRow[]; total: number }

const SECTOR_COLORS = [
	'oklch(58% 0.22 290)', 'oklch(58% 0.22 240)', 'oklch(58% 0.22 160)',
	'oklch(62% 0.18 30)', 'oklch(62% 0.18 60)', 'oklch(62% 0.18 350)',
	'oklch(62% 0.14 140)', 'oklch(62% 0.18 200)',
];

const rangeToPeriod = (r: YearRange): 'ytd' | '12m' | 'all' => (r === 'ytd' ? 'ytd' : 'all');

export function MaDeepDiveTab() {
	const currentYear = new Date().getFullYear();
	const [range, setRange] = useState<YearRange>('10y');
	const yearWindow = range === '10y' ? 9 : range === '5y' ? 4 : 0;

	const { data: stats } = useSWR<MaStats>(qk.analytics.maStats(rangeToPeriod(range)), { dedupingInterval: 10 * 60_000 });
	const { data: annual } = useSWR<AnnualPoint[]>(
		qk.analytics.annualMa({ from: currentYear - yearWindow, to: currentYear }),
		{ dedupingInterval: 10 * 60_000 },
	);
	const { data: sectorHeat } = useSWR<SectorHeatPoint[]>(qk.analytics.sectorHeat(rangeToPeriod(range), 10), { dedupingInterval: 10 * 60_000 });
	const { data: topAcq } = useSWR<TopAcquirer[]>(qk.analytics.topAcquirers(rangeToPeriod(range), 10), { dedupingInterval: 10 * 60_000 });
	// Largest disclosed acquisitions — sorted by deal size off the real list endpoint.
	const { data: largestResp } = useSWR<AcqResponse>(
		qk.acquisitions.list({ sort: '-amount_usd', disclosed_only: true, limit: 8 }),
		{ dedupingInterval: 10 * 60_000 },
	);

	const annualChart: ComboPoint[] = useMemo(
		() => (annual ?? []).map((a) => ({ year: String(a.year), amt: a.total_amount, deals: a.deal_count })),
		[annual],
	);

	// M&A-by-sector drilldown rows (flat — sector-heat has no hierarchy).
	const sectorRows: HBarRow[] = useMemo(() => {
		return (sectorHeat ?? []).map((s, i) => ({
			id: s.sector_id,
			label: s.sector_name,
			value: s.total_amount,
			formatted: formatAmtCompact(s.total_amount),
			color: SECTOR_COLORS[i % SECTOR_COLORS.length],
		}));
	}, [sectorHeat]);

	const largest = largestResp?.data ?? [];

	const totalValue = useMemo(() => (annual ?? []).reduce((s, a) => s + a.total_amount, 0), [annual]);
	const totalDeals = useMemo(() => (annual ?? []).reduce((s, a) => s + a.deal_count, 0), [annual]);

	return (
		<>
			<div className="an-toolbar">
				<h2>M&amp;A Deep Dive</h2>
				<button className="btn ghost"><Filter size={12} /> Filters</button>
			</div>

			<div className="grid-4" style={{ marginBottom: 'var(--space-5)' }}>
				<div className="card feature" style={{ padding: 'var(--space-4)' }}>
					<Stat
						label="Disclosed value"
						value={splitAmt(totalValue).value}
						unit={splitAmt(totalValue).unit}
						delta={`across ${totalDeals.toLocaleString()} deals`}
						deltaDir="pos"
					/>
				</div>
				<div className="card feature" style={{ padding: 'var(--space-4)' }}>
					<Stat
						label="Acquisitions"
						value={totalDeals.toLocaleString()}
						delta="closed deals"
						deltaDir="pos"
					/>
				</div>
				<div className="card feature" style={{ padding: 'var(--space-4)' }}>
					<Stat
						label="Largest deal"
						value={splitAmt(stats?.largest_value ?? 0).value}
						unit={splitAmt(stats?.largest_value ?? 0).unit}
						delta="single biggest"
						deltaDir="pos"
					/>
				</div>
				<div className="card feature" style={{ padding: 'var(--space-4)' }}>
					<Stat
						label="Acquisitions share"
						value={(stats?.acquisition_pct ?? 0).toString()}
						unit="%"
						delta={`vs ${100 - (stats?.acquisition_pct ?? 0)}% mergers`}
						deltaDir="pos"
					/>
				</div>
			</div>

			<div className="card" style={{ marginBottom: 'var(--space-5)' }}>
				<SectionHead
					title="M&A Summary"
					meta="annual deal volume + disclosed value"
					action={<YearRangeToggle value={range} onChange={setRange} />}
				/>
				<div className="card-pad">
					{annualChart.length === 0
						? <Empty msg="No annual M&A data yet." />
						: <ComboBarLine data={annualChart} />}
				</div>
			</div>

			<div className="card" style={{ marginBottom: 'var(--space-5)' }}>
				<SectionHead title="M&A by Sector" action={<YearRangeToggle value={range} onChange={setRange} />} />
				<div className="card-pad">
					{sectorRows.length === 0
						? <Empty msg="No sector data yet." />
						: <HBarDrilldown rows={sectorRows} />}
				</div>
			</div>

			<div className="grid-2">
				<div className="card">
					<SectionHead title="Top Acquirers" action={<YearRangeToggle value={range} onChange={setRange} />} />
				<div className="card-pad">
					{(topAcq ?? []).length === 0 ? (
						<Empty msg="No acquirer data yet." />
					) : (
						<table className="data-table">
							<thead>
								<tr>
									<th style={{ width: 30 }}>#</th>
									<th>Acquirer</th>
									<th>HQ</th>
									<th style={{ textAlign: 'right' }}>Deals</th>
									<th className="amt" style={{ textAlign: 'right' }}>Value</th>
								</tr>
							</thead>
							<tbody>
								{(topAcq ?? []).map((a, i) => (
									<tr key={`${a.acquirer_name}-${i}`}>
										<td className="rank-idx">{i + 1}</td>
										<td>
											<div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
												<Monogram name={a.acquirer_name} />
												<span style={{ fontWeight: 600 }}>{a.acquirer_name}</span>
											</div>
										</td>
										<td>{a.acquirer_country ? <Flag cc={countryCode(a.acquirer_country)} /> : <span style={{ color: 'var(--fg-muted)' }}>—</span>}</td>
										<td className="num" style={{ textAlign: 'right' }}>{a.deal_count}</td>
										<td className="amt">{a.total_value > 0 ? formatAmtCompact(a.total_value) : '—'}</td>
									</tr>
								))}
							</tbody>
						</table>
					)}
				</div>
				</div>

				<div className="card">
					<SectionHead title="Largest Acquisitions" meta="biggest disclosed deals" />
					<div className="card-pad">
						{largest.length === 0 ? (
							<Empty msg="No disclosed acquisitions yet." />
						) : (
							<table className="data-table">
								<thead>
									<tr>
										<th style={{ width: 30 }}>#</th>
										<th>Target</th>
										<th>Acquirer</th>
										<th className="amt" style={{ textAlign: 'right' }}>Value</th>
									</tr>
								</thead>
								<tbody>
									{largest.map((d, i) => {
										const cc = d.hq_country ? countryCode(d.hq_country) : '';
										return (
											<tr key={d.id}>
												<td className="rank-idx">{i + 1}</td>
												<td>
													<div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
														<Monogram name={d.acquiree_name ?? '—'} />
														<div>
															<div style={{ fontWeight: 600 }}>{d.acquiree_name ?? '—'}</div>
															<div style={{ fontSize: 11, color: 'var(--fg-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
																{cc && <Flag cc={cc} />}
																{d.acquisition_date ? d.acquisition_date.slice(0, 4) : '—'}
															</div>
														</div>
													</div>
												</td>
												<td>{d.acquirer_name ?? '—'}</td>
												<td className="amt">{formatAmtCompact(Number(d.amount_usd) || 0)}</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						)}
					</div>
				</div>
			</div>
		</>
	);
}

function splitAmt(n: number): { value: string; unit: string } {
	if (!Number.isFinite(n) || n <= 0) return { value: '—', unit: '' };
	if (n >= 1_000_000_000) return { value: `$${(n / 1_000_000_000).toFixed(1)}`, unit: 'B' };
	if (n >= 1_000_000) return { value: `$${(n / 1_000_000).toFixed(1)}`, unit: 'M' };
	if (n >= 1_000) return { value: `$${(n / 1_000).toFixed(0)}`, unit: 'K' };
	return { value: `$${n.toFixed(0)}`, unit: '' };
}

function formatAmtCompact(n: number): string {
	if (!Number.isFinite(n) || n <= 0) return '—';
	if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
	if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(0)}M`;
	if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
	return `$${n.toFixed(0)}`;
}

function countryCode(countryName: string): string {
	const map: Record<string, string> = {
		'United States': 'US', USA: 'US', 'United Kingdom': 'GB', UK: 'GB',
		Germany: 'DE', France: 'FR', Italy: 'IT', Spain: 'ES', Netherlands: 'NL',
		Sweden: 'SE', Switzerland: 'CH', Belgium: 'BE', Austria: 'AT', Poland: 'PL',
		India: 'IN', China: 'CN', Japan: 'JP', Singapore: 'SG', Australia: 'AU',
		Brazil: 'BR', Canada: 'CA', Portugal: 'PT', Israel: 'IL', 'Saudi Arabia': 'SA',
	};
	return map[countryName] ?? countryName.slice(0, 2).toUpperCase();
}
