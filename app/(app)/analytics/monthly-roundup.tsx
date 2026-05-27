'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { qk } from '@/lib/query-keys';
import { Stat, SectionHead, Empty, Tag, Flag } from '@/components/ui/atoms';
import {
	PieDonut, PieLegend, Monogram, SegToggle,
	type PieSegment,
} from '@/components/ui/analytics-charts';

/**
 * Monthly Roundup — pick a month, see KPIs + sector/biz/country breakdowns +
 * top rounds (funding mode) or top acquisitions (M&A mode).
 *
 * Data is computed from real deal/acquisition rows fetched with a date-range
 * filter (`from` / `to` set to the chosen month) — no precomputed monthly
 * endpoint exists yet, so we aggregate client-side on a single month worth
 * of rows.
 */

interface DealRow {
	id: string;
	company_id?: string;
	company_name?: string;
	company_slug?: string;
	announced_date?: string | null;
	amount_usd?: number | string | null;
	round_type_name?: string | null;
	primary_sector?: string | null;
	primary_sector_slug?: string | null;
	business_model?: string | null;
	hq_country?: string | null;
	hq_city?: string | null;
	country_code?: string | null;
	lead_investor?: string | null;
}

interface AcquisitionRow {
	id: string;
	acquiree_name?: string | null;
	acquirer_name?: string | null;
	acquisition_date?: string | null;
	amount_usd?: number | string | null;
	primary_sector?: string | null;
	hq_country?: string | null;
}

interface DealsResponse { data: DealRow[]; total: number }
interface AcqResponse { data: AcquisitionRow[]; total: number }

const MONTHS = [
	'January', 'February', 'March', 'April', 'May', 'June',
	'July', 'August', 'September', 'October', 'November', 'December',
];

const SECTOR_COLORS = [
	'oklch(58% 0.22 290)', 'oklch(58% 0.22 240)', 'oklch(58% 0.22 160)',
	'oklch(62% 0.18 30)', 'oklch(62% 0.18 60)', 'oklch(62% 0.18 350)',
	'oklch(62% 0.14 140)', 'oklch(62% 0.18 200)',
];

const BIZ_LABELS: Record<string, string> = {
	b2b: 'B2B', b2c: 'B2C', b2b2c: 'B2B2C', d2c: 'D2C', b2g: 'B2G', other: 'Other',
};

export function MonthlyRoundupTab() {
	const now = new Date();
	const [type, setType] = useState<'funding' | 'mna'>('funding');
	const [year, setYear] = useState(now.getFullYear());
	const [month, setMonth] = useState(now.getMonth()); // 0-indexed
	const [secMode, setSecMode] = useState<'amount' | 'count'>('amount');
	const [bizMode, setBizMode] = useState<'amount' | 'count'>('amount');
	const [countryMode, setCountryMode] = useState<'amount' | 'count'>('amount');

	// Compute YYYY-MM-DD window for this month
	const monthStart = new Date(Date.UTC(year, month, 1));
	const monthEnd = new Date(Date.UTC(year, month + 1, 0));
	const fromIso = monthStart.toISOString().slice(0, 10);
	const toIso = monthEnd.toISOString().slice(0, 10);

	const { data: dealsResp } = useSWR<DealsResponse>(
		type === 'funding'
			? qk.deals.list({ from: fromIso, to: toIso, limit: 200, sort: '-amount_usd' })
			: null,
		{ dedupingInterval: 10 * 60_000 },
	);

	const { data: acqResp } = useSWR<AcqResponse>(
		type === 'mna'
			? qk.acquisitions.list({ from: fromIso, to: toIso, limit: 200, sort: '-amount_usd' })
			: null,
		{ dedupingInterval: 10 * 60_000 },
	);

	const deals = dealsResp?.data ?? [];
	const acquisitions = acqResp?.data ?? [];

	// KPIs
	const fundingKpis = useMemo(() => {
		const total = deals.reduce((s, d) => s + (Number(d.amount_usd) || 0), 0);
		const count = dealsResp?.total ?? deals.length;
		const avg = count > 0 ? total / count : 0;
		return { total, count, avg };
	}, [deals, dealsResp]);

	const mnaKpis = useMemo(() => {
		const total = acquisitions.reduce((s, a) => s + (Number(a.amount_usd) || 0), 0);
		const count = acqResp?.total ?? acquisitions.length;
		const avg = count > 0 ? total / count : 0;
		return { total, count, avg };
	}, [acquisitions, acqResp]);

	const kpiList = type === 'funding'
		? [
			{ label: 'Total funding', value: splitAmt(fundingKpis.total), sub: `${fundingKpis.count} rounds` },
			{ label: 'Avg. round size', value: splitAmt(fundingKpis.avg), sub: 'mean ticket' },
			{ label: 'Deal count', value: { value: fundingKpis.count.toString(), unit: '' }, sub: 'announced this month' },
		]
		: [
			{ label: 'Disclosed value', value: splitAmt(mnaKpis.total), sub: `${mnaKpis.count} acquisitions` },
			{ label: 'Avg. deal value', value: splitAmt(mnaKpis.avg), sub: 'mean ticket' },
			{ label: 'Acquisitions', value: { value: mnaKpis.count.toString(), unit: '' }, sub: 'closed this month' },
		];

	// Pie breakdowns — sector, business model, country
	const sectorSegments = useMemo(() => {
		if (type === 'funding') return groupSegments(deals, (d) => d.primary_sector, secMode, 'amount_usd');
		return groupSegments(acquisitions, (a) => a.primary_sector, secMode, 'amount_usd');
	}, [type, deals, acquisitions, secMode]);

	const bizSegments = useMemo(() => {
		if (type !== 'funding') return [];
		return groupSegments(deals, (d) => BIZ_LABELS[d.business_model ?? 'other'] ?? d.business_model, bizMode, 'amount_usd');
	}, [type, deals, bizMode]);

	const countrySegments = useMemo(() => {
		if (type === 'funding') return groupSegments(deals, (d) => d.hq_country, countryMode, 'amount_usd');
		return groupSegments(acquisitions, (a) => a.hq_country, countryMode, 'amount_usd');
	}, [type, deals, acquisitions, countryMode]);

	const stepMonth = (delta: number) => {
		let m = month + delta;
		let y = year;
		while (m < 0) { m += 12; y--; }
		while (m > 11) { m -= 12; y++; }
		setMonth(m);
		setYear(y);
	};

	const monthLabel = `${MONTHS[month]} ${year}`;
	const isFunding = type === 'funding';

	return (
		<>
			{/* Filter strip */}
			<div className="filter-bar" style={{ marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
				<SegToggle
					options={[{ value: 'funding', label: 'Funding' }, { value: 'mna', label: 'M&A' }]}
					value={type}
					onChange={(v) => setType(v as 'funding' | 'mna')}
				/>
				<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
					<button className="btn ghost" onClick={() => stepMonth(-1)} aria-label="Previous month">
						<ChevronLeft size={14} />
					</button>
					<div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, minWidth: 160, textAlign: 'center' }}>
						{monthLabel}
					</div>
					<button className="btn ghost" onClick={() => stepMonth(1)} aria-label="Next month">
						<ChevronRight size={14} />
					</button>
				</div>
			</div>

			{/* KPI strip */}
			<div className="grid-3" style={{ marginBottom: 'var(--space-5)' }}>
				{kpiList.map((k, i) => (
					<div key={i} className="card feature" style={{ padding: 'var(--space-4)' }}>
						<Stat
							label={k.label}
							value={k.value.value}
							unit={k.value.unit}
							delta={k.sub}
							deltaDir="pos"
						/>
					</div>
				))}
			</div>

			{/* 3-up pie cards */}
			<div className="grid-3" style={{ marginBottom: 'var(--space-5)' }}>
				<div className="card">
					<SectionHead
						title="By Sector"
						action={<SegToggle options={[{ value: 'amount', label: 'Amount' }, { value: 'count', label: 'Count' }]} value={secMode} onChange={(v) => setSecMode(v as 'amount' | 'count')} />}
					/>
					<div className="card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
						{sectorSegments.length === 0
							? <Empty msg="No data for this window" />
							: <>
								<div style={{ display: 'flex', justifyContent: 'center' }}>
									<PieDonut segments={sectorSegments} size={180} mode="pie" />
								</div>
								<PieLegend segments={sectorSegments} />
							</>}
					</div>
				</div>
				{isFunding && (
					<div className="card">
						<SectionHead
							title="By Business Model"
							action={<SegToggle options={[{ value: 'amount', label: 'Amount' }, { value: 'count', label: 'Count' }]} value={bizMode} onChange={(v) => setBizMode(v as 'amount' | 'count')} />}
						/>
						<div className="card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
							{bizSegments.length === 0
								? <Empty msg="No data for this window" />
								: <>
									<div style={{ display: 'flex', justifyContent: 'center' }}>
										<PieDonut segments={bizSegments} size={180} mode="pie" />
									</div>
									<PieLegend segments={bizSegments} />
								</>}
						</div>
					</div>
				)}
				<div className="card">
					<SectionHead
						title="By Country"
						action={<SegToggle options={[{ value: 'amount', label: 'Amount' }, { value: 'count', label: 'Count' }]} value={countryMode} onChange={(v) => setCountryMode(v as 'amount' | 'count')} />}
					/>
					<div className="card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
						{countrySegments.length === 0
							? <Empty msg="No data for this window" />
							: <>
								<div style={{ display: 'flex', justifyContent: 'center' }}>
									<PieDonut segments={countrySegments} size={180} mode="pie" />
								</div>
								<PieLegend segments={countrySegments} />
							</>}
					</div>
				</div>
			</div>

			{/* Top rounds / acquisitions */}
			{isFunding ? (
				<div className="card">
					<SectionHead title="Top Funding Rounds" meta="largest rounds this month" />
					<div className="card-pad" style={{ paddingTop: 0 }}>
						{deals.length === 0 ? (
							<Empty msg="No deals in this window" />
						) : (
							<table className="data-table">
								<thead>
									<tr>
										<th style={{ width: 30 }}>#</th>
										<th>Company</th>
										<th>Location</th>
										<th>Round</th>
										<th className="amt" style={{ textAlign: 'right' }}>Amount</th>
									</tr>
								</thead>
								<tbody>
									{deals.slice(0, 15).map((d, i) => {
										const cc = d.country_code ?? (d.hq_country ? countryCode(d.hq_country) : '');
										return (
											<tr key={d.id}>
												<td className="rank-idx">{i + 1}</td>
												<td>
													<div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
														<Monogram name={d.company_name ?? '—'} />
														<Link
															href={d.company_slug ? `/companies/${d.company_slug}` : `/deals/${d.id}`}
															style={{ fontWeight: 600 }}
														>
															{d.company_name ?? '—'}
														</Link>
													</div>
												</td>
												<td>
													<span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--fg-2)' }}>
														{cc && <Flag cc={cc} />}{d.hq_city ?? d.hq_country ?? '—'}
													</span>
												</td>
												<td>{d.round_type_name ? <Tag>{d.round_type_name}</Tag> : '—'}</td>
												<td className="amt">{formatAmtCompact(Number(d.amount_usd) || 0)}</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						)}
					</div>
				</div>
			) : (
				<div className="card">
					<SectionHead title="Top Acquisitions" meta="largest M&A deals this month" />
					<div className="card-pad" style={{ paddingTop: 0 }}>
						{acquisitions.length === 0 ? (
							<Empty msg="No acquisitions in this window" />
						) : (
							<table className="data-table">
								<thead>
									<tr>
										<th style={{ width: 30 }}>#</th>
										<th>Target</th>
										<th>Acquirer</th>
										<th>Location</th>
										<th className="amt" style={{ textAlign: 'right' }}>Value</th>
									</tr>
								</thead>
								<tbody>
									{acquisitions.slice(0, 15).map((a, i) => {
										const cc = a.hq_country ? countryCode(a.hq_country) : '';
										return (
											<tr key={a.id}>
												<td className="rank-idx">{i + 1}</td>
												<td>
													<div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
														<Monogram name={a.acquiree_name ?? '—'} />
														<span style={{ fontWeight: 600 }}>{a.acquiree_name ?? '—'}</span>
													</div>
												</td>
												<td>{a.acquirer_name ?? '—'}</td>
												<td>
													<span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--fg-2)' }}>
														{cc && <Flag cc={cc} />}{a.hq_country ?? '—'}
													</span>
												</td>
												<td className="amt">{formatAmtCompact(Number(a.amount_usd) || 0)}</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						)}
					</div>
				</div>
			)}
		</>
	);
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function groupSegments<T>(
	rows: T[],
	pick: (r: T) => string | null | undefined,
	mode: 'amount' | 'count',
	amountKey: keyof T,
): PieSegment[] {
	const buckets = new Map<string, { amount: number; count: number }>();
	for (const r of rows) {
		const key = pick(r);
		if (!key) continue;
		const cur = buckets.get(key) ?? { amount: 0, count: 0 };
		cur.amount += Number(r[amountKey] as unknown) || 0;
		cur.count += 1;
		buckets.set(key, cur);
	}
	const entries = Array.from(buckets.entries())
		.sort((a, b) => (mode === 'amount' ? b[1].amount - a[1].amount : b[1].count - a[1].count))
		.slice(0, 6);
	return entries.map(([name, val], i) => {
		const v = mode === 'amount' ? val.amount : val.count;
		const label = mode === 'amount' ? formatAmtCompact(val.amount) : `${val.count} deal${val.count === 1 ? '' : 's'}`;
		return {
			name,
			v,
			color: SECTOR_COLORS[i % SECTOR_COLORS.length],
			label,
		};
	});
}

function splitAmt(n: number): { value: string; unit: string } {
	if (!Number.isFinite(n) || n <= 0) return { value: '—', unit: '' };
	if (n >= 1_000_000_000) return { value: `$${(n / 1_000_000_000).toFixed(2)}`, unit: 'B' };
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
