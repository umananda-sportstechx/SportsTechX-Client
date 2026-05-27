'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { qk } from '@/lib/query-keys';
import { SectionHead, Stat, Empty, Tag } from '@/components/ui/atoms';

/**
 * Monthly roundup — pick a month, see deal count + capital deployed +
 * top sectors + top investors for just that window. Reads:
 *   - `/api/analytics/quarterly-capital` (filtered to a single month)
 *   - `/api/analytics/sector-heat` with that month's range applied client-side
 *   - `/api/analytics/top-funded-companies` for the month
 */

interface QuarterlyPoint {
	year: number;
	quarter: number;
	quarter_label: string;
	total_amount: number;
	deal_count: number;
}

interface DealRow {
	id: string;
	company_name?: string;
	announced_date?: string | null;
	amount_usd?: number | string | null;
	round_type_name?: string | null;
	primary_sector?: string | null;
	lead_investor?: string | null;
}

interface DealsResponse { data: DealRow[]; total: number }

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function MonthlyRoundupTab() {
	const now = new Date();
	const [year, setYear] = useState(now.getFullYear());
	const [month, setMonth] = useState(now.getMonth()); // 0-indexed

	const monthStart = new Date(year, month, 1);
	const monthEnd = new Date(year, month + 1, 0);
	const fromIso = monthStart.toISOString().slice(0, 10);
	const toIso = monthEnd.toISOString().slice(0, 10);

	const { data: monthDeals } = useSWR<DealsResponse>(
		qk.deals.list({
			from: fromIso,
			to: toIso,
			limit: 100,
			sort: '-amount_usd',
		}),
		{ dedupingInterval: 10 * 60_000 },
	);

	const { data: quarters } = useSWR<QuarterlyPoint[]>(
		qk.analytics.quarterly({ from: year - 1, to: year }),
		{ dedupingInterval: 10 * 60_000 },
	);

	const deals = monthDeals?.data ?? [];
	const totalAmount = deals.reduce((s, d) => s + (Number(d.amount_usd) || 0), 0);
	const dealCount = monthDeals?.total ?? deals.length;
	const monthQuarter = quarters?.find((q) => q.year === year && q.quarter === Math.floor(month / 3) + 1);

	const stepMonth = (delta: number) => {
		let m = month + delta;
		let y = year;
		while (m < 0) { m += 12; y--; }
		while (m > 11) { m -= 12; y++; }
		setMonth(m);
		setYear(y);
	};

	const topSectors = topByKey(deals, (d) => d.primary_sector ?? null).slice(0, 6);
	const topInvestors = topByKey(deals, (d) => d.lead_investor ?? null).slice(0, 6);

	return (
		<>
			<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-5)' }}>
				<div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
					<button className="btn ghost" onClick={() => stepMonth(-1)}><ChevronLeft size={14} /></button>
					<div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, minWidth: 160, textAlign: 'center' }}>
						{MONTHS[month]} {year}
					</div>
					<button className="btn ghost" onClick={() => stepMonth(1)}><ChevronRight size={14} /></button>
				</div>
				<div className="lists-meta">{dealCount} deals · {fromIso} → {toIso}</div>
			</div>

			<div className="grid-4" style={{ marginBottom: 'var(--space-5)' }}>
				<StatCard label="Capital deployed" value={splitDollars(totalAmount)} />
				<StatCard label="Deals announced" value={{ value: dealCount.toString(), unit: '' }} />
				<StatCard
					label="Avg. round"
					value={dealCount > 0 ? splitDollars(totalAmount / dealCount) : { value: '—', unit: '' }}
				/>
				<StatCard
					label="Quarter pace"
					value={monthQuarter ? splitDollars(monthQuarter.total_amount) : { value: '—', unit: '' }}
				/>
			</div>

			<div className="grid-2" style={{ marginBottom: 'var(--space-5)' }}>
				<div className="card">
					<SectionHead title="Top sectors" />
					<RankList items={topSectors} unit="deals" />
				</div>
				<div className="card">
					<SectionHead title="Top lead investors" />
					<RankList items={topInvestors} unit="deals" />
				</div>
			</div>

			<div className="card">
				<SectionHead title="All deals this month" meta={`${dealCount} disclosed`} />
				{deals.length === 0 ? (
					<Empty msg="No deals in this window." />
				) : (
					<table className="data-table">
						<thead>
							<tr>
								<th>Date</th>
								<th>Company</th>
								<th>Sector</th>
								<th>Round</th>
								<th>Lead</th>
								<th style={{ textAlign: 'right' }}>Amount</th>
							</tr>
						</thead>
						<tbody>
							{deals.slice(0, 30).map((d) => (
								<tr key={d.id}>
									<td className="num">{formatShortDate(d.announced_date)}</td>
									<td style={{ fontWeight: 600 }}>{d.company_name ?? '—'}</td>
									<td>{d.primary_sector ? <Tag>{d.primary_sector}</Tag> : '—'}</td>
									<td>{d.round_type_name ? <Tag variant="pos">{d.round_type_name}</Tag> : '—'}</td>
									<td style={{ color: 'var(--fg-2)' }}>{d.lead_investor ?? '—'}</td>
									<td className="num" style={{ textAlign: 'right', fontWeight: 700 }}>
										{formatDollars(d.amount_usd)}
									</td>
								</tr>
							))}
						</tbody>
					</table>
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

function RankList({ items, unit }: { items: Array<{ name: string; count: number }>; unit: string }) {
	if (items.length === 0) return <Empty msg="No data" />;
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
	if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
	if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
	return `$${n.toFixed(0)}`;
}

function formatShortDate(iso: string | null | undefined): string {
	if (!iso) return '—';
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return '—';
	return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
}
