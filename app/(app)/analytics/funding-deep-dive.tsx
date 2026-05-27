'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { Filter } from 'lucide-react';
import { qk } from '@/lib/query-keys';
import { Stat, SectionHead, Empty, Flag } from '@/components/ui/atoms';
import {
	PieDonut, ComboBarLine, Monogram, YearRangeToggle,
	type PieSegment, type ComboPoint, type YearRange,
} from '@/components/ui/analytics-charts';

/**
 * Funding deep dive — pixel-aligned to `ui_design_2/app/analytics.jsx`
 * FundingDeepDive. Reads:
 *   - /api/analytics/funding-totals (period-scoped)
 *   - /api/analytics/annual-funding (range-scoped)
 *   - /api/analytics/sector-heat
 *   - /api/analytics/business-model-breakdown
 *   - /api/analytics/world-flow
 *   - /api/analytics/top-funded-companies
 */

interface FundingTotals {
	total_amount: number;
	round_count: number;
	median_amount: number;
	largest_amount: number;
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

interface BizModelPoint {
	business_model: string;
	deal_count: number;
	total_amount: number;
}

interface WorldPoint {
	country: string;
	deal_count: number;
	total_amount: number;
}

interface TopCompany {
	company_id: string;
	name: string;
	slug: string | null;
	total_raised: number;
	deal_count: number;
}

const SECTOR_COLORS = [
	'oklch(58% 0.22 290)', 'oklch(58% 0.22 240)', 'oklch(58% 0.22 160)',
	'oklch(62% 0.18 30)', 'oklch(62% 0.18 60)', 'oklch(62% 0.18 350)',
	'oklch(62% 0.14 140)', 'oklch(62% 0.18 200)',
];

const BIZ_LABELS: Record<string, string> = {
	b2b: 'B2B',
	b2c: 'B2C',
	b2b2c: 'B2B2C',
	d2c: 'D2C',
	b2g: 'B2G',
	other: 'Other',
};

const rangeToPeriod = (r: YearRange): 'ytd' | '12m' | 'all' => (r === 'ytd' ? 'ytd' : 'all');

export function FundingDeepDiveTab() {
	const currentYear = new Date().getFullYear();
	const [range, setRange] = useState<YearRange>('10y');
	const yearWindow = range === '10y' ? 9 : range === '5y' ? 4 : 0;

	const { data: totals } = useSWR<FundingTotals>(qk.analytics.fundingTotals(rangeToPeriod(range)), { dedupingInterval: 10 * 60_000 });
	const { data: annual } = useSWR<AnnualPoint[]>(
		qk.analytics.annualFunding({ from: currentYear - yearWindow, to: currentYear }),
		{ dedupingInterval: 10 * 60_000 },
	);
	const { data: sectorHeat } = useSWR<SectorHeatPoint[]>(qk.analytics.sectorHeat(rangeToPeriod(range), 12), { dedupingInterval: 10 * 60_000 });
	const { data: bizModel } = useSWR<BizModelPoint[]>(qk.analytics.bizModel(rangeToPeriod(range)), { dedupingInterval: 10 * 60_000 });
	const { data: world } = useSWR<WorldPoint[]>(qk.analytics.worldFlow(rangeToPeriod(range), 10), { dedupingInterval: 10 * 60_000 });
	const { data: topFunded } = useSWR<TopCompany[]>(qk.analytics.topFunded(rangeToPeriod(range), 10), { dedupingInterval: 10 * 60_000 });

	const annualChart: ComboPoint[] = useMemo(
		() => (annual ?? []).map((a) => ({ year: String(a.year), amt: a.total_amount, deals: a.deal_count })),
		[annual],
	);

	const sectorSegments: PieSegment[] = useMemo(() => {
		return (sectorHeat ?? []).map((s, i) => ({
			name: s.sector_name,
			v: s.total_amount,
			color: SECTOR_COLORS[i % SECTOR_COLORS.length],
			label: formatAmtCompact(s.total_amount),
		}));
	}, [sectorHeat]);

	const bizSegments: PieSegment[] = useMemo(() => {
		return (bizModel ?? []).map((b, i) => ({
			name: BIZ_LABELS[b.business_model] ?? b.business_model,
			v: b.total_amount,
			color: SECTOR_COLORS[i % SECTOR_COLORS.length],
			label: formatAmtCompact(b.total_amount),
		}));
	}, [bizModel]);

	const total = totals?.total_amount ?? 0;
	const totalRounds = totals?.round_count ?? 0;
	const countriesCount = (world ?? []).filter((w) => w.country).length;
	const largest = totals?.largest_amount ?? 0;

	return (
		<>
			<div className="an-toolbar">
				<h2>Funding Deep Dive</h2>
				<button className="btn ghost"><Filter size={12} /> Filters</button>
			</div>

			{/* KPI strip */}
			<div className="grid-4" style={{ marginBottom: 'var(--space-5)' }}>
				<div className="card feature" style={{ padding: 'var(--space-4)' }}>
					<Stat
						label="Total Funding"
						value={splitAmt(total).value}
						unit={splitAmt(total).unit}
						delta={`across ${totalRounds.toLocaleString()} rounds`}
						deltaDir="pos"
					/>
				</div>
				<div className="card feature" style={{ padding: 'var(--space-4)' }}>
					<Stat
						label="Funding Rounds"
						value={totalRounds.toLocaleString()}
						delta="total deal count"
						deltaDir="pos"
					/>
				</div>
				<div className="card feature" style={{ padding: 'var(--space-4)' }}>
					<Stat
						label="Countries"
						value={countriesCount.toLocaleString()}
						delta="with funded companies"
						deltaDir="pos"
					/>
				</div>
				<div className="card feature" style={{ padding: 'var(--space-4)' }}>
					<Stat
						label="Largest round"
						value={splitAmt(largest).value}
						unit={splitAmt(largest).unit}
						delta="single biggest deal"
						deltaDir="pos"
					/>
				</div>
			</div>

			{/* Annual chart */}
			<div className="card" style={{ marginBottom: 'var(--space-5)' }}>
				<SectionHead
					title="Funding Summary"
					meta="annual funding volume"
					action={<YearRangeToggle value={range} onChange={setRange} />}
				/>
				<div className="card-pad">
					{annualChart.length === 0
						? <Empty msg="No annual data yet." />
						: <ComboBarLine data={annualChart} />}
				</div>
			</div>

			{/* Funding by sector */}
			<div className="card" style={{ marginBottom: 'var(--space-5)' }}>
				<SectionHead
					title="Funding by Sector"
					meta="top sub-sectors by capital deployed"
					action={<YearRangeToggle value={range} onChange={setRange} />}
				/>
				<div className="card-pad">
					{sectorSegments.length === 0
						? <Empty msg="No sector data yet." />
						: <PieDonut segments={sectorSegments} mode="bar" />}
					<div style={{ marginTop: 'var(--space-3)' }}>
						<Link href="/framework" style={{ color: 'var(--accent)', fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-mono)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
							Understand the Framework →
						</Link>
					</div>
				</div>
			</div>

			{/* Business model */}
			<div className="card" style={{ marginBottom: 'var(--space-5)' }}>
				<SectionHead title="Funding by Business Model" action={<YearRangeToggle value={range} onChange={setRange} />} />
				<div className="card-pad">
					{bizSegments.length === 0
						? <Empty msg="No business-model data yet." />
						: <PieDonut segments={bizSegments} mode="bar" />}
				</div>
			</div>

			{/* Top countries */}
			<div className="card" style={{ marginBottom: 'var(--space-5)' }}>
				<SectionHead title="Top Funded Countries" action={<YearRangeToggle value={range} onChange={setRange} />} />
				<div className="card-pad">
					{(world ?? []).length === 0 ? (
						<Empty msg="No country data yet." />
					) : (
						<table className="data-table">
							<thead>
								<tr>
									<th style={{ width: 30 }}>#</th>
									<th>Country</th>
									<th className="amt" style={{ textAlign: 'right' }}>Amount</th>
									<th style={{ textAlign: 'right' }}>Rounds</th>
								</tr>
							</thead>
							<tbody>
								{(world ?? []).map((c, i) => (
									<tr key={c.country}>
										<td className="rank-idx">{i + 1}</td>
										<td>
											<span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
												<Flag cc={countryCode(c.country)} /> {c.country}
											</span>
										</td>
										<td className="amt">{formatAmtCompact(c.total_amount)}</td>
										<td className="num" style={{ textAlign: 'right', color: 'var(--fg-2)' }}>
											{c.deal_count.toLocaleString()}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					)}
				</div>
			</div>

			{/* Top funded companies */}
			<div className="card">
				<SectionHead title="Top Funded Companies" action={<YearRangeToggle value={range} onChange={setRange} />} />
				<div className="card-pad">
					{(topFunded ?? []).length === 0 ? (
						<Empty msg="No companies yet." />
					) : (
						<table className="data-table">
							<thead>
								<tr>
									<th style={{ width: 30 }}>#</th>
									<th>Company</th>
									<th className="amt" style={{ textAlign: 'right' }}>Funding</th>
									<th style={{ textAlign: 'right' }}>Rounds</th>
								</tr>
							</thead>
							<tbody>
								{(topFunded ?? []).map((c, i) => (
									<tr key={c.company_id}>
										<td className="rank-idx">{i + 1}</td>
										<td>
											<div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
												<Monogram name={c.name} />
												<Link
													href={c.slug ? `/companies/${c.slug}` : `/companies/${c.company_id}`}
													style={{ fontWeight: 600 }}
												>
													{c.name}
												</Link>
											</div>
										</td>
										<td className="amt">{formatAmtCompact(c.total_raised)}</td>
										<td className="num" style={{ textAlign: 'right', color: 'var(--fg-2)' }}>
											{c.deal_count}
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
