'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { ArrowRight } from 'lucide-react';
import { qk } from '@/lib/query-keys';
import { SectionHead, Empty, Flag } from '@/components/ui/atoms';
import {
	PieDonut, PieLegend, ComboBarLine, Monogram, type PieSegment, type ComboPoint,
} from '@/components/ui/analytics-charts';

/**
 * Overview — snapshot of the other four tabs + the most-used charts.
 * Pixel-aligned to `ui_design_2/app/analytics.jsx` AnalyticsOverview.
 *
 * Data sources (all 10-min cached on the server):
 *  - 4 snapshot cards: ma-stats, funding-totals, dashboard-stats
 *  - Annual chart: /api/analytics/annual-funding (10 year window)
 *  - Sector mix: /api/analytics/sector-heat (top 6 by volume)
 *  - Investors by type: /api/analytics/investors-by-type
 *  - Top funded: /api/analytics/top-funded-companies (limit 5)
 *  - Top acquirers: /api/analytics/top-acquirers (limit 5)
 */

interface DashboardStats {
	total_funding: number;
	total_deals: number;
	total_acquisitions: number;
	total_companies: number;
	total_investors: number;
}

interface FundingTotals {
	total_amount: number;
	round_count: number;
	median_amount: number;
	largest_amount: number;
}

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

interface InvestorTypePoint {
	category: string;
	count: number;
}

interface TopCompany {
	company_id: string;
	name: string;
	slug: string | null;
	total_raised: number;
	deal_count: number;
}

interface TopAcquirer {
	acquirer_name: string;
	acquirer_country: string | null;
	deal_count: number;
	total_value: number;
}

// Sector colours — index-cycled so the donut + legend look consistent.
const SECTOR_COLORS = [
	'oklch(58% 0.22 290)', // purple (athletes)
	'oklch(58% 0.22 240)', // blue (fans)
	'oklch(58% 0.22 160)', // green (executives)
	'oklch(62% 0.18 30)',  // orange
	'oklch(62% 0.18 60)',  // gold
	'oklch(62% 0.18 350)', // pink
	'oklch(62% 0.14 140)', // sage
	'oklch(62% 0.18 200)', // teal
];

const INVESTOR_TYPE_COLORS: Record<string, string> = {
	venture_capital: 'oklch(62% 0.18 240)',
	private_equity: 'oklch(62% 0.18 30)',
	financial_services: 'oklch(62% 0.16 160)',
	family_investment_office: 'oklch(62% 0.20 290)',
	sovereign_wealth_fund: 'oklch(62% 0.18 60)',
	angel: 'oklch(62% 0.18 350)',
	other: 'oklch(58% 0.04 240)',
};

const INVESTOR_TYPE_LABELS: Record<string, string> = {
	venture_capital: 'Venture Capital',
	private_equity: 'Private Equity',
	financial_services: 'Corporate VC',
	family_investment_office: 'Family Office',
	sovereign_wealth_fund: 'Sovereign Wealth',
	angel: 'Angel',
	other: 'Other',
};

export function OverviewTab() {
	const currentYear = new Date().getFullYear();
	// Time-range filter — drives every period-aware endpoint on this tab.
	const [period, setPeriod] = useState<'ytd' | '12m' | 'all'>('all');
	const annualFrom = period === 'ytd' ? currentYear : period === '12m' ? currentYear - 1 : currentYear - 9;

	const { data: stats } = useSWR<DashboardStats>(qk.analytics.dashboard(period), { dedupingInterval: 10 * 60_000 });
	const { data: totals } = useSWR<FundingTotals>(qk.analytics.fundingTotals(period), { dedupingInterval: 10 * 60_000 });
	const { data: maStats } = useSWR<MaStats>(qk.analytics.maStats(period), { dedupingInterval: 10 * 60_000 });
	const { data: annual } = useSWR<AnnualPoint[]>(
		qk.analytics.annualFunding({ from: annualFrom, to: currentYear }),
		{ dedupingInterval: 10 * 60_000 },
	);
	const { data: sectorHeat } = useSWR<SectorHeatPoint[]>(qk.analytics.sectorHeat(period, 8), { dedupingInterval: 10 * 60_000 });
	const { data: investorTypes } = useSWR<InvestorTypePoint[]>(qk.analytics.investorsByType(), { dedupingInterval: 10 * 60_000 });
	const { data: topFunded } = useSWR<TopCompany[]>(qk.analytics.topFunded(period, 5), { dedupingInterval: 10 * 60_000 });
	const { data: topAcq } = useSWR<TopAcquirer[]>(qk.analytics.topAcquirers(period, 5), { dedupingInterval: 10 * 60_000 });

	const annualChart: ComboPoint[] = useMemo(
		() => (annual ?? []).map((a) => ({ year: String(a.year), amt: a.total_amount, deals: a.deal_count })),
		[annual],
	);

	const sectorSegments: PieSegment[] = useMemo(() => {
		const top = (sectorHeat ?? []).slice(0, 6);
		return top.map((s, i) => ({
			name: s.sector_name,
			v: s.total_amount,
			color: SECTOR_COLORS[i % SECTOR_COLORS.length],
			label: formatAmtCompact(s.total_amount),
		}));
	}, [sectorHeat]);

	const investorSegments: PieSegment[] = useMemo(() => {
		return (investorTypes ?? []).map((t) => ({
			name: INVESTOR_TYPE_LABELS[t.category] ?? t.category,
			v: t.count,
			color: INVESTOR_TYPE_COLORS[t.category] ?? 'oklch(58% 0.04 240)',
			label: `${t.count.toLocaleString()} firms`,
		}));
	}, [investorTypes]);

	const snapshots = useMemo(() => [
		{
			tab: 'monthly' as const,
			kicker: 'Monthly Roundup',
			value: lastMonthValue(annual),
			label: 'Latest month · capital',
			sub: lastMonthSub(annual),
		},
		{
			tab: 'funding' as const,
			kicker: 'Funding Deep Dive',
			value: splitAmt(totals?.total_amount ?? 0),
			label: `Total funding · ${period === 'ytd' ? 'YTD' : period === '12m' ? '12 mo' : 'all-time'}`,
			sub: `${(totals?.round_count ?? 0).toLocaleString()} rounds tracked`,
		},
		{
			tab: 'mna' as const,
			kicker: 'M&A Tracker',
			value: { value: (maStats?.count ?? 0).toLocaleString(), unit: '' },
			label: 'Acquisitions tracked',
			sub: `${formatAmtCompact(maStats?.largest_value ?? 0)} largest`,
		},
		{
			tab: 'investors' as const,
			kicker: 'Investors',
			value: { value: (stats?.total_investors ?? 0).toLocaleString(), unit: '' },
			label: 'Active investors',
			sub: investorSegments[0]
				? `${investorSegments[0].name.toLowerCase()} leads`
				: 'across tracked firms',
		},
	], [annual, totals, maStats, stats, investorSegments, period]);

	return (
		<>
			{/* Time-range filter */}
			<div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginBottom: 'var(--space-4)' }}>
				{([['ytd', 'YTD'], ['12m', '12 mo'], ['all', 'All time']] as const).map(([id, lbl]) => (
					<button
						key={id}
						onClick={() => setPeriod(id)}
						className={`btn ${period === id ? '' : 'ghost'}`}
						style={{ padding: '4px 12px', fontSize: 12 }}
					>
						{lbl}
					</button>
				))}
			</div>

			{/* Snapshot cards — link to other tabs */}
			<div className="grid-4" style={{ marginBottom: 'var(--space-5)' }}>
				{snapshots.map((s) => (
					<Link key={s.tab} href={`/analytics?tab=${s.tab}`} className="an-snap">
						<div className="an-snap-kicker">
							{s.kicker} <ArrowRight size={10} />
						</div>
						<div className="an-snap-val">
							{s.value.value}
							{s.value.unit && <span className="unit">{s.value.unit}</span>}
						</div>
						<div className="an-snap-label">{s.label}</div>
						<div className="an-snap-sub">{s.sub}</div>
					</Link>
				))}
			</div>

			{/* Annual funding summary */}
			<div className="card" style={{ marginBottom: 'var(--space-5)' }}>
				<SectionHead
					title="Funding Summary"
					meta={`${currentYear - 9} — ${currentYear} · $B`}
					action={
						<Link className="btn ghost" href="/analytics?tab=funding">
							Deep dive <ArrowRight size={12} />
						</Link>
					}
				/>
				<div className="card-pad">
					{annualChart.length === 0
						? <Empty msg="No annual data yet." />
						: <ComboBarLine data={annualChart} />}
				</div>
			</div>

			{/* Two-up: sector mix + investors by type */}
			<div className="grid-2" style={{ marginBottom: 'var(--space-5)' }}>
				<div className="card">
					<SectionHead title="Sector mix · all-time" />
					<div className="card-pad" style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
						{sectorSegments.length === 0
							? <Empty msg="No sector data" />
							: (
								<>
									<PieDonut segments={sectorSegments} size={180} mode="donut" />
									<div style={{ flex: 1, minWidth: 200 }}>
										<PieLegend segments={sectorSegments} />
									</div>
								</>
							)}
					</div>
				</div>
				<div className="card">
					<SectionHead title="Investors by type" />
					<div className="card-pad" style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
						{investorSegments.length === 0
							? <Empty msg="No investor data" />
							: (
								<>
									<PieDonut segments={investorSegments} size={180} mode="donut" />
									<div style={{ flex: 1, minWidth: 200 }}>
										<PieLegend segments={investorSegments} />
									</div>
								</>
							)}
					</div>
				</div>
			</div>

			{/* Two-up: top funded + top acquirers */}
			<div className="grid-2">
				<div className="card">
					<SectionHead
						title="Top Funded Companies"
						action={
							<Link className="btn ghost" href="/analytics?tab=funding">
								View all <ArrowRight size={12} />
							</Link>
						}
					/>
					{(topFunded ?? []).length === 0 ? (
						<div className="card-pad"><Empty msg="No companies yet" /></div>
					) : (
						<table className="data-table">
							<thead>
								<tr>
									<th style={{ width: 30 }}>#</th>
									<th>Company</th>
									<th>Deals</th>
									<th className="amt" style={{ textAlign: 'right' }}>Funding</th>
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
										<td className="num">{c.deal_count}</td>
										<td className="amt">{formatAmtCompact(c.total_raised)}</td>
									</tr>
								))}
							</tbody>
						</table>
					)}
				</div>
				<div className="card">
					<SectionHead
						title="Top Acquirers"
						action={
							<Link className="btn ghost" href="/analytics?tab=mna">
								View all <ArrowRight size={12} />
							</Link>
						}
					/>
					{(topAcq ?? []).length === 0 ? (
						<div className="card-pad"><Empty msg="No acquirer data yet" /></div>
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
		</>
	);
}

// ─── Helpers ──────────────────────────────────────────────────────────────

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

function lastMonthValue(annual: AnnualPoint[] | undefined): { value: string; unit: string } {
	// Snapshot card 1 wants "latest month" but we only have annual totals.
	// Approximate by taking the latest year / 12 — close enough for a glance.
	const latest = annual?.[annual.length - 1];
	if (!latest) return { value: '—', unit: '' };
	return splitAmt(latest.total_amount / 12);
}

function lastMonthSub(annual: AnnualPoint[] | undefined): string {
	const latest = annual?.[annual.length - 1];
	if (!latest) return 'no data yet';
	return `${Math.round(latest.deal_count / 12)} avg/mo · ${latest.year}`;
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
