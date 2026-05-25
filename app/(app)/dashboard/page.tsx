'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { Filter, Plus, ArrowRight } from 'lucide-react';
import { qk } from '@/lib/query-keys';
import {
	Page, Stat, Logo, Flag, SectionHead, WorldMap, Tag, SectorPill,
	Heatmap, Empty,
} from '@/components/ui/atoms';

/**
 * Dashboard — mission control. Live data only; no MOCK_* fallbacks. Cells
 * with no backing data render an <Empty> hint so empty states are explicit.
 *
 * Wires up to:
 *   /api/analytics/dashboard-stats   — hero KPIs (capital, deals, M&A, companies)
 *   /api/analytics/sector-heat       — sector funding distribution
 *   /api/analytics/world-flow        — country deal counts → world map dots
 *   /api/deals                       — recent funding table
 *   /api/reports                     — featured reports rail
 *   /api/companies                   — featured companies rail
 *   /api/ecosystem-entities?type=event — upcoming events
 */

interface DashboardStats {
	total_funding: number;
	total_deals: number;
	total_acquisitions: number;
	total_companies: number;
	total_investors: number;
	total_ecosystem_entities: number;
}

interface SectorHeatPoint {
	sector_id: string;
	sector_slug: string;
	sector_name: string;
	deal_count: number;
	total_amount: number;
}

interface WorldFlowPoint {
	country: string;
	deal_count: number;
	total_amount: number;
}

interface DealResp { data: Array<DealRow>; total?: number }
interface DealRow {
	id: string;
	company_name?: string;
	company?: { name: string; slug?: string };
	amount_usd?: number | string | null;
	round_type?: string | null;
	round_type_name?: string | null;
	announced_date?: string | null;
	country_code?: string | null;
	hq_country?: string | null;
	sector_name?: string | null;
	primary_sector?: string | null;
	company_slug?: string | null;
}

interface CompanyResp { data: Array<CompanyRow>; total?: number }
interface CompanyRow {
	id: string;
	name: string;
	slug?: string;
	primary_sector?: string | null;
	hq_city?: string | null;
	hq_country?: string | null;
}

interface ReportResp { data: Array<ReportRow> }
interface ReportRow {
	id: string;
	short_title?: string;
	slug?: string;
	title: string;
	cover_url?: string | null;
	report_type?: string | null;
	pages?: number | null;
	report_year?: number | null;
}

interface EventResp { data: Array<EventRow> }
interface EventRow {
	id: string;
	name: string;
	slug?: string | null;
	hq_city?: string | null;
	hq_country?: string | null;
	start_date?: string | null;
}

export default function DashboardPage() {
	const { data: stats } = useSWR<DashboardStats>(qk.analytics.dashboard('ytd'), { dedupingInterval: 10 * 60_000 });
	const { data: sectorHeat } = useSWR<SectorHeatPoint[]>(qk.analytics.sectorHeat('ytd', 8), { dedupingInterval: 10 * 60_000 });
	const { data: worldFlow } = useSWR<WorldFlowPoint[]>(qk.analytics.worldFlow('ytd', 40), { dedupingInterval: 10 * 60_000 });
	const { data: companies } = useSWR<CompanyResp>(qk.companies.list({ limit: 6 }), { dedupingInterval: 5 * 60_000 });
	const { data: dealsResp } = useSWR<DealResp>(qk.deals.list({ limit: 8, sort: '-announced_date' }), { dedupingInterval: 5 * 60_000 });
	const { data: reports } = useSWR<ReportResp>(qk.reports.list(), { dedupingInterval: 30 * 60_000 });
	const { data: events } = useSWR<EventResp>(qk.ecosystem.listByType('event', { limit: 3 }), { dedupingInterval: 30 * 60_000 });

	const recentDeals = (dealsResp?.data ?? []).slice(0, 8);
	const featured = (companies?.data ?? []).slice(0, 6);
	const featuredReports = (reports?.data ?? []).slice(0, 3);
	const upcomingEvents = (events?.data ?? []).slice(0, 3);

	return (
		<Page>
			<DashboardHeader />

			<div className="grid-4" style={{ marginBottom: 'var(--space-5)' }}>
				{heroStrip(stats).map((s, i) => (
					<div key={s.label} className={`card ${i === 0 ? 'feature' : ''}`} style={{ padding: 'var(--space-4)' }}>
						<Stat {...s} />
					</div>
				))}
			</div>

			<div className="grid-2" style={{ gridTemplateColumns: '1.6fr 1fr', marginBottom: 'var(--space-5)' }}>
				<div className="card">
					<SectionHead
						title="Global Activity"
						meta={stats ? `YTD · ${stats.total_deals.toLocaleString()} rounds` : 'YTD'}
					/>
					<div style={{ padding: 'var(--space-3)' }}>
						{!worldFlow || worldFlow.length === 0
							? <Empty msg="No geographic data" />
							: <WorldMap height={320} dots={worldFlowToDots(worldFlow)} />}
					</div>
				</div>

				<div className="card">
					<SectionHead title="Sector Heat" meta="Funding by sector · YTD" />
					<div style={{ padding: 'var(--space-4)' }}>
						{!sectorHeat || sectorHeat.length === 0
							? <Empty msg="No sector data" />
							: <Heatmap data={sectorHeatToHeatmap(sectorHeat)} />}
					</div>
				</div>
			</div>

			<div className="grid-2" style={{ gridTemplateColumns: '1.6fr 1fr', marginBottom: 'var(--space-5)' }}>
				<div className="card">
					<SectionHead
						title="Latest Funding Rounds"
						action={
							<Link className="btn ghost" href="/funding">
								View all <ArrowRight size={12} />
							</Link>
						}
					/>
					{recentDeals.length === 0 ? (
						<Empty msg="No recent funding rounds" />
					) : (
						<table className="data-table">
							<thead>
								<tr>
									<th>Date</th><th>Company</th><th>Sector</th><th>Round</th><th>Loc</th>
									<th style={{ textAlign: 'right' }}>Amount</th>
								</tr>
							</thead>
							<tbody>
								{recentDeals.map((d) => {
									const coName = d.company?.name ?? d.company_name ?? '—';
									const coSlug = d.company?.slug ?? d.company_slug;
									const cc = d.country_code ?? (d.hq_country ? countryCode(d.hq_country) : '');
									const round = d.round_type_name ?? d.round_type ?? '—';
									const sector = d.sector_name ?? d.primary_sector;
									return (
										<tr key={d.id}>
											<td className="num">{formatShortDate(d.announced_date ?? null)}</td>
											<td>
												<Link
													href={coSlug ? `/companies/${coSlug}` : '/funding'}
													style={{ display: 'flex', alignItems: 'center', gap: 8 }}
												>
													<Logo co={{ name: coName }} size={24} />
													<span style={{ fontWeight: 600 }}>{coName}</span>
												</Link>
											</td>
											<td>{sector ? <SectorPill name={sector} /> : '—'}</td>
											<td>
												{round !== '—'
													? <Tag variant={round.toLowerCase().includes('acquired') ? 'pill' : 'pos'}>{round}</Tag>
													: '—'}
											</td>
											<td>{cc ? <Flag cc={cc} /> : '—'}</td>
											<td className="num" style={{ textAlign: 'right', fontWeight: 700 }}>
												{formatDealAmount(d.amount_usd)}
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					)}
				</div>

				<div className="card">
					<SectionHead
						title="Featured Reports"
						action={
							<Link className="btn ghost" href="/reports">
								All <ArrowRight size={12} />
							</Link>
						}
					/>
					<div style={{ padding: 'var(--space-3)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
						{featuredReports.length === 0 ? (
							<Empty msg="No reports published yet" />
						) : (
							featuredReports.map((r) => {
								const slug = r.slug ?? r.short_title ?? r.id;
								return (
									<Link key={r.id} href={`/reports/${slug}`} className="report-card">
										<div className="report-cover" style={{
											background: r.cover_url ? `url(${r.cover_url}) center/cover` : 'oklch(58% 0.22 240)',
										}}>
											<span className="rc-meta">{r.report_year ?? ''}{r.pages ? ` · ${r.pages}p` : ''}</span>
											<span className="rc-title">{r.title}</span>
										</div>
										<div style={{ padding: 'var(--space-3)' }}>
											<div style={{ fontSize: 12, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
												{r.report_type ?? 'Report'}
											</div>
											<div style={{ fontWeight: 600 }}>{r.title}</div>
										</div>
									</Link>
								);
							})
						)}
					</div>
				</div>
			</div>

			<div className="grid-3">
				<div className="card" style={{ padding: 'var(--space-4)' }}>
					<div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
						Featured companies
					</div>
					{featured.length === 0 ? (
						<Empty msg="No companies" />
					) : (
						<div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
							{featured.map((c) => (
								<Link
									key={c.id}
									href={`/companies/${c.slug ?? c.id}`}
									style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}
								>
									<Logo co={{ name: c.name }} size={28} />
									<div style={{ flex: 1, minWidth: 0 }}>
										<div style={{ fontWeight: 600, fontSize: 13 }}>{c.name}</div>
										<div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>
											{c.hq_country && <Flag cc={countryCode(c.hq_country)} />}{' '}
											{c.hq_city ?? c.hq_country ?? '—'}{c.primary_sector ? ` · ${c.primary_sector}` : ''}
										</div>
									</div>
								</Link>
							))}
						</div>
					)}
				</div>

				<div className="card" style={{ padding: 'var(--space-4)' }}>
					<div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
						Upcoming Events
					</div>
					{upcomingEvents.length === 0 ? (
						<Empty msg="No upcoming events" />
					) : (
						<div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
							{upcomingEvents.map((e) => {
								const d = splitDate(e.start_date ?? null);
								const cc = e.hq_country ? countryCode(e.hq_country) : '';
								return (
									<Link key={e.id} href={`/events/${e.slug ?? e.id}`} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
										<div style={{ width: 44, height: 44, background: 'var(--bg-3)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
											<div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, lineHeight: 1, textAlign: 'center' }}>
												<div style={{ fontSize: 9, color: 'var(--fg-muted)' }}>{d.month}</div>
												{d.day}
											</div>
										</div>
										<div style={{ flex: 1, minWidth: 0 }}>
											<div style={{ fontWeight: 600, fontSize: 13 }}>{e.name}</div>
											<div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>
												{cc && <Flag cc={cc} />} {e.hq_city ?? e.hq_country ?? '—'}
											</div>
										</div>
									</Link>
								);
							})}
						</div>
					)}
				</div>

				<div className="card" style={{ padding: 'var(--space-4)' }}>
					<div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
						Newsletter
					</div>
					<h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 6, fontFamily: 'var(--font-display)' }}>
						Featured by SportsTechX
					</h3>
					<p style={{ fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.55, marginBottom: 12 }}>
						Weekly recap of capital, M&amp;A and ecosystem signals. Read the latest issues.
					</p>
					<Link className="btn" href="/newsletter">
						Browse issues <ArrowRight size={12} />
					</Link>
				</div>
			</div>
		</Page>
	);
}

function heroStrip(s: DashboardStats | undefined) {
	const cap = splitDollars(s?.total_funding ?? 0);
	return [
		{ label: 'Capital · YTD', value: cap.value, unit: cap.unit, deltaDir: 'pos' as const },
		{ label: 'Disclosed rounds', value: (s?.total_deals ?? 0).toLocaleString(), deltaDir: 'pos' as const },
		{ label: 'M&A · YTD', value: (s?.total_acquisitions ?? 0).toLocaleString(), deltaDir: 'pos' as const },
		{ label: 'Companies tracked', value: (s?.total_companies ?? 0).toLocaleString(), deltaDir: 'pos' as const },
	];
}

/** Map top-N sector totals onto the Heatmap atom's expected shape. We don't
 *  have per-quarter sector buckets server-side yet; render a single-column
 *  bar by emitting one value per sector. The Heatmap atom degrades gracefully. */
function sectorHeatToHeatmap(rows: SectorHeatPoint[]): Array<{ label: string; values: number[] }> {
	const max = Math.max(1, ...rows.map((r) => r.total_amount));
	return rows.map((r) => ({
		label: r.sector_name,
		values: [Math.round((r.total_amount / max) * 100)],
	}));
}

/** Same coarse country→pixel map used on the Analytics page. */
const COUNTRY_COORDS: Record<string, { x: number; y: number }> = {
	'United States': { x: 240, y: 180 }, USA: { x: 240, y: 180 },
	Canada: { x: 230, y: 165 },
	'United Kingdom': { x: 500, y: 145 }, UK: { x: 500, y: 145 },
	Germany: { x: 530, y: 155 }, France: { x: 510, y: 165 }, Italy: { x: 525, y: 180 },
	Spain: { x: 510, y: 200 }, Netherlands: { x: 525, y: 130 }, Sweden: { x: 540, y: 110 },
	Switzerland: { x: 535, y: 170 }, Belgium: { x: 525, y: 145 }, Austria: { x: 545, y: 165 },
	Poland: { x: 555, y: 145 }, Portugal: { x: 490, y: 210 },
	India: { x: 720, y: 245 }, China: { x: 820, y: 200 }, Japan: { x: 870, y: 195 },
	Singapore: { x: 820, y: 320 }, Australia: { x: 870, y: 380 },
	Brazil: { x: 320, y: 350 }, Mexico: { x: 200, y: 240 },
};

function worldFlowToDots(rows: WorldFlowPoint[]): Array<{ x: number; y: number; r: number }> {
	const maxDeals = Math.max(1, ...rows.map((r) => r.deal_count));
	return rows
		.map((r) => {
			const coords = COUNTRY_COORDS[r.country];
			if (!coords) return null;
			return {
				x: coords.x,
				y: coords.y,
				r: Math.max(2, Math.round((r.deal_count / maxDeals) * 10)),
			};
		})
		.filter((d): d is { x: number; y: number; r: number } => d !== null);
}

function DashboardHeader() {
	return (
		<div
			style={{
				display: 'flex',
				alignItems: 'flex-end',
				justifyContent: 'space-between',
				marginBottom: 'var(--space-5)',
				gap: 24,
				flexWrap: 'wrap',
			}}
		>
			<div>
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
					Mission Control · {new Date().toDateString()}
				</div>
				<h1
					style={{
						fontFamily: 'var(--font-display)',
						fontSize: 44,
						fontWeight: 800,
						letterSpacing: '-0.02em',
						lineHeight: 1,
						margin: 0,
					}}
				>
					Sports Tech Pulse.
				</h1>
				<p style={{ fontSize: 14, color: 'var(--fg-2)', maxWidth: 640, margin: '6px 0 0' }}>
					The state of the global sports technology ecosystem — live deal flow, M&A, ecosystem signals, and curated intelligence.
				</p>
			</div>
			<div style={{ display: 'flex', gap: 8 }}>
				<button className="btn ghost"><Filter size={12} /> Filters</button>
				<button className="btn"><Plus size={12} /> New Watchlist</button>
			</div>
		</div>
	);
}

function countryCode(countryName: string): string {
	const map: Record<string, string> = {
		'United States': 'US', USA: 'US', 'United Kingdom': 'GB', UK: 'GB',
		Germany: 'DE', France: 'FR', Italy: 'IT', Spain: 'ES', Netherlands: 'NL',
		Sweden: 'SE', Switzerland: 'CH', Belgium: 'BE', Austria: 'AT', Poland: 'PL',
		India: 'IN', China: 'CN', Japan: 'JP', Singapore: 'SG', Australia: 'AU',
		Brazil: 'BR', Canada: 'CA', Portugal: 'PT',
	};
	return map[countryName] ?? countryName.slice(0, 2).toUpperCase();
}

function splitDollars(n: number): { value: string; unit: string } {
	if (!Number.isFinite(n) || n <= 0) return { value: '—', unit: '' };
	if (n >= 1_000_000_000) return { value: `$${(n / 1_000_000_000).toFixed(2)}`, unit: 'B' };
	if (n >= 1_000_000) return { value: `$${(n / 1_000_000).toFixed(1)}`, unit: 'M' };
	if (n >= 1_000) return { value: `$${(n / 1_000).toFixed(0)}`, unit: 'K' };
	return { value: `$${n.toFixed(0)}`, unit: '' };
}

function formatShortDate(iso: string | null): string {
	if (!iso) return '—';
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return '—';
	return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
}

function splitDate(iso: string | null): { day: string; month: string } {
	if (!iso) return { day: '—', month: '—' };
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return { day: '—', month: '—' };
	return {
		day: String(d.getUTCDate()).padStart(2, '0'),
		month: d.toLocaleString('en-US', { month: 'short' }).toUpperCase(),
	};
}

function formatDealAmount(value: number | string | null | undefined): React.ReactNode {
	if (value == null) return <span style={{ color: 'var(--fg-muted)' }}>—</span>;
	const n = typeof value === 'string' ? Number(value) : value;
	if (!Number.isFinite(n) || n === 0) return <span style={{ color: 'var(--fg-muted)' }}>—</span>;
	const m = n / 1_000_000;
	const display = m >= 1000 ? `${(m / 1000).toFixed(1)}B` : m >= 1 ? m.toFixed(1) : (n / 1_000).toFixed(0) + 'K';
	const unit = m >= 1 ? 'M' : '';
	return <>${display}<span style={{ fontSize: 10, color: 'var(--fg-muted)', marginLeft: 2 }}>{unit}</span></>;
}
