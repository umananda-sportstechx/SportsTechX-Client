'use client';

import { useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
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

interface DealsResponse { data: DealRow[]; total: number; page: number; totalPages: number }

interface FundingTotalsResponse {
	total_amount: number;
	round_count: number;
	median_amount: number;
	largest_amount: number;
}
interface QuarterlyPoint {
	year: number;
	quarter: number;
	quarter_label: string;
	total_amount: number;
	deal_count: number;
}

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

	const { data: totals } = useSWR<FundingTotalsResponse>(qk.analytics.fundingTotals('ytd'), {
		dedupingInterval: 10 * 60_000,
	});
	const { data: quarters } = useSWR<QuarterlyPoint[]>(
		qk.analytics.quarterly({ from: currentYear - 2, to: currentYear }),
		{ dedupingInterval: 10 * 60_000 },
	);

	const tableParams = { page, limit: 30, year: currentYear, sort: '-announced_date' };
	const { data: tableData, isLoading } = useSWR<DealsResponse>(qk.deals.list(tableParams), { dedupingInterval: 3 * 60_000 });

	const tableDeals = tableData?.data ?? [];
	const totalRows = tableData?.total ?? 0;
	const totalPages = tableData?.totalPages ?? 1;

	const headlineDeployed = totals ? splitDollars(totals.total_amount).value + splitDollars(totals.total_amount).unit : '—';
	const headlineRounds = totals ? totals.round_count.toLocaleString() : '—';

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
				{statStrip(totals).map((s, i) => (
					<div key={i} className="card" style={{ padding: 'var(--space-4)' }}>
						<Stat {...s} />
					</div>
				))}
			</div>

			<div className="card" style={{ marginBottom: 'var(--space-5)' }}>
				<SectionHead title="Quarterly capital flow" meta={`${currentYear - 2} — ${currentYear}`} />
				<div style={{ padding: 'var(--space-4)' }}>
					{quarters && quarters.length > 0
						? <QuarterlyChart quarters={quarters} />
						: <Empty msg="No quarterly data for this range." />}
				</div>
			</div>

			<div className="card">
				<SectionHead
					title={`All Rounds · ${currentYear}`}
					meta={`${totalRows.toLocaleString()} disclosed`}
					action={
						<div style={{ display: 'flex', gap: 8 }}>
							<button className="btn ghost"><Filter size={12} /> Filters</button>
							<button className="btn ghost"><FileText size={12} /> CSV</button>
						</div>
					}
				/>
				{isLoading && tableDeals.length === 0 ? (
					<Empty msg="Loading…" />
				) : tableDeals.length === 0 ? (
					<Empty msg={`No disclosed rounds in ${currentYear}.`} />
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
							{tableDeals.map((d) => {
								const cc = d.hq_country ? countryCode(d.hq_country) : '';
								const round = d.round_type_name ?? '—';
								const isSeries = round.toLowerCase().includes('series');
								return (
									<tr key={d.id}>
										<td className="num">{formatShortDate(d.announced_date)}</td>
										<td>
											<Link
												href={d.company_slug || d.company_id ? `/companies/${d.company_slug ?? d.company_id}` : '#'}
												style={{ display: 'flex', alignItems: 'center', gap: 8 }}
											>
												<Logo co={{ name: d.company_name ?? '—' }} size={24} />
												<span style={{ fontWeight: 600 }}>{d.company_name ?? '—'}</span>
											</Link>
										</td>
										<td>{d.primary_sector ? <SectorPill name={d.primary_sector} /> : '—'}</td>
										<td>{round !== '—' ? <Tag variant={isSeries ? 'pos' : ''}>{round}</Tag> : '—'}</td>
										<td>{cc && <Flag cc={cc} />} {cc}</td>
										<td style={{ color: 'var(--fg-2)' }}>{d.lead_investor ?? '—'}</td>
										<td className="num" style={{ textAlign: 'right', fontWeight: 700 }}>{formatDollars(d.amount_usd)}</td>
										<td className="num" style={{ textAlign: 'right', color: 'var(--fg-2)' }}>{formatDollars(d.total_funding_usd ?? d.amount_usd)}</td>
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

function statStrip(t: FundingTotalsResponse | undefined) {
	const d = splitDollars(t?.total_amount ?? 0);
	const m = splitDollars(t?.median_amount ?? 0);
	const l = splitDollars(t?.largest_amount ?? 0);
	return [
		{ label: 'Capital · YTD', value: d.value, unit: d.unit, delta: '', deltaDir: 'pos' as const },
		{ label: 'Rounds · YTD',  value: (t?.round_count ?? 0).toLocaleString(), delta: 'live', deltaDir: 'pos' as const },
		{ label: 'Median ticket', value: m.value, unit: m.unit, delta: '', deltaDir: 'pos' as const },
		{ label: 'Largest round', value: l.value, unit: l.unit, delta: '', deltaDir: 'pos' as const },
	];
}

function QuarterlyChart({ quarters }: { quarters: QuarterlyPoint[] }) {
	if (quarters.length === 0) return null;
	const maxAmt = Math.max(1, ...quarters.map((q) => q.total_amount));
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
				const bh = ((H - PAD * 2) * q.total_amount) / maxAmt;
				const y = H - PAD - bh;
				const x = xFor(i);
				return (
					<g key={q.quarter_label}>
						<rect x={x} y={y} width={bw} height={bh} fill="var(--accent)" opacity={0.85} />
						<text x={x + bw / 2} y={y - 6} textAnchor="middle" fontSize="10" fontFamily="var(--font-mono)" fontWeight={700} fill="var(--fg)">
							${(q.total_amount / 1_000_000_000).toFixed(1)}B
						</text>
						<text x={x + bw / 2} y={H - 14} textAnchor="middle" fontSize="10" fontFamily="var(--font-mono)" fill="var(--fg-muted)">
							{q.quarter_label}
						</text>
						<text x={x + bw / 2} y={H + 4} textAnchor="middle" fontSize="9" fontFamily="var(--font-mono)" fill="var(--fg-muted)">
							{q.deal_count} deals
						</text>
					</g>
				);
			})}
			<path
				d={quarters
					.map((q, i) => {
						const x = PAD + (W - PAD * 2) * ((i + 0.5) / quarters.length);
						const y = H - PAD - ((H - PAD * 2) * q.total_amount) / maxAmt;
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
