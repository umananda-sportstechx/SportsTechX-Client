'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { Filter } from 'lucide-react';
import { qk } from '@/lib/query-keys';
import { Stat, SectionHead, Empty, Flag } from '@/components/ui/atoms';
import {
	PieDonut, PieLegend, Monogram, type PieSegment,
} from '@/components/ui/analytics-charts';

interface DashboardStats {
	total_investors: number;
}

interface InvestorTypePoint {
	category: string;
	count: number;
}

interface InvestorRow {
	id: string;
	name: string;
	slug?: string;
	category?: string | null;
	hq_country?: string | null;
	total_aum_usd?: number | string | null;
	deals_count?: number | null;
	year_launched?: number | null;
}

interface InvestorsResponse { data: InvestorRow[]; total: number }

const TYPE_COLORS: Record<string, string> = {
	venture_capital: 'oklch(62% 0.18 240)',
	private_equity: 'oklch(62% 0.18 30)',
	financial_services: 'oklch(62% 0.16 160)',
	family_investment_office: 'oklch(62% 0.20 290)',
	sovereign_wealth_fund: 'oklch(62% 0.18 60)',
	angel: 'oklch(62% 0.18 350)',
	other: 'oklch(58% 0.04 240)',
};

const GEO_COLORS = [
	'oklch(58% 0.22 240)', 'oklch(58% 0.22 290)', 'oklch(58% 0.22 160)',
	'oklch(62% 0.18 30)', 'oklch(62% 0.18 60)', 'oklch(62% 0.18 350)',
	'oklch(62% 0.14 140)', 'oklch(58% 0.04 240)',
];

const TYPE_LABELS: Record<string, string> = {
	venture_capital: 'Venture Capital',
	private_equity: 'Private Equity',
	financial_services: 'Corporate VC',
	family_investment_office: 'Family Office',
	sovereign_wealth_fund: 'Sovereign Wealth',
	angel: 'Angel',
	other: 'Other',
};

export function InvestorsTab() {
	const { data: stats } = useSWR<DashboardStats>(qk.analytics.dashboard('all'), { dedupingInterval: 10 * 60_000 });
	const { data: investorTypes } = useSWR<InvestorTypePoint[]>(qk.analytics.investorsByType(), { dedupingInterval: 10 * 60_000 });
	const { data: list } = useSWR<InvestorsResponse>(
		qk.investors.list({ limit: 25, sort: '-created_at' }),
		{ dedupingInterval: 10 * 60_000 },
	);

	const typeSegments: PieSegment[] = useMemo(() => {
		return (investorTypes ?? []).map((t) => ({
			name: TYPE_LABELS[t.category] ?? t.category,
			v: t.count,
			color: TYPE_COLORS[t.category] ?? 'oklch(58% 0.04 240)',
			label: `${t.count.toLocaleString()} firms`,
		}));
	}, [investorTypes]);

	const investors = list?.data ?? [];

	// By-geography breakdown — aggregated client-side off the fetched investor
	// sample's `hq_country` (no dedicated investor-geo endpoint).
	const geoSegments: PieSegment[] = useMemo(() => {
		const buckets = new Map<string, number>();
		for (const inv of investors) {
			const country = inv.hq_country;
			if (!country) continue;
			buckets.set(country, (buckets.get(country) ?? 0) + 1);
		}
		return Array.from(buckets.entries())
			.sort((a, b) => b[1] - a[1])
			.slice(0, 8)
			.map(([name, count], i) => ({
				name,
				v: count,
				color: GEO_COLORS[i % GEO_COLORS.length],
				label: count.toLocaleString(),
			}));
	}, [investors]);

	const totalAum = investors.reduce((s, i) => s + Number(i.total_aum_usd ?? 0), 0);
	const totalInvestors = stats?.total_investors ?? list?.total ?? 0;
	const topType = typeSegments[0];

	// Rank investors by deal count (fallback to AUM when unset)
	const ranked = useMemo(() => {
		return [...investors].sort((a, b) => {
			const ac = a.deals_count ?? 0;
			const bc = b.deals_count ?? 0;
			if (ac !== bc) return bc - ac;
			return Number(b.total_aum_usd ?? 0) - Number(a.total_aum_usd ?? 0);
		});
	}, [investors]);

	return (
		<>
			<div className="an-toolbar">
				<h2>Investors</h2>
				<button className="btn ghost"><Filter size={12} /> Filters</button>
			</div>

			{/* KPI strip */}
			<div className="grid-4" style={{ marginBottom: 'var(--space-5)' }}>
				<div className="card feature" style={{ padding: 'var(--space-4)' }}>
					<Stat
						label="Active investors"
						value={totalInvestors.toLocaleString()}
						delta="tracked firms"
						deltaDir="pos"
					/>
				</div>
				<div className="card feature" style={{ padding: 'var(--space-4)' }}>
					<Stat
						label="Tracked AUM"
						value={splitAmt(totalAum).value}
						unit={splitAmt(totalAum).unit}
						delta="across sample"
						deltaDir="pos"
					/>
				</div>
				<div className="card feature" style={{ padding: 'var(--space-4)' }}>
					<Stat
						label="Dominant type"
						value={topType?.name ?? '—'}
						delta={topType ? topType.label ?? '' : ''}
						deltaDir="pos"
					/>
				</div>
				<div className="card feature" style={{ padding: 'var(--space-4)' }}>
					<Stat
						label="Most active"
						value={ranked[0]?.name ?? '—'}
						delta={ranked[0]?.deals_count ? `${ranked[0].deals_count} deals` : ''}
						deltaDir="pos"
					/>
				</div>
			</div>

			{/* Investors by type + by geography */}
			<div className="grid-2" style={{ marginBottom: 'var(--space-5)' }}>
				<div className="card">
					<SectionHead title="Investors by Type" meta="distribution across the universe" />
					<div className="card-pad" style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
						{typeSegments.length === 0
							? <Empty msg="No investor type data" />
							: (
								<>
									<PieDonut segments={typeSegments} size={180} mode="donut" />
									<div style={{ flex: 1, minWidth: 200 }}>
										<PieLegend segments={typeSegments} />
									</div>
								</>
							)}
					</div>
				</div>
				<div className="card">
					<SectionHead title="By Geography" meta="HQ country of tracked firms" />
					<div className="card-pad">
						{geoSegments.length === 0
							? <Empty msg="No geography data" />
							: <PieDonut segments={geoSegments} mode="bar" />}
					</div>
				</div>
			</div>

			{/* Leaderboard */}
			<div className="card">
				<SectionHead title="Most active investors" meta={`${ranked.length} ranked`} />
				<div className="card-pad">
					{ranked.length === 0 ? (
						<Empty msg="No investor data yet." />
					) : (
						<table className="data-table">
							<thead>
								<tr>
									<th style={{ width: 30 }}>#</th>
									<th>Investor</th>
									<th>Type</th>
									<th>HQ</th>
									<th style={{ textAlign: 'right' }}>Deals</th>
									<th className="amt" style={{ textAlign: 'right' }}>AUM</th>
								</tr>
							</thead>
							<tbody>
								{ranked.slice(0, 15).map((inv, i) => (
									<tr key={inv.id}>
										<td className="rank-idx">{i + 1}</td>
										<td>
											<div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
												<Monogram name={inv.name} color={TYPE_COLORS[inv.category ?? 'other']} />
												<Link
													href={`/investors/${inv.slug ?? inv.id}`}
													style={{ fontWeight: 600 }}
												>
													{inv.name}
												</Link>
											</div>
										</td>
										<td style={{ color: 'var(--fg-2)', fontSize: 12 }}>
											{TYPE_LABELS[inv.category ?? 'other'] ?? '—'}
										</td>
										<td>{inv.hq_country ? <Flag cc={countryCode(inv.hq_country)} /> : <span style={{ color: 'var(--fg-muted)' }}>—</span>}</td>
										<td className="num" style={{ textAlign: 'right' }}>
											{inv.deals_count ?? 0}
										</td>
										<td className="amt">{formatAmtCompact(Number(inv.total_aum_usd ?? 0))}</td>
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
