'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { qk } from '@/lib/query-keys';
import { Card, Loading, Logo, ComboBarLine, PieDonut, HBarDrilldown, type ComboPoint, type PieSegment, type HBarRow, Seg, barAt, BAR_ACCENT } from '@/components/atlas';
import { fmtUsd, fmtUsdB, fmtCount } from './format';

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
const BAR_TOP = 'var(--a-chart-bar-top)';
const BAR_BOTTOM = 'var(--a-chart-bar-bottom)';

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
		color: barAt(i),
		children: (n.children ?? []).map((c) => ({ id: c.sector_id, label: c.sector_name, value: c.total_amount, formatted: fmtUsd(c.total_amount) })),
	})), [tree.data]);

	const bizSegments = useMemo<PieSegment[]>(() => (biz.data ?? []).map((r) => ({
		name: r.business_model.toUpperCase(), v: r.total_amount, color: BAR_ACCENT, label: fmtUsd(r.total_amount),
	})), [biz.data]);
	const geoSegments = useMemo<PieSegment[]>(() => (geo.data ?? []).map((r) => ({
		name: r.country, v: r.total_amount, color: BAR_ACCENT, label: fmtUsd(r.total_amount),
	})), [geo.data]);

	const loadingCore = funding.isLoading || ma.isLoading;

	return (
		<div style={{ display: 'grid', gap: 22 }}>
			{/* Controls */}
			<div className="atlas-controls">
				<Seg<Series>
					ariaLabel="Series" value={series} onChange={setSeries}
					options={[{ key: 'funding', label: 'Funding' }, { key: 'ma', label: 'M&A' }, { key: 'total', label: 'Total' }]}
				/>
				<Seg<Range>
					ariaLabel="Range" value={range} onChange={setRange}
					options={[{ key: '10y', label: '10 yrs' }, { key: '5y', label: '5 yrs' }, { key: 'ytd', label: 'YTD' }]}
				/>
			</div>

			{/* KPIs */}
			<div className="atlas-kpis">
				<Kpi k={`Total ${series === 'ma' ? 'M&A value' : series === 'total' ? 'capital' : 'funding'}`} v={fmtUsd(stats.grand)} note={rangeLabel(range)} />
				<Kpi k="Latest year" v={fmtUsd(stats.last?.amt)} note={stats.last ? `${stats.last.year} · ${fmtCount(stats.last.deals)} ${lineLabel.toLowerCase()}` : '—'} />
				<Kpi k={series === 'ma' ? 'Deals recorded' : 'Rounds recorded'} v={fmtCount(stats.deals)} note={rangeLabel(range)} />
				{series === 'total'
					? <Kpi k="M&A share of value" v={`${stats.maShare}%`} note="of total capital" />
					: <Kpi k="Years covered" v={String(chartData.length)} note={`${from}–${to}`} />}
			</div>

			{/* Combo chart */}
			<Card className="atlas-chart-card">
				<div className="atlas-chart-card__head">
					<div className="atlas-section-title">{seriesLabel} summary ($B)</div>
					<div className="atlas-section-note">Bars = {series === 'total' ? 'funding + M&A' : seriesLabel.toLowerCase()} value ($B) · Line = {lineLabel.toLowerCase()} · {rangeLabel(range)}</div>
				</div>
				<div className="atlas-chart-card__body">
					{loadingCore ? <Loading /> : (
						<ComboBarLine
							data={chartData}
							valueFormatter={fmtUsdB}
							barGradient
							barColors={[BAR_TOP, BAR_BOTTOM]}
							lineColor="var(--a-chart-line)"
							dotColor="var(--a-chart-dot)"
							showValues={false}
							gridDashed={false}
							barLabel={series === 'total' ? 'Value' : seriesLabel}
							lineLabel={lineLabel}
						/>
					)}
				</div>
			</Card>

			{/* Sector tree */}
			<Card className="atlas-chart-card">
				<div className="atlas-chart-card__head">
					<div className="atlas-section-title">{seriesLabel} by sector</div>
					<div className="atlas-section-note">Drill down into sector and sub-sector value</div>
				</div>
				<div className="atlas-chart-card__body" style={{ paddingTop: 20, paddingBottom: 20 }}>
					{tree.isLoading ? <Loading /> : treeRows.length === 0
						? <div style={{ fontSize: 13, color: 'var(--a-faint)' }}>No data for this period.</div>
						: <div className="atlas-drilldown"><HBarDrilldown rows={treeRows} /></div>}
				</div>
			</Card>

			{/* Breakdowns */}
			<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 27, alignItems: 'start' }}>
				<Card>
					<div className="atlas-section-title">{seriesLabel} by business model</div>
					<div className="atlas-section-note">How capital splits across models</div>
					{biz.isLoading ? <Loading /> : <PieDonut mode="bar" segments={bizSegments} />}
				</Card>
				<Card>
					<div className="atlas-section-title">{seriesLabel} by geography</div>
					<div className="atlas-section-note">Where capital is deployed (top countries)</div>
					{geo.isLoading ? <Loading /> : <PieDonut mode="bar" segments={geoSegments} />}
				</Card>
			</div>

			{/* Top table (hidden on Total) */}
			{series !== 'total' && (
				<Card style={{ padding: '0 23px' }}>
					<div className="atlas-section-head" style={{ padding: '14px 0 12px' }}>
						<div className="atlas-section-title" style={{ fontSize: 16 }}>{series === 'ma' ? 'Largest acquirers' : 'Top funded companies'}</div>
					</div>
					{(series === 'funding' ? topFunded.isLoading : topAcq.isLoading) ? <Loading /> : (
						<div className="atlas-table">
							{series === 'funding'
								? (topFunded.data ?? []).map((c, i) => (
									<div className="atlas-table__row" key={c.company_id}>
										<span className="atlas-table__rank">{i + 1}</span>
										<div className="atlas-table__name">
											<Logo co={{ name: c.name, website: null, custom_logo_url: c.custom_logo_url }} size={28} />
											<div className="atlas-table__name-main"><div className="atlas-ellipsis" style={{ fontFamily: 'var(--a-font)', fontWeight: 700, fontSize: 15 }}>{c.name}</div></div>
										</div>
										<span className="atlas-table__col hide-sm">{fmtCount(c.deal_count)} rounds</span>
										<span className="atlas-table__amount">{fmtUsd(c.total_raised)}</span>
									</div>
								))
								: (topAcq.data ?? []).map((a, i) => (
									<div className="atlas-table__row" key={`${a.acquirer_name}-${i}`}>
										<span className="atlas-table__rank">{i + 1}</span>
										<div className="atlas-table__name"><div className="atlas-table__name-main"><div className="atlas-ellipsis" style={{ fontFamily: 'var(--a-font)', fontWeight: 700, fontSize: 15 }}>{a.acquirer_name}</div>{a.acquirer_country && <div style={{ fontFamily: 'var(--a-body)', fontSize: 10, color: 'var(--a-muted)', marginTop: 3 }}>{a.acquirer_country}</div>}</div></div>
										<span className="atlas-table__col hide-sm">{fmtCount(a.deal_count)} deals</span>
										<span className="atlas-table__amount">{fmtUsd(a.total_value)}</span>
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
		<div className="atlas-kpi">
			<div className="atlas-kpi__label">{k}</div>
			<div className="atlas-kpi__value">{v}</div>
			<div className="atlas-kpi__note">{note}</div>
		</div>
	);
}

function rangeLabel(r: Range): string {
	return r === 'ytd' ? 'Year to date' : r === '5y' ? 'Last 5 years' : 'Last 10 years';
}
