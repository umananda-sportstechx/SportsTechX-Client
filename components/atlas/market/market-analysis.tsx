'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { qk } from '@/lib/query-keys';
import { Card, Loading } from '@/components/atlas/kit';
import { Logo } from '@/components/atlas/entity-logo';
import {
	ComboBarLine, PieDonut, HBarDrilldown,
	type ComboPoint, type PieSegment, type HBarRow,
} from '@/components/ui/analytics-charts';
import { Seg, fmtUsd, fmtUsdB, fmtCount, paletteAt } from './market-shared';

type Series = 'funding' | 'ma' | 'total';
type Range = '10y' | '5y' | 'ytd';
type Period = 'ytd' | '12m' | 'all';

interface AnnualPoint { year: number; total_amount: number; deal_count: number }
interface TreeLeaf { sector_id: string; sector_name: string; total_amount: number; deal_count: number }
interface TreeNode extends TreeLeaf { children: TreeLeaf[] }
interface BizRow { business_model: string; deal_count: number; total_amount: number }
interface GeoRow { country: string; deal_count: number; total_amount: number }
interface TopFunded { company_id: string; name: string; slug: string | null; custom_logo_url: string | null; total_raised: number; deal_count: number }
interface TopAcquirer { acquirer_name: string; acquirer_country: string | null; deal_count: number; total_value: number }

const rangeToPeriod: Record<Range, Period> = { '10y': 'all', '5y': '12m', ytd: 'ytd' };
const NAVY = 'var(--a-navy)';
const BLUE = 'var(--a-blue)';

/**
 * Market → Analysis. General sports-tech market analytics from the public
 * /api/analytics/* endpoints: a funding/M&A/total combo chart over time, a
 * sector drill-down, business-model + geography breakdowns, and a top table.
 */
export function MarketAnalysis() {
	const [series, setSeries] = useState<Series>('funding');
	const [range, setRange] = useState<Range>('10y');

	const now = new Date().getUTCFullYear();
	const to = now;
	const from = range === 'ytd' ? now : range === '5y' ? now - 4 : now - 9;
	const period = rangeToPeriod[range];

	const funding = useSWR<AnnualPoint[]>(qk.analytics.annualFunding({ from, to }));
	const ma = useSWR<AnnualPoint[]>(qk.analytics.annualMa({ from, to }));
	const tree = useSWR<TreeNode[]>(series === 'ma' ? qk.analytics.maSectorHeatTree(period, 8) : qk.analytics.sectorHeatTree(period, 8));
	const biz = useSWR<BizRow[]>(qk.analytics.bizModel(period));
	const geo = useSWR<GeoRow[]>(qk.analytics.worldFlow(period, 8));
	const topFunded = useSWR<TopFunded[]>(series === 'funding' ? qk.analytics.topFunded(period, 10) : null);
	const topAcq = useSWR<TopAcquirer[]>(series === 'ma' ? qk.analytics.topAcquirers(period, 10) : null);

	const seriesLabel = series === 'ma' ? 'M&A' : series === 'total' ? 'Total' : 'Funding';
	const lineLabel = series === 'ma' ? 'Deals' : 'Rounds';

	// Merge funding + M&A per year → the chart points for the active series.
	const chartData = useMemo<ComboPoint[]>(() => {
		const f = new Map((funding.data ?? []).map((r) => [r.year, r]));
		const m = new Map((ma.data ?? []).map((r) => [r.year, r]));
		const years: number[] = [];
		for (let y = from; y <= to; y++) years.push(y);
		return years.map((y) => {
			const fr = f.get(y); const mr = m.get(y);
			if (series === 'funding') return { year: y, amt: fr?.total_amount ?? 0, deals: fr?.deal_count ?? 0 };
			if (series === 'ma') return { year: y, amt: mr?.total_amount ?? 0, deals: mr?.deal_count ?? 0 };
			return { year: y, amt: (fr?.total_amount ?? 0) + (mr?.total_amount ?? 0), deals: (fr?.deal_count ?? 0) + (mr?.deal_count ?? 0) };
		});
	}, [funding.data, ma.data, series, from, to]);

	const stats = useMemo(() => {
		const grand = chartData.reduce((s, d) => s + d.amt, 0);
		const deals = chartData.reduce((s, d) => s + d.deals, 0);
		const last = chartData[chartData.length - 1];
		const fundTotal = (funding.data ?? []).reduce((s, r) => s + r.total_amount, 0);
		const maTotal = (ma.data ?? []).reduce((s, r) => s + r.total_amount, 0);
		const maShare = fundTotal + maTotal > 0 ? Math.round((maTotal / (fundTotal + maTotal)) * 100) : 0;
		return { grand, deals, last, maShare };
	}, [chartData, funding.data, ma.data]);

	const treeRows = useMemo<HBarRow[]>(() => (tree.data ?? []).map((n, i) => ({
		id: n.sector_id,
		label: n.sector_name,
		value: n.total_amount,
		formatted: fmtUsd(n.total_amount),
		color: paletteAt(i),
		children: (n.children ?? []).map((c) => ({ id: c.sector_id, label: c.sector_name, value: c.total_amount, formatted: fmtUsd(c.total_amount) })),
	})), [tree.data]);

	const bizSegments = useMemo<PieSegment[]>(() => (biz.data ?? []).map((r, i) => ({
		name: r.business_model.toUpperCase(), v: r.total_amount, color: paletteAt(i), label: fmtUsd(r.total_amount),
	})), [biz.data]);
	const geoSegments = useMemo<PieSegment[]>(() => (geo.data ?? []).map((r, i) => ({
		name: r.country, v: r.total_amount, color: paletteAt(i), label: fmtUsd(r.total_amount),
	})), [geo.data]);

	const loadingCore = funding.isLoading || ma.isLoading;

	return (
		<div style={{ display: 'grid', gap: 22 }}>
			{/* Controls */}
			<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
				<Seg<Series>
					value={series} onChange={setSeries}
					options={[{ value: 'funding', label: 'Funding' }, { value: 'ma', label: 'M&A' }, { value: 'total', label: 'Total' }]}
				/>
				<Seg<Range> pill
					value={range} onChange={setRange}
					options={[{ value: '10y', label: '10 yrs' }, { value: '5y', label: '5 yrs' }, { value: 'ytd', label: 'YTD' }]}
				/>
			</div>

			{/* KPIs */}
			<div className="mkt-kpis">
				<Kpi k={`Total ${series === 'ma' ? 'M&A value' : series === 'total' ? 'capital' : 'funding'}`} v={fmtUsd(stats.grand)} note={rangeLabel(range)} />
				<Kpi k="Latest year" v={fmtUsd(stats.last?.amt)} note={stats.last ? `${stats.last.year} · ${fmtCount(stats.last.deals)} ${lineLabel.toLowerCase()}` : '—'} />
				<Kpi k={series === 'ma' ? 'Deals recorded' : 'Rounds recorded'} v={fmtCount(stats.deals)} note={rangeLabel(range)} />
				{series === 'total'
					? <Kpi k="M&A share of value" v={`${stats.maShare}%`} note="of total capital" />
					: <Kpi k="Years covered" v={String(chartData.length)} note={`${from}–${to}`} />}
			</div>

			{/* Combo chart */}
			<Card style={{ padding: '22px 24px 18px' }}>
				<div className="mkt-card-head">
					<div className="mkt-card-title">{seriesLabel} summary</div>
				</div>
				<div className="mkt-card-note">Bars = {series === 'total' ? 'funding + M&A' : seriesLabel.toLowerCase()} value ($B) · Line = {lineLabel.toLowerCase()} · {rangeLabel(range)}</div>
				{loadingCore ? <Loading /> : (
					<ComboBarLine
						data={chartData}
						valueFormatter={fmtUsdB}
						barColors={[NAVY, BLUE]}
						lineColor={NAVY}
						barLabel={series === 'total' ? 'Value' : seriesLabel}
						lineLabel={lineLabel}
					/>
				)}
			</Card>

			{/* Sector tree */}
			<Card style={{ padding: '22px 24px 20px' }}>
				<div className="mkt-card-head"><div className="mkt-card-title">{seriesLabel} by sector</div></div>
				<div className="mkt-card-note">Drill down into sector and sub-sector value</div>
				{tree.isLoading ? <Loading /> : treeRows.length === 0
					? <div style={{ fontSize: 13, color: 'var(--a-faint)' }}>No data for this period.</div>
					: <div className="mkt-hbar"><HBarDrilldown rows={treeRows} /></div>}
			</Card>

			{/* Breakdowns */}
			<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 18, alignItems: 'start' }}>
				<Card style={{ padding: '20px 22px' }}>
					<div className="mkt-card-title">{seriesLabel} by business model</div>
					<div className="mkt-card-note">How capital splits across models</div>
					{biz.isLoading ? <Loading /> : <PieDonut mode="bar" segments={bizSegments} />}
				</Card>
				<Card style={{ padding: '20px 22px' }}>
					<div className="mkt-card-title">{seriesLabel} by geography</div>
					<div className="mkt-card-note">Where capital is deployed (top countries)</div>
					{geo.isLoading ? <Loading /> : <PieDonut mode="bar" segments={geoSegments} />}
				</Card>
			</div>

			{/* Top table (hidden on Total) */}
			{series !== 'total' && (
				<Card style={{ padding: '4px 22px 8px' }}>
					<div className="mkt-card-head" style={{ paddingTop: 18 }}>
						<div className="mkt-card-title">{series === 'ma' ? 'Largest acquirers' : 'Top funded companies'}</div>
					</div>
					{(series === 'funding' ? topFunded.isLoading : topAcq.isLoading) ? <Loading /> : (
						<div className="mkt-table">
							{series === 'funding'
								? (topFunded.data ?? []).map((c, i) => (
									<div className="mkt-trow" key={c.company_id}>
										<span className="mkt-rank">{i + 1}</span>
										<div className="mkt-tname">
											<Logo co={{ name: c.name, website: null, custom_logo_url: c.custom_logo_url }} size={28} />
											<div className="mkt-tname-main"><div className="mkt-ellipsis" style={{ fontWeight: 600, fontSize: 14 }}>{c.name}</div></div>
										</div>
										<span className="mkt-tcol hide-sm">{fmtCount(c.deal_count)} rounds</span>
										<span className="mkt-tamt">{fmtUsd(c.total_raised)}</span>
									</div>
								))
								: (topAcq.data ?? []).map((a, i) => (
									<div className="mkt-trow" key={`${a.acquirer_name}-${i}`}>
										<span className="mkt-rank">{i + 1}</span>
										<div className="mkt-tname"><div className="mkt-tname-main"><div className="mkt-ellipsis" style={{ fontWeight: 600, fontSize: 14 }}>{a.acquirer_name}</div>{a.acquirer_country && <div style={{ fontSize: 12, color: 'var(--a-faint)' }}>{a.acquirer_country}</div>}</div></div>
										<span className="mkt-tcol hide-sm">{fmtCount(a.deal_count)} deals</span>
										<span className="mkt-tamt">{fmtUsd(a.total_value)}</span>
									</div>
								))}
						</div>
					)}
				</Card>
			)}

			<div style={{ fontSize: 12, color: 'var(--a-faint)' }}>Figures cover disclosed deals only. Source: SportsTechX research.</div>
		</div>
	);
}

function Kpi({ k, v, note }: { k: string; v: string; note?: string }) {
	return (
		<div className="mkt-kpi">
			<div className="mkt-kpi-v">{v}</div>
			<div className="mkt-kpi-k">{k}</div>
			{note && <div className="mkt-kpi-d">{note}</div>}
		</div>
	);
}

function rangeLabel(r: Range): string {
	return r === 'ytd' ? 'Year to date' : r === '5y' ? 'Last 5 years' : 'Last 10 years';
}
