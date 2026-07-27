'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { Filter } from 'lucide-react';
import { qk } from '@/lib/query-keys';
import { type Region, REGION_CHIPS, regionOf } from '@/lib/regions';
import { Stat, SectionHead, Empty, Flag } from '@/components/ui/atoms';
import {
	PieDonut, ComboBarLine, Monogram, YearRangeToggle, HBarDrilldown,
	type PieSegment, type ComboPoint, type YearRange, type HBarRow,
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

interface SectorHeatTreeNode extends SectorHeatPoint {
	children: SectorHeatPoint[];
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

interface TypeBreakdownPoint {
	acquisition_type: string;
	deal_count: number;
	total_amount: number;
}

interface AcqResponse { data: AcquisitionRow[]; total: number }

const TYPE_LABELS: Record<string, string> = {
	acquisition: 'Strategic',
	merger: 'Merger',
	asset_purchase: 'Asset purchase',
	other: 'Other',
};

const SECTOR_COLORS = [
	'oklch(58% 0.22 290)', 'oklch(58% 0.22 240)', 'oklch(58% 0.22 160)',
	'oklch(62% 0.18 30)', 'oklch(62% 0.18 60)', 'oklch(62% 0.18 350)',
	'oklch(62% 0.14 140)', 'oklch(62% 0.18 200)',
];

const rangeToPeriod = (r: YearRange): 'ytd' | '12m' | 'all' => (r === 'ytd' ? 'ytd' : 'all');

export function MaDeepDiveTab() {
	const currentYear = new Date().getFullYear();
	const [range, setRange] = useState<YearRange>('10y');
	const [region, setRegion] = useState<Region>('all');
	const [filtersOpen, setFiltersOpen] = useState(false);
	const yearWindow = range === '10y' ? 9 : range === '5y' ? 4 : 0;

	const { data: stats } = useSWR<MaStats>(qk.analytics.maStats(rangeToPeriod(range)), { dedupingInterval: 10 * 60_000 });
	const { data: annual } = useSWR<AnnualPoint[]>(
		qk.analytics.annualMa({ from: currentYear - yearWindow, to: currentYear }),
		{ dedupingInterval: 10 * 60_000 },
	);
	const { data: sectorTree } = useSWR<SectorHeatTreeNode[]>(qk.analytics.maSectorHeatTree(rangeToPeriod(range), 8), { dedupingInterval: 10 * 60_000 });
	const { data: topAcq } = useSWR<TopAcquirer[]>(qk.analytics.topAcquirers(rangeToPeriod(range), 10), { dedupingInterval: 10 * 60_000 });
	const { data: typeBreakdown } = useSWR<TypeBreakdownPoint[]>(qk.analytics.maTypeBreakdown(rangeToPeriod(range)), { dedupingInterval: 10 * 60_000 });
	// Largest disclosed acquisitions — fetch a wider set so the client-side region
	// filter still has enough rows to show a meaningful top list.
	const { data: largestResp } = useSWR<AcqResponse>(
		qk.acquisitions.list({ sort: '-amount_usd', disclosed_only: true, limit: 40 }),
		{ dedupingInterval: 10 * 60_000 },
	);

	const annualChart: ComboPoint[] = useMemo(
		() => (annual ?? []).map((a) => ({ year: String(a.year), amt: a.total_amount, deals: a.deal_count })),
		[annual],
	);

	// M&A-by-sector drilldown rows: pillars with sub-sector children nested.
	const sectorRows: HBarRow[] = useMemo(() => {
		return (sectorTree ?? []).map((s, i) => {
			const color = SECTOR_COLORS[i % SECTOR_COLORS.length];
			return {
				id: s.sector_id,
				label: s.sector_name,
				value: s.total_amount,
				formatted: formatAmtCompact(s.total_amount),
				color,
				children: s.children.map((c) => ({
					id: c.sector_id,
					label: c.sector_name,
					value: c.total_amount,
					formatted: formatAmtCompact(c.total_amount),
					color,
				})),
			};
		});
	}, [sectorTree]);

	// Deal-type donut segments (Strategic / Merger / Asset). Sized by deal count
	// to mirror the design's type split.
	const typeSegments: PieSegment[] = useMemo(() => {
		return (typeBreakdown ?? []).map((t, i) => ({
			name: TYPE_LABELS[t.acquisition_type] ?? t.acquisition_type,
			v: t.deal_count,
			color: SECTOR_COLORS[i % SECTOR_COLORS.length],
			label: t.deal_count.toLocaleString(),
		}));
	}, [typeBreakdown]);

	// Region filter (client-side, by acquiree HQ country), then top 8.
	const largest = useMemo(() => {
		const all = largestResp?.data ?? [];
		const filtered = region === 'all' ? all : all.filter((d) => regionOf(d.hq_country ?? '') === region);
		return filtered.slice(0, 8);
	}, [largestResp, region]);

	const totalValue = useMemo(() => (annual ?? []).reduce((s, a) => s + a.total_amount, 0), [annual]);
	const totalDeals = useMemo(() => (annual ?? []).reduce((s, a) => s + a.deal_count, 0), [annual]);

	// KPI sparkline series, derived from the annual series (chronological).
	const annualSorted = useMemo(() => (annual ?? []).slice().sort((a, b) => a.year - b.year), [annual]);
	const valueSpark = useMemo(() => annualSorted.map((a) => a.total_amount), [annualSorted]);
	const dealsSpark = useMemo(() => annualSorted.map((a) => a.deal_count), [annualSorted]);

	return (
		<>
			<div className="an-toolbar">
				<h2>M&amp;A Deep Dive</h2>
				<div style={{ position: 'relative' }}>
					<button className="btn ghost" onClick={() => setFiltersOpen((o) => !o)} aria-expanded={filtersOpen}>
						<Filter size={12} /> Filters
					</button>
					{filtersOpen && (
						<div
							className="card"
							style={{ position: 'absolute', right: 0, top: 'calc(100% + 6px)', zIndex: 20, padding: 12, minWidth: 200, display: 'flex', flexDirection: 'column', gap: 6 }}
						>
							<div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--fg-muted)', marginBottom: 2 }}>Time range</div>
							<div className="filter-bar">
								{(['10y', '5y', 'ytd'] as YearRange[]).map((r) => (
									<button key={r} className={`chip ${range === r ? 'on' : ''}`} onClick={() => setRange(r)}>
										{r === '10y' ? '10 yr' : r === '5y' ? '5 yr' : 'YTD'}
									</button>
								))}
							</div>
							<div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--fg-muted)', margin: '6px 0 2px' }}>Region · largest deals</div>
							<div className="filter-bar">
								{REGION_CHIPS.map(([v, l]) => (
									<button key={v} className={`chip ${region === v ? 'on' : ''}`} onClick={() => setRegion(v)}>{l}</button>
								))}
							</div>
						</div>
					)}
				</div>
			</div>

			<div className="grid-4" style={{ marginBottom: 'var(--space-5)' }}>
				<div className="card feature" style={{ padding: 'var(--space-4)' }}>
					<Stat
						label="Disclosed value"
						value={splitAmt(totalValue).value}
						unit={splitAmt(totalValue).unit}
						delta={`across ${totalDeals.toLocaleString()} deals`}
						deltaDir="pos"
						spark={valueSpark}
					/>
				</div>
				<div className="card feature" style={{ padding: 'var(--space-4)' }}>
					<Stat
						label="Acquisitions"
						value={totalDeals.toLocaleString()}
						delta="closed deals"
						deltaDir="pos"
						spark={dealsSpark}
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
						label="Strategic share"
						value={(stats?.acquisition_pct ?? 0).toString()}
						unit="%"
						delta={`vs ${100 - (stats?.acquisition_pct ?? 0)}% other`}
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

			<div className="grid-2" style={{ marginBottom: 'var(--space-5)' }}>
				<div className="card">
					<SectionHead title="M&A by Sector" action={<YearRangeToggle value={range} onChange={setRange} />} />
					<div className="card-pad">
						{sectorRows.length === 0
							? <Empty msg="No sector data yet." />
							: <HBarDrilldown rows={sectorRows} />}
					</div>
				</div>

				<div className="card">
					<SectionHead title="Deal Type" meta="strategic vs merger vs asset" />
					<div className="card-pad">
						{typeSegments.length === 0
							? <Empty msg="No deal-type data yet." />
							: <PieDonut segments={typeSegments} mode="donut" />}
					</div>
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
