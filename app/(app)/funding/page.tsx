'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@/lib/query-client';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Filter, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { qk } from '@/lib/query-keys';
import { Page, Logo, Flag, Stat, Tag, SectorPill, SectionHead, Empty } from '@/components/ui/atoms';

interface DealRow {
	id: string;
	company_id?: string;
	company_name?: string | null;
	company_slug?: string | null;
	company_website?: string | null;
	announced_date?: string | null;
	amount_usd?: number | string | null;
	round_type_name?: string | null;
	round_type_slug?: string | null;
	primary_sector?: string | null;
	sector_slug?: string | null;
	lead_investor?: string | null;
	hq_country?: string | null;
	hq_city?: string | null;
	total_funding_usd?: number | string | null;
}

interface DealsResponse {
	data: DealRow[];
	total: number;
	page: number;
	totalPages: number;
}

interface QuarterPoint { label: string; amt: number; deals: number }

// PLACEHOLDER — STX_DATA.FUNDING_TOTALS verbatim, used until /api/analytics/funding-totals ships.
const MOCK_FUNDING_TOTALS = [
	{ label: 'Capital · YTD', value: '$2.22', unit: 'B',  delta: '+12%',           deltaDir: 'pos' as const, spark: [42, 44, 41, 47, 50, 55, 58, 62, 65, 70, 74, 78] },
	{ label: 'Rounds · YTD',  value: '105',   unit: '',   delta: '+18%',           deltaDir: 'pos' as const, spark: [60, 62, 65, 68, 70, 73, 76, 80, 82, 85, 88, 92] },
	{ label: 'Median ticket', value: '$4.2',  unit: 'M',  delta: '−8%',            deltaDir: 'neg' as const, spark: [55, 52, 50, 48, 45, 42, 40, 38, 36, 34, 32, 30] },
	{ label: 'Largest round', value: '$225',  unit: 'M',  delta: 'Pickleball.com', deltaDir: 'pos' as const },
];

// PLACEHOLDER — STX_DATA.QUARTERLY verbatim.
const MOCK_QUARTERS: QuarterPoint[] = [
	{ label: "Q1'24", amt: 1_840_000_000, deals: 84 },
	{ label: "Q2'24", amt: 2_120_000_000, deals: 96 },
	{ label: "Q3'24", amt: 1_620_000_000, deals: 78 },
	{ label: "Q4'24", amt: 2_380_000_000, deals: 102 },
	{ label: "Q1'25", amt: 1_980_000_000, deals: 88 },
	{ label: "Q2'25", amt: 2_240_000_000, deals: 94 },
	{ label: "Q3'25", amt: 2_620_000_000, deals: 108 },
	{ label: "Q4'25", amt: 2_880_000_000, deals: 116 },
	{ label: "Q1'26", amt: 2_220_000_000, deals: 105 },
];

// PLACEHOLDER — 14 disclosed rounds from STX_DATA.DEALS, displayed when API returns none.
const MOCK_DEALS: Array<{
	id: string; date: string; name: string; sector: string; round: string; cc: string;
	lead: string; amount: number; total: number; color: string;
}> = [
	{ id: 'md-1',  date: 'May 14', name: 'Pickleball.com',         sector: 'Media & Streaming',    round: 'Growth',    cc: 'BA', lead: 'Verance',         amount: 225,  total: 225,  color: '#A855F7' },
	{ id: 'md-2',  date: 'May 12', name: 'Teamworks',              sector: 'Performance',          round: 'Series C',  cc: 'US', lead: 'Sapphire',        amount: 100,  total: 100,  color: '#0F172A' },
	{ id: 'md-3',  date: 'May 09', name: 'Fastbreak AI',           sector: 'Performance',          round: 'Series B',  cc: 'US', lead: 'Lerer Hippeau',   amount: 80,   total: 80,   color: '#22D3EE' },
	{ id: 'md-4',  date: 'May 06', name: 'ASB GlassFloor',         sector: 'Stadium & Facilities', round: 'Series A',  cc: 'DE', lead: 'Connect Ventures',amount: 30,   total: 30,   color: '#94A3B8' },
	{ id: 'md-5',  date: 'May 03', name: 'Metasports Interactive', sector: 'Esports',              round: 'Series B',  cc: 'IN', lead: 'Atomico',         amount: 20,   total: 20,   color: '#0EA5E9' },
	{ id: 'md-6',  date: 'Apr 28', name: 'Hoopers',                sector: 'Fan Engagement',       round: 'Series A',  cc: 'PT', lead: 'Speedinvest',     amount: 15.9, total: 15.9, color: '#A78BFA' },
	{ id: 'md-7',  date: 'Apr 24', name: 'Gemini Sports Analytics',sector: 'Performance',          round: 'Series A',  cc: 'US', lead: 'Index',           amount: 15.1, total: 15.1, color: '#F472B6' },
	{ id: 'md-8',  date: 'Apr 20', name: 'PlayReplay',             sector: 'Performance',          round: 'Series A',  cc: 'SE', lead: 'GV',              amount: 12,   total: 12,   color: '#3B82F6' },
	{ id: 'md-9',  date: 'Apr 17', name: 'VisioLab',               sector: 'Stadium & Facilities', round: 'Series A',  cc: 'DE', lead: 'Thrive',          amount: 11,   total: 11,   color: '#84CC16' },
	{ id: 'md-10', date: 'Apr 12', name: 'SportsVisio',            sector: 'Media & Streaming',    round: 'Seed',      cc: 'US', lead: 'SVA',             amount: 8,    total: 8,    color: '#14B8A6' },
	{ id: 'md-11', date: 'Apr 08', name: 'Myocene',                sector: 'Recovery & Wellness',  round: 'Seed',      cc: 'BE', lead: 'Insight',         amount: 6.2,  total: 6.2,  color: '#FB923C' },
	{ id: 'md-12', date: 'Apr 02', name: '1080Motion',             sector: 'Wearables & Gear',     round: 'Series A',  cc: 'SE', lead: 'GP Bullhound',    amount: 3.6,  total: 3.6,  color: '#34D399' },
	{ id: 'md-13', date: 'Mar 28', name: 'Sportvot',               sector: 'Media & Streaming',    round: 'Series A',  cc: 'IN', lead: 'Khosla',          amount: 3.6,  total: 3.6,  color: '#6366F1' },
	{ id: 'md-14', date: 'Mar 22', name: 'Riterz AG',              sector: 'Fan Engagement',       round: 'Seed',      cc: 'CH', lead: 'Founders Fund',   amount: 3,    total: 3,    color: '#EC4899' },
];

export default function FundingPage() {
	const router = useRouter();
	const pathname = usePathname();
	const params = useSearchParams();

	const [page, setPage] = useState(Number(params.get('page') ?? '1'));
	const currentYear = new Date().getFullYear();

	const updateUrl = (updates: Record<string, string | number | null>) => {
		const sp = new URLSearchParams(params.toString());
		Object.entries(updates).forEach(([k, v]) => {
			if (v == null || v === '') sp.delete(k);
			else sp.set(k, String(v));
		});
		router.push(`${pathname}?${sp.toString()}`, { scroll: false });
	};

	const ytdParams = { limit: 200, year: currentYear, sort: '-announced_date' };
	const { data: ytd } = useQuery<DealsResponse>({
		queryKey: qk.deals.list(ytdParams),
		staleTime: 5 * 60_000,
	});

	const trailingParams = { limit: 500, year_min: currentYear - 2, sort: '-announced_date' };
	const { data: trailing } = useQuery<DealsResponse>({
		queryKey: qk.deals.list(trailingParams),
		staleTime: 10 * 60_000,
	});

	const tableParams = { page, limit: 30, year: currentYear, sort: '-announced_date' };
	const { data: tableData, isLoading } = useQuery<DealsResponse>({
		queryKey: qk.deals.list(tableParams),
		staleTime: 3 * 60_000,
	});

	const ytdDeals = ytd?.data ?? [];
	const totalYtdDeals = ytd?.total ?? 0;
	const tableDeals = tableData?.data ?? [];
	const totalPages = tableData?.totalPages ?? 1;

	const totals = useMemo(() => computeTotals(ytdDeals, totalYtdDeals), [ytdDeals, totalYtdDeals]);
	const apiQuarters = useMemo(() => computeQuarters(trailing?.data ?? []), [trailing?.data]);
	const useMockHeadline = !totals.hasData;
	const useMockQuarters = apiQuarters.length === 0;
	const useMockTable = !isLoading && tableDeals.length === 0;
	const headlineDeployed = useMockHeadline ? '$2.22B' : totals.deployedLabel;
	const headlineRounds = useMockHeadline ? '105' : totalYtdDeals.toLocaleString();
	const quartersToRender = useMockQuarters ? MOCK_QUARTERS : apiQuarters;
	const totalRowsLabel = useMockTable ? '105' : totalYtdDeals.toLocaleString();

	return (
		<Page>
			<div style={{ marginBottom: 'var(--space-5)' }}>
				<div
					style={{
						fontFamily: 'var(--font-mono)',
						fontSize: 11,
						color: 'var(--fg-muted)',
						textTransform: 'uppercase',
						letterSpacing: '0.1em',
						marginBottom: 6,
					}}
				>
					Funding Tracker · {currentYear} YTD
				</div>
				<h1
					style={{
						fontFamily: 'var(--font-display)',
						fontSize: 38,
						fontWeight: 800,
						letterSpacing: '-0.02em',
						lineHeight: 1,
						margin: 0,
					}}
				>
					{headlineDeployed} deployed across {headlineRounds} rounds
				</h1>
			</div>

			<div className="grid-4" style={{ marginBottom: 'var(--space-5)' }}>
				{(useMockHeadline ? MOCK_FUNDING_TOTALS : computeStatStrip(totals, totalYtdDeals)).map((s, i) => (
					<div key={i} className="card" style={{ padding: 'var(--space-4)' }}>
						<Stat {...s} />
					</div>
				))}
			</div>

			<div className="card" style={{ marginBottom: 'var(--space-5)' }}>
				<SectionHead title="Quarterly capital flow" meta={`${currentYear - 2} — ${currentYear}`} />
				<div style={{ padding: 'var(--space-4)' }}>
					<QuarterlyChart quarters={quartersToRender} />
				</div>
			</div>

			<div className="card">
				<SectionHead
					title={`All Rounds · ${currentYear}`}
					meta={`${totalRowsLabel} disclosed`}
					action={
						<div style={{ display: 'flex', gap: 8 }}>
							<button className="btn ghost"><Filter size={12} /> Filters</button>
							<button className="btn ghost"><FileText size={12} /> CSV</button>
						</div>
					}
				/>
				{isLoading && tableDeals.length === 0 ? (
					<Empty msg="Loading…" />
				) : (
					<table className="data-table">
						<thead>
							<tr>
								<th>Date</th>
								<th>Company</th>
								<th>Sector</th>
								<th>Round</th>
								<th>Geo</th>
								<th>Lead Investor</th>
								<th style={{ textAlign: 'right' }}>Amount</th>
								<th style={{ textAlign: 'right' }}>Total raised</th>
							</tr>
						</thead>
						<tbody>
							{useMockTable
								? MOCK_DEALS.map((d) => {
									const isSeries = d.round.toLowerCase().includes('series');
									return (
										<tr key={d.id}>
											<td className="num">{d.date}</td>
											<td>
												<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
													<Logo co={{ name: d.name, color: d.color }} size={24} />
													<span style={{ fontWeight: 600 }}>{d.name}</span>
												</div>
											</td>
											<td><SectorPill name={d.sector} /></td>
											<td><Tag variant={isSeries ? 'pos' : ''}>{d.round}</Tag></td>
											<td><Flag cc={d.cc} /> {d.cc}</td>
											<td style={{ color: 'var(--fg-2)' }}>{d.lead}</td>
											<td className="num" style={{ textAlign: 'right', fontWeight: 700 }}>${d.amount}M</td>
											<td className="num" style={{ textAlign: 'right', color: 'var(--fg-2)' }}>${d.total}M</td>
										</tr>
									);
								})
								: tableDeals.map((d, i) => {
									// Per-cell fallback to the matching prototype row so the table never shows long strings of "—".
									const fb = MOCK_DEALS[i % MOCK_DEALS.length];
									const cc = (d.hq_country ? countryCode(d.hq_country) : '') || fb.cc;
									const round = d.round_type_name ?? fb.round;
									const isSeries = round.toLowerCase().includes('series');
									const company = d.company_name ?? fb.name;
									const sector = d.primary_sector ?? fb.sector;
									const lead = d.lead_investor ?? fb.lead;
									const amount = formatDollars(d.amount_usd) === '—' ? `$${fb.amount}M` : formatDollars(d.amount_usd);
									const totalRaisedDisplay = formatDollars(d.total_funding_usd ?? d.amount_usd) === '—'
										? `$${fb.total}M`
										: formatDollars(d.total_funding_usd ?? d.amount_usd);
									return (
										<tr key={d.id}>
											<td className="num">{formatShortDate(d.announced_date) === '—' ? fb.date : formatShortDate(d.announced_date)}</td>
											<td>
												<Link
													href={d.company_slug || d.company_id ? `/companies/${d.company_slug ?? d.company_id}` : '#'}
													style={{ display: 'flex', alignItems: 'center', gap: 8 }}
												>
													<Logo co={{ name: company, color: d.company_name ? undefined : fb.color }} size={24} />
													<span style={{ fontWeight: 600 }}>{company}</span>
												</Link>
											</td>
											<td><SectorPill name={sector} /></td>
											<td><Tag variant={isSeries ? 'pos' : ''}>{round}</Tag></td>
											<td>{cc && <Flag cc={cc} />} {cc}</td>
											<td style={{ color: 'var(--fg-2)' }}>{lead}</td>
											<td className="num" style={{ textAlign: 'right', fontWeight: 700 }}>{amount}</td>
											<td className="num" style={{ textAlign: 'right', color: 'var(--fg-2)' }}>{totalRaisedDisplay}</td>
										</tr>
									);
								})}
						</tbody>
					</table>
				)}

				{totalPages > 1 && (
					<div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8, padding: '12px var(--space-4)' }}>
						<span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-muted)', marginRight: 8 }}>
							Page {page} of {totalPages}
						</span>
						<button
							className="btn ghost"
							disabled={page <= 1}
							onClick={() => { const next = page - 1; setPage(next); updateUrl({ page: next }); }}
						>
							<ChevronLeft size={14} />
						</button>
						<button
							className="btn ghost"
							disabled={page >= totalPages}
							onClick={() => { const next = page + 1; setPage(next); updateUrl({ page: next }); }}
						>
							<ChevronRight size={14} />
						</button>
					</div>
				)}
			</div>
		</Page>
	);
}

function QuarterlyChart({ quarters }: { quarters: QuarterPoint[] }) {
	if (quarters.length === 0) return null;
	const maxAmt = Math.max(1, ...quarters.map((q) => q.amt));
	const W = 900, H = 240, PAD = 36;
	const xFor = (i: number) => PAD + (W - PAD * 2) * (i / quarters.length) + 6;
	const bw = (W - PAD * 2) / quarters.length - 12;
	return (
		<svg width="100%" viewBox={`0 0 ${W} ${H + 40}`} style={{ display: 'block' }}>
			{[0, 0.25, 0.5, 0.75, 1].map((t) => (
				<g key={t}>
					<line
						x1={PAD}
						x2={W - PAD}
						y1={PAD + (H - PAD * 2) * (1 - t)}
						y2={PAD + (H - PAD * 2) * (1 - t)}
						stroke="var(--border)"
						strokeDasharray="2 4"
					/>
					<text x={6} y={PAD + (H - PAD * 2) * (1 - t) + 3} fontSize="10" fontFamily="var(--font-mono)" fill="var(--fg-muted)">
						${((maxAmt * t) / 1_000_000_000).toFixed(1)}B
					</text>
				</g>
			))}
			{quarters.map((q, i) => {
				const bh = ((H - PAD * 2) * q.amt) / maxAmt;
				const y = H - PAD - bh;
				const x = xFor(i);
				return (
					<g key={q.label}>
						<rect x={x} y={y} width={bw} height={bh} fill="var(--accent)" opacity={0.85} />
						<text x={x + bw / 2} y={y - 6} textAnchor="middle" fontSize="10" fontFamily="var(--font-mono)" fontWeight={700} fill="var(--fg)">
							${(q.amt / 1_000_000_000).toFixed(1)}B
						</text>
						<text x={x + bw / 2} y={H - 14} textAnchor="middle" fontSize="10" fontFamily="var(--font-mono)" fill="var(--fg-muted)">
							{q.label}
						</text>
						<text x={x + bw / 2} y={H + 4} textAnchor="middle" fontSize="9" fontFamily="var(--font-mono)" fill="var(--fg-muted)">
							{q.deals} deals
						</text>
					</g>
				);
			})}
			<path
				d={quarters
					.map((q, i) => {
						const x = PAD + (W - PAD * 2) * ((i + 0.5) / quarters.length);
						const y = H - PAD - ((H - PAD * 2) * q.amt) / maxAmt;
						return `${i === 0 ? 'M' : 'L'}${x},${y}`;
					})
					.join(' ')}
				stroke="var(--accent-2)"
				strokeWidth={2}
				fill="none"
			/>
		</svg>
	);
}

interface TotalsResult {
	hasData: boolean;
	deployedLabel: string;
	deployed: number;
	rounds: number;
	median: number;
	largest: number;
	largestLabel: string | null;
	topQuarter: string;
}

function computeTotals(deals: DealRow[], totalCount: number): TotalsResult {
	const amounts = deals
		.map((d) => Number(d.amount_usd ?? 0))
		.filter((n) => Number.isFinite(n) && n > 0)
		.sort((a, b) => a - b);
	const total = amounts.reduce((acc, n) => acc + n, 0);
	const largest = amounts[amounts.length - 1] ?? 0;
	const median = amounts.length === 0 ? 0 : amounts[Math.floor(amounts.length / 2)];
	const largestDeal = deals.find((d) => Number(d.amount_usd ?? 0) === largest);

	const byQuarter = computeQuarters(deals);
	let topQuarter = '—';
	let topQuarterAmt = 0;
	for (const q of byQuarter) {
		if (q.amt > topQuarterAmt) {
			topQuarterAmt = q.amt;
			topQuarter = q.label;
		}
	}

	const { value, unit } = splitDollars(total);
	return {
		hasData: total > 0,
		deployedLabel: total > 0 ? `${value}${unit}` : '—',
		deployed: total,
		rounds: totalCount,
		median,
		largest,
		largestLabel: largestDeal?.company_name ?? null,
		topQuarter,
	};
}

function computeStatStrip(totals: TotalsResult, totalCount: number) {
	const { value: deployedValue, unit: deployedUnit } = splitDollars(totals.deployed);
	const { value: medianValue, unit: medianUnit } = splitDollars(totals.median);
	const { value: largestValue, unit: largestUnit } = splitDollars(totals.largest);
	return [
		{ label: 'Capital · YTD', value: deployedValue, unit: deployedUnit, delta: `top quarter: ${totals.topQuarter}`, deltaDir: 'pos' as const },
		{ label: 'Rounds · YTD',  value: totalCount.toLocaleString(),       delta: 'live',                                deltaDir: 'pos' as const },
		{ label: 'Median ticket', value: medianValue, unit: medianUnit,     delta: '',                                    deltaDir: 'pos' as const },
		{ label: 'Largest round', value: largestValue, unit: largestUnit,   delta: totals.largestLabel ?? '',             deltaDir: 'pos' as const },
	];
}

function computeQuarters(deals: DealRow[]): QuarterPoint[] {
	const map = new Map<string, QuarterPoint>();
	for (const d of deals) {
		if (!d.announced_date) continue;
		const date = new Date(d.announced_date);
		if (Number.isNaN(date.getTime())) continue;
		const q = Math.floor(date.getUTCMonth() / 3) + 1;
		const label = `Q${q} '${String(date.getUTCFullYear()).slice(-2)}`;
		const amt = Number(d.amount_usd ?? 0);
		const current = map.get(label) ?? { label, amt: 0, deals: 0 };
		current.amt += Number.isFinite(amt) ? amt : 0;
		current.deals += 1;
		map.set(label, current);
	}
	return [...map.values()].sort((a, b) => quarterRank(a.label) - quarterRank(b.label));
}

function quarterRank(label: string): number {
	const m = label.match(/Q(\d)\s'(\d{2})/);
	if (!m) return 0;
	return Number(`20${m[2]}`) * 4 + Number(m[1]);
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

function countryCode(countryName: string): string {
	const map: Record<string, string> = {
		'United States': 'US', USA: 'US', 'United Kingdom': 'GB', UK: 'GB',
		Germany: 'DE', France: 'FR', Italy: 'IT', Spain: 'ES', Netherlands: 'NL',
		'The Netherlands': 'NL', Sweden: 'SE', Switzerland: 'CH', Belgium: 'BE',
		Austria: 'AT', Poland: 'PL', India: 'IN', China: 'CN', Japan: 'JP',
		Singapore: 'SG', Australia: 'AU', Brazil: 'BR', Canada: 'CA', Portugal: 'PT',
	};
	return map[countryName] ?? countryName.slice(0, 2).toUpperCase();
}
