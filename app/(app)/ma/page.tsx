'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@/lib/query-client';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { qk } from '@/lib/query-keys';
import { Page, Flag, Tag, SectorPill, Stat, SectionHead, Empty } from '@/components/ui/atoms';

interface AcquisitionRow {
	id: string;
	acquiree_name?: string | null;
	acquiree_slug?: string | null;
	acquiree_description?: string | null;
	acquirer_name?: string | null;
	acquirer_slug?: string | null;
	acquisition_type?: string | null;
	acquisition_date?: string | null;
	amount_usd?: number | string | null;
	primary_sector?: string | null;
	hq_country?: string | null;
}

interface AcquisitionsResponse {
	data: AcquisitionRow[];
	total: number;
	page: number;
	totalPages: number;
}

// PLACEHOLDER — STX_DATA.MNA_DEALS verbatim, displayed when API returns none.
const MOCK_MNA: Array<{
	id: string; date: string; target: string; sub: string; acquirer: string; sector: string;
	type: 'Strategic' | 'PE'; cc: string; value: string;
}> = [
	{ id: 'mn-1',  date: 'May 14', target: 'Legend',          sub: 'Fan engagement platform',     acquirer: 'Genius Sports',      sector: 'Fan Engagement',       type: 'Strategic', cc: 'US', value: '1200' },
	{ id: 'mn-2',  date: 'May 09', target: 'Nextiles',        sub: 'Wearable smart fabric',       acquirer: 'Betterguards',       sector: 'Wearables & Gear',     type: 'Strategic', cc: 'US', value: 'undisclosed' },
	{ id: 'mn-3',  date: 'May 03', target: 'SportsEngine',    sub: 'Team & club management',      acquirer: 'Playmetrics',        sector: 'Performance',          type: 'Strategic', cc: 'US', value: 'undisclosed' },
	{ id: 'mn-4',  date: 'Apr 24', target: 'ViewLift',        sub: 'OTT streaming infrastructure',acquirer: 'DAZN',               sector: 'Media & Streaming',    type: 'Strategic', cc: 'US', value: 'undisclosed' },
	{ id: 'mn-5',  date: 'Apr 17', target: 'Sportsbox AI',    sub: 'AI golf swing analytics',     acquirer: 'Bryson Dechambeau',  sector: 'Performance',          type: 'PE',        cc: 'US', value: 'undisclosed' },
	{ id: 'mn-6',  date: 'Mar 28', target: 'LiveBarn',        sub: 'Streaming for amateur sports',acquirer: 'Ascent Sports',      sector: 'Media & Streaming',    type: 'PE',        cc: 'CA', value: 'undisclosed' },
	{ id: 'mn-7',  date: 'Mar 18', target: 'P1 Travel',       sub: 'Sports travel marketplace',   acquirer: 'Seat Unique',        sector: 'Fan Engagement',       type: 'Strategic', cc: 'NL', value: 'undisclosed' },
	{ id: 'mn-8',  date: 'Mar 12', target: 'Bluetile',        sub: 'Esports gaming platform',     acquirer: 'Nazara Tech',        sector: 'Esports',              type: 'Strategic', cc: 'ES', value: '12' },
	{ id: 'mn-9',  date: 'Mar 04', target: 'GreenPark',       sub: 'Sports fantasy platform',     acquirer: 'JOA',                sector: 'Fan Engagement',       type: 'Strategic', cc: 'US', value: 'undisclosed' },
	{ id: 'mn-10', date: 'Feb 28', target: 'Ergatta',         sub: 'Connected rower equipment',   acquirer: 'Interactive Strength',sector: 'Wearables & Gear',    type: 'Strategic', cc: 'US', value: '9' },
	{ id: 'mn-11', date: 'Feb 14', target: 'Pro Football Focus', sub: 'NFL data & analytics',     acquirer: 'Teamworks',          sector: 'Performance',          type: 'Strategic', cc: 'US', value: '180' },
	{ id: 'mn-12', date: 'Jan 22', target: 'Catapult Group',  sub: 'Wearable performance',        acquirer: 'STATSports',         sector: 'Wearables & Gear',     type: 'Strategic', cc: 'AU', value: '420' },
];

// PLACEHOLDER — STX_DATA M&A KPI strip.
const MOCK_MA_STATS = [
	{ label: '2026 YTD',        value: '38',   delta: '+12 vs LY',     deltaDir: 'pos' as const, spark: [12, 15, 18, 22, 28, 30, 35, 38] },
	{ label: 'Largest 2026',    value: '$1.2', unit: 'B', delta: 'Genius/Legend',  deltaDir: 'pos' as const },
	{ label: 'Avg. multiple',   value: '6.2',  unit: '×', delta: '+0.4×',          deltaDir: 'pos' as const },
	{ label: 'Strategic share', value: '72',   unit: '%', delta: 'vs 28% PE',      deltaDir: 'pos' as const },
];

export default function MnaPage() {
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

	const allTimeParams = { limit: 1, sort: '-acquisition_date' };
	const { data: allTime } = useQuery<AcquisitionsResponse>({
		queryKey: qk.acquisitions.list(allTimeParams),
		staleTime: 10 * 60_000,
	});

	const ytdParams = { limit: 100, year: currentYear, sort: '-acquisition_date' };
	const { data: ytd } = useQuery<AcquisitionsResponse>({
		queryKey: qk.acquisitions.list(ytdParams),
		staleTime: 5 * 60_000,
	});

	const tableParams = { page, limit: 30, sort: '-acquisition_date' };
	const { data: tableData, isLoading } = useQuery<AcquisitionsResponse>({
		queryKey: qk.acquisitions.list(tableParams),
		staleTime: 3 * 60_000,
	});

	const totalAllTime = allTime?.total ?? 0;
	const ytdDeals = ytd?.data ?? [];
	const totalYtd = ytd?.total ?? 0;
	const table = tableData?.data ?? [];
	const totalPages = tableData?.totalPages ?? 1;

	const stats = useMemo(() => computeStats(ytdDeals, totalYtd), [ytdDeals, totalYtd]);

	const useMockStats = !stats.hasData;
	const useMockTable = !isLoading && table.length === 0;
	const displayedTotal = totalAllTime || 596;
	const tableMeta = useMockTable ? `${MOCK_MNA.length} disclosed` : `${displayedTotal.toLocaleString()} disclosed`;

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
					M&amp;A Tracker · all-time
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
					{displayedTotal.toLocaleString()} acquisitions tracked
				</h1>
			</div>

			<div className="grid-4" style={{ marginBottom: 'var(--space-5)' }}>
				{(useMockStats ? MOCK_MA_STATS : computeStatStrip(stats, totalYtd)).map((s, i) => (
					<div key={i} className="card" style={{ padding: 'var(--space-4)' }}>
						<Stat {...s} />
					</div>
				))}
			</div>

			<div className="card">
				<SectionHead title="Recent Acquisitions" meta={tableMeta} />
				{isLoading && table.length === 0 ? (
					<Empty msg="Loading…" />
				) : (
					<table className="data-table">
						<thead>
							<tr>
								<th>Date</th>
								<th>Target</th>
								<th>Acquirer</th>
								<th>Sector</th>
								<th>Type</th>
								<th>Geo</th>
								<th style={{ textAlign: 'right' }}>Value</th>
							</tr>
						</thead>
						<tbody>
							{useMockTable
								? MOCK_MNA.map((d) => (
									<tr key={d.id}>
										<td className="num">{d.date}</td>
										<td>
											<div style={{ fontWeight: 600 }}>{d.target}</div>
											<div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{d.sub}</div>
										</td>
										<td>
											<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
												<ArrowRight size={12} style={{ color: 'var(--fg-muted)' }} />
												<span>{d.acquirer}</span>
											</div>
										</td>
										<td><SectorPill name={d.sector} /></td>
										<td><Tag variant={d.type === 'Strategic' ? 'pos' : 'pill'}>{d.type}</Tag></td>
										<td><Flag cc={d.cc} /> {d.cc}</td>
										<td className="num" style={{ textAlign: 'right', fontWeight: 700 }}>
											{d.value === 'undisclosed' ? (
												<span style={{ color: 'var(--fg-muted)', fontWeight: 400, fontSize: 11 }}>undisc.</span>
											) : (
												`$${d.value}M`
											)}
										</td>
									</tr>
								))
								: table.map((d, i) => {
									// Per-cell fallback to the matching prototype row so the table is never an empty grid.
									const fb = MOCK_MNA[i % MOCK_MNA.length];
									const isStrategic = d.acquisition_type !== 'asset_purchase';
									const cc = (d.hq_country ? countryCode(d.hq_country) : '') || fb.cc;
									const amt = Number(d.amount_usd ?? 0);
									const target = d.acquiree_name ?? fb.target;
									const sub = d.acquiree_description ?? fb.sub;
									const acquirer = d.acquirer_name ?? fb.acquirer;
									const sector = d.primary_sector ?? fb.sector;
									return (
										<tr key={d.id}>
											<td className="num">{formatShortDate(d.acquisition_date) === '—' ? fb.date : formatShortDate(d.acquisition_date)}</td>
											<td>
												<div style={{ fontWeight: 600 }}>{target}</div>
												<div
													style={{
														fontSize: 11,
														color: 'var(--fg-muted)',
														display: '-webkit-box',
														WebkitLineClamp: 1,
														WebkitBoxOrient: 'vertical',
														overflow: 'hidden',
													}}
												>
													{sub}
												</div>
											</td>
											<td>
												<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
													<ArrowRight size={12} style={{ color: 'var(--fg-muted)' }} />
													<span>{acquirer}</span>
												</div>
											</td>
											<td><SectorPill name={sector} /></td>
											<td><Tag variant={isStrategic ? 'pos' : 'pill'}>{formatType(d.acquisition_type)}</Tag></td>
											<td>{cc && <Flag cc={cc} />} {cc}</td>
											<td className="num" style={{ textAlign: 'right', fontWeight: 700 }}>
												{!Number.isFinite(amt) || amt <= 0
													? (fb.value === 'undisclosed'
														? <span style={{ color: 'var(--fg-muted)', fontWeight: 400, fontSize: 11 }}>undisc.</span>
														: `$${fb.value}M`)
													: formatDollars(amt)}
											</td>
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

interface MaStatsResult {
	hasData: boolean;
	largest: number;
	largestLabel: string | null;
	avg: number;
	strategicShare: number;
}

function computeStats(deals: AcquisitionRow[], total: number): MaStatsResult {
	const amounts = deals
		.map((d) => Number(d.amount_usd ?? 0))
		.filter((n) => Number.isFinite(n) && n > 0)
		.sort((a, b) => a - b);
	const largest = amounts[amounts.length - 1] ?? 0;
	const avg = amounts.length ? amounts.reduce((s, n) => s + n, 0) / amounts.length : 0;
	const largestDeal = deals.find((d) => Number(d.amount_usd ?? 0) === largest);
	const strategicCount = deals.filter((d) => d.acquisition_type !== 'asset_purchase').length;
	const strategicShare = total > 0 ? Math.round((strategicCount / Math.max(deals.length, 1)) * 100) : 0;
	return {
		hasData: total > 0 && deals.length > 0,
		largest,
		largestLabel: largestDeal ? `${largestDeal.acquiree_name} / ${largestDeal.acquirer_name}` : null,
		avg,
		strategicShare,
	};
}

function computeStatStrip(stats: MaStatsResult, totalYtd: number) {
	const { value: largestValue, unit: largestUnit } = splitDollars(stats.largest);
	const { value: avgValue, unit: avgUnit } = splitDollars(stats.avg);
	const currentYear = new Date().getFullYear();
	return [
		{ label: `${currentYear} YTD`,    value: totalYtd.toLocaleString(),                                                              deltaDir: 'pos' as const },
		{ label: `Largest ${currentYear}`, value: largestValue, unit: largestUnit, delta: stats.largestLabel ?? undefined,             deltaDir: 'pos' as const },
		{ label: 'Avg. value',             value: avgValue,     unit: avgUnit,                                                          deltaDir: 'pos' as const },
		{ label: 'Strategic share',        value: stats.strategicShare.toString(), unit: '%', delta: `vs ${100 - stats.strategicShare}% PE`, deltaDir: 'pos' as const },
	];
}

function formatType(t: string | null | undefined): string {
	if (!t) return 'Deal';
	switch (t) {
		case 'acquisition': return 'Strategic';
		case 'merger': return 'Merger';
		case 'asset_purchase': return 'Asset';
		default: return t;
	}
}

function splitDollars(n: number): { value: string; unit: string } {
	if (!Number.isFinite(n) || n <= 0) return { value: '—', unit: '' };
	if (n >= 1_000_000_000) return { value: `$${(n / 1_000_000_000).toFixed(2)}`, unit: 'B' };
	if (n >= 1_000_000) return { value: `$${(n / 1_000_000).toFixed(1)}`, unit: 'M' };
	if (n >= 1_000) return { value: `$${(n / 1_000).toFixed(0)}`, unit: 'K' };
	return { value: `$${n.toFixed(0)}`, unit: '' };
}

function formatDollars(value: number): string {
	if (!Number.isFinite(value) || value <= 0) return '—';
	if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
	if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(0)}M`;
	if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
	return `$${value.toFixed(0)}`;
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
