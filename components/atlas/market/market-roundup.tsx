'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { qk } from '@/lib/query-keys';
import { Card, Loading, Badge } from '@/components/atlas/kit';
import { MONTHS } from '@/components/atlas/catalog';
import { PieDonut, PieLegend, type PieSegment } from '@/components/ui/analytics-charts';
import { fmtUsd, fmtCount, paletteAt } from './market-shared';

interface Grouping { label: string; deal_count: number; total_amount: number }
interface RoundupStats {
	total_amount: number; deal_count: number; largest_amount: number; largest_company: string | null;
	ma_count: number; ma_value: number; prev_total_amount: number; prev_deal_count: number;
}
interface NewsItem {
	id: string; section: string; category: string | null; headline: string;
	body: string | null; org: string | null; geo: string | null; source_url: string | null;
}
interface Roundup {
	year: number; month: number;
	edition: { title: string | null; summary: string | null } | null;
	news: NewsItem[]; stats: RoundupStats;
	by_sector: Grouping[]; by_round_type: Grouping[]; by_geo: Grouping[];
}
interface Deal {
	id: string; company_name: string | null; hq_city: string | null; hq_country: string | null;
	round_type_name: string | null; amount_usd: string | number | null;
}

const pad = (n: number) => String(n).padStart(2, '0');
const YEARS: [string, string][] = (() => {
	const now = new Date().getUTCFullYear();
	const out: [string, string][] = [];
	for (let y = now; y >= now - 6; y--) out.push([String(y), String(y)]);
	return out;
})();

/** Latest complete month (previous calendar month). */
function defaultMonth(): { year: number; month: number } {
	const d = new Date();
	const m0 = d.getUTCMonth(); // 0-based current
	return m0 === 0 ? { year: d.getUTCFullYear() - 1, month: 12 } : { year: d.getUTCFullYear(), month: m0 };
}

/**
 * Market → Monthly Roundup. Editorial header + curated news (from
 * /api/market/roundup) plus live-aggregated KPIs, donuts and the top-deals table
 * for the selected month.
 */
export function MarketRoundup() {
	const init = defaultMonth();
	const [year, setYear] = useState(init.year);
	const [month, setMonth] = useState(init.month);

	const roundup = useSWR<Roundup>(qk.market.roundup({ year, month }));
	const start = `${year}-${pad(month)}-01`;
	const end = month === 12 ? `${year + 1}-01-01` : `${year}-${pad(month + 1)}-01`;
	const deals = useSWR<{ data: Deal[] }>(qk.deals.list({ from: start, to: end, sort: '-amount_usd', limit: 10 }));

	const monthName = MONTHS.find(([v]) => v === String(month))?.[1] ?? '';
	const s = roundup.data?.stats;

	const summary = useMemo(() => {
		if (roundup.data?.edition?.summary) return roundup.data.edition.summary;
		if (!s) return '';
		const lead = s.largest_company && s.largest_amount > 0
			? `, led by ${s.largest_company}'s ${fmtUsd(s.largest_amount)} round`
			: '';
		return `In ${monthName} ${year}, ${fmtCount(s.deal_count)} disclosed deal${s.deal_count === 1 ? '' : 's'} totalling ${fmtUsd(s.total_amount)} were recorded across the sports-tech market${lead}.`;
	}, [roundup.data, s, monthName, year]);

	const donuts = useMemo(() => {
		const d = roundup.data;
		if (!d) return [] as { title: string; total: string; unit: string; segments: PieSegment[] }[];
		const bySector: PieSegment[] = d.by_sector.map((g, i) => ({ name: g.label, v: g.total_amount, color: paletteAt(i), label: fmtUsd(g.total_amount) }));
		const byRound: PieSegment[] = d.by_round_type.map((g, i) => ({ name: g.label, v: g.deal_count, color: paletteAt(i), label: fmtCount(g.deal_count) }));
		const byGeo: PieSegment[] = d.by_geo.map((g, i) => ({ name: g.label, v: g.total_amount, color: paletteAt(i), label: fmtUsd(g.total_amount) }));
		return [
			{ title: 'Capital by sector', total: fmtUsd(d.stats.total_amount), unit: 'raised', segments: bySector },
			{ title: 'Deals by stage', total: fmtCount(d.stats.deal_count), unit: 'deals', segments: byRound },
			{ title: 'Capital by geography', total: fmtUsd(d.stats.total_amount), unit: 'raised', segments: byGeo },
		];
	}, [roundup.data]);

	const sections = useMemo(() => {
		const news = roundup.data?.news ?? [];
		const map = new Map<string, NewsItem[]>();
		for (const n of news) { const arr = map.get(n.section) ?? []; arr.push(n); map.set(n.section, arr); }
		return [...map.entries()];
	}, [roundup.data]);

	const archive = useMemo(() => {
		const out: { year: number; month: number; label: string }[] = [];
		let y = init.year, m = init.month;
		for (let i = 0; i < 12; i++) {
			out.push({ year: y, month: m, label: `${MONTHS.find(([v]) => v === String(m))?.[1]} ${y}` });
			m -= 1; if (m < 1) { m = 12; y -= 1; }
		}
		return out;
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return (
		<div style={{ display: 'grid', gap: 24 }}>
			{/* Header + month/year */}
			<div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
				<div>
					<div style={{ fontSize: 20, fontWeight: 600, color: 'var(--a-ink)', marginBottom: 4 }}>{roundup.data?.edition?.title || `${monthName} ${year} roundup`}</div>
					<div style={{ fontSize: 14, color: 'var(--a-muted)' }}>The most relevant developments across the global sports-tech market.</div>
				</div>
				<div style={{ display: 'flex', gap: 10 }}>
					<select className="atlas-select" value={String(month)} onChange={(e) => setMonth(Number(e.target.value))} style={{ width: 140 }}>
						{MONTHS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
					</select>
					<select className="atlas-select" value={String(year)} onChange={(e) => setYear(Number(e.target.value))} style={{ width: 100 }}>
						{YEARS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
					</select>
				</div>
			</div>

			{roundup.isLoading ? <Loading /> : (
				<>
					{/* KPIs */}
					<div className="mkt-kpis">
						<Kpi k="Capital raised" v={fmtUsd(s?.total_amount)} delta={deltaPct(s?.total_amount, s?.prev_total_amount)} />
						<Kpi k="Disclosed deals" v={fmtCount(s?.deal_count)} delta={deltaAbs(s?.deal_count, s?.prev_deal_count)} />
						<Kpi k="Largest round" v={fmtUsd(s?.largest_amount)} note={s?.largest_company ?? undefined} />
					</div>

					{/* Summary */}
					{summary && (
						<div className="mkt-summary">
							<div className="mkt-summary-t">Summary</div>
							<div className="mkt-summary-b">{summary}</div>
						</div>
					)}

					{/* Donuts */}
					<div className="mkt-donuts">
						{donuts.map((d) => (
							<Card key={d.title} style={{ padding: '20px 22px' }}>
								<div className="mkt-card-title">{d.title}</div>
								<div className="mkt-card-note">This month</div>
								{d.segments.length === 0 ? <div style={{ fontSize: 13, color: 'var(--a-faint)' }}>No data.</div> : (
									<div className="mkt-donut-row">
										<div style={{ position: 'relative', flex: 'none' }}>
											<PieDonut mode="donut" size={140} segments={d.segments} showLabelOnLargest={false} />
											<div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
												<div style={{ fontSize: 15, fontWeight: 600, color: 'var(--a-ink)' }}>{d.total}</div>
												<div style={{ fontSize: 11, color: 'var(--a-faint)' }}>{d.unit}</div>
											</div>
										</div>
										<div style={{ flex: 1, minWidth: 150 }}><PieLegend segments={d.segments.slice(0, 6)} /></div>
									</div>
								)}
							</Card>
						))}
					</div>

					{/* Deals table */}
					<Card style={{ padding: '4px 22px 8px' }}>
						<div className="mkt-card-head" style={{ paddingTop: 18 }}><div className="mkt-card-title">Largest rounds this month</div></div>
						{deals.isLoading ? <Loading /> : (deals.data?.data.length ?? 0) === 0
							? <div style={{ fontSize: 13, color: 'var(--a-faint)', padding: '8px 0 16px' }}>No disclosed deals recorded for {monthName} {year}.</div>
							: (
								<div className="mkt-table">
									<div className="mkt-thead">
										<span className="mkt-rank">#</span>
										<span className="mkt-tname">Company</span>
										<span className="mkt-tcol hide-sm" style={{ width: 150 }}>Location</span>
										<span className="mkt-tcol hide-sm" style={{ width: 150 }}>Round</span>
										<span className="mkt-tamt" style={{ width: 90 }}>Amount</span>
									</div>
									{deals.data!.data.map((d, i) => (
										<div className="mkt-trow" key={d.id}>
											<span className="mkt-rank">{i + 1}</span>
											<span className="mkt-tname"><span className="mkt-ellipsis" style={{ fontWeight: 600, fontSize: 14 }}>{d.company_name ?? '—'}</span></span>
											<span className="mkt-tcol hide-sm" style={{ width: 150 }}>{[d.hq_city, d.hq_country].filter(Boolean).join(', ') || '—'}</span>
											<span className="mkt-tcol hide-sm" style={{ width: 150 }}>{d.round_type_name ?? '—'}</span>
											<span className="mkt-tamt" style={{ width: 90 }}>{fmtUsd(d.amount_usd == null ? null : Number(d.amount_usd))}</span>
										</div>
									))}
								</div>
							)}
					</Card>

					{/* News sections */}
					{sections.map(([sec, items]) => (
						<div className="mkt-news-sec" key={sec}>
							<div className="mkt-news-sec-h">{sec}</div>
							{items.map((it) => (
								<div className="mkt-news-item" key={it.id}>
									<div className="mkt-news-main">
										<div className="mkt-news-head">{it.headline}</div>
										{it.body && <div className="mkt-news-body">{it.body}</div>}
									</div>
									<div className="mkt-news-tags">
										{it.org && <span className="mkt-tag">{it.org}</span>}
										{it.geo && <span className="mkt-tag">{it.geo}</span>}
										{it.category && <Badge tone="navy">{it.category}</Badge>}
										{it.source_url && <a href={it.source_url} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: 'var(--a-navy)' }}>Source</a>}
									</div>
								</div>
							))}
						</div>
					))}

					{/* Archive */}
					<Card style={{ padding: '20px 22px' }}>
						<div className="mkt-card-head"><div className="mkt-card-title">Archive</div><span style={{ fontSize: 13, color: 'var(--a-faint)' }}>Last 12 months</span></div>
						<div className="mkt-archive">
							{archive.map((a) => (
								<div className="mkt-archive-row" key={`${a.year}-${a.month}`}>
									<span style={{ fontSize: 14, color: 'var(--a-ink)' }}>{a.label}</span>
									<button type="button" onClick={() => { setYear(a.year); setMonth(a.month); }}>View</button>
								</div>
							))}
						</div>
					</Card>
				</>
			)}
		</div>
	);
}

function Kpi({ k, v, delta, note }: { k: string; v: string; delta?: { text: string; dir: 'up' | 'down' | null } | null; note?: string }) {
	return (
		<div className="mkt-kpi">
			<div className="mkt-kpi-v">{v}</div>
			<div className="mkt-kpi-k">{k}</div>
			{delta ? <div className={`mkt-kpi-d ${delta.dir ?? ''}`}>{delta.text} vs prev. month</div> : note ? <div className="mkt-kpi-d">{note}</div> : null}
		</div>
	);
}

function deltaPct(cur?: number, prev?: number): { text: string; dir: 'up' | 'down' | null } | null {
	if (cur == null || prev == null || prev === 0) return null;
	const pct = ((cur - prev) / prev) * 100;
	return { text: `${pct >= 0 ? '+' : ''}${pct.toFixed(0)}%`, dir: pct > 0 ? 'up' : pct < 0 ? 'down' : null };
}
function deltaAbs(cur?: number, prev?: number): { text: string; dir: 'up' | 'down' | null } | null {
	if (cur == null || prev == null) return null;
	const d = cur - prev;
	return { text: `${d >= 0 ? '+' : ''}${d}`, dir: d > 0 ? 'up' : d < 0 ? 'down' : null };
}
