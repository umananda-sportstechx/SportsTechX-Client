'use client';

import Link from 'next/link';
import { useQuery } from '@/lib/query-client';
import { Filter, Plus, ArrowRight } from 'lucide-react';
import { qk } from '@/lib/query-keys';
import {
	Page, Stat, Sparkline, Logo, Flag, SectionHead, WorldMap, Tag, SectorPill,
	Heatmap, PipelineFunnel,
} from '@/components/ui/atoms';

/**
 * Dashboard — mission-control overview.
 * Pixel-perfect port of ui_design/screens-1.jsx Dashboard.
 *
 * Live data sources:
 *   • /api/companies      — total + movers
 *   • /api/deals          — recent funding + counts
 *   • /api/acquisitions   — M&A count
 *   • /api/reports        — featured reports
 *   • /api/ecosystem-entities?type=event — upcoming events
 *
 * Sections that lack backend aggregation today (Sector Heat, Pipeline Funnel,
 * map-region breakdown, hero KPIs) fall through to the MOCK_* constants
 * below — exact values from the ui_design prototype's STX_DATA. Replace each
 * constant with a real `/api/analytics/*` query when the endpoint ships.
 */

// PLACEHOLDER — replace when /api/analytics/dashboard-stats ships.
const MOCK_HERO_STATS = [
	{ label: 'Capital · YTD 2026', value: '$2.22', unit: 'B', delta: '+12% QoQ', deltaDir: 'pos' as const, spark: [42, 44, 41, 47, 50, 55, 58, 62, 65, 70, 74, 78] },
	{ label: 'Disclosed rounds', value: '105', delta: '+22 vs Q4', deltaDir: 'pos' as const, spark: [60, 62, 65, 68, 70, 73, 76, 80, 82, 85, 88, 92] },
	{ label: 'M&A · YTD', value: '38', delta: '+58% YoY', deltaDir: 'pos' as const, spark: [4, 5, 7, 6, 8, 9, 11, 13, 15, 18, 22, 26] },
	{ label: 'Median round', value: '$4.2', unit: 'M', delta: '−8% QoQ', deltaDir: 'neg' as const, spark: [55, 52, 50, 48, 45, 42, 40, 38, 36, 34, 32, 30] },
];

// PLACEHOLDER — replace when /api/analytics/sector-heat ships.
const MOCK_SECTOR_HEAT = [
	{ label: 'Wearables', values: [12, 18, 22, 28, 24, 31, 38, 42] },
	{ label: 'Tracking & Analytics', values: [38, 42, 45, 52, 58, 64, 71, 78] },
	{ label: 'Fan Engagement', values: [62, 58, 64, 71, 76, 82, 88, 94] },
	{ label: 'Streaming', values: [44, 51, 47, 54, 58, 62, 64, 71] },
	{ label: 'Performance', values: [22, 28, 31, 36, 41, 46, 52, 58] },
	{ label: 'Recovery', values: [8, 10, 12, 14, 18, 22, 26, 31] },
	{ label: 'Esports', values: [78, 71, 64, 58, 51, 47, 41, 36] },
	{ label: 'Equipment', values: [24, 26, 28, 31, 34, 36, 38, 42] },
];

// PLACEHOLDER — replace when /api/analytics/pipeline ships.
const MOCK_PIPELINE = [
	{ label: 'Tracked signals', value: 1247, color: 'var(--bg-3)' },
	{ label: 'Verified rounds', value: 286, color: 'var(--accent)' },
	{ label: 'Disclosed amount', value: 124, color: 'var(--accent)' },
	{ label: 'Notable (>$10M)', value: 38, color: 'var(--pos)' },
	{ label: 'Featured', value: 12, color: 'var(--accent-2)' },
];

// PLACEHOLDER — replace when /api/analytics/world-flow ships.
const MOCK_MAP_DOTS = [
	{ x: 240, y: 180, r: 8 }, { x: 230, y: 165, r: 4 }, { x: 200, y: 220, r: 3 },
	{ x: 320, y: 350, r: 5 }, { x: 290, y: 380, r: 2 },
	{ x: 500, y: 145, r: 6 }, { x: 530, y: 155, r: 5 }, { x: 510, y: 165, r: 4 },
	{ x: 525, y: 180, r: 3 }, { x: 540, y: 175, r: 3 }, { x: 525, y: 130, r: 3 },
	{ x: 535, y: 120, r: 2 }, { x: 545, y: 145, r: 2 }, { x: 555, y: 165, r: 2 },
	{ x: 600, y: 220, r: 4 }, { x: 620, y: 220, r: 3 },
	{ x: 720, y: 245, r: 6 }, { x: 820, y: 200, r: 6 }, { x: 870, y: 195, r: 5 },
	{ x: 850, y: 200, r: 4 }, { x: 750, y: 280, r: 3 },
	{ x: 870, y: 380, r: 4 }, { x: 920, y: 400, r: 2 },
	{ x: 530, y: 290, r: 3 }, { x: 540, y: 380, r: 3 },
];

// PLACEHOLDER — top 8 ui_design DEALS, used when API has fewer than 8 rows.
const MOCK_RECENT_DEALS = [
	{ id: 'mk-1', date: 'May 14', name: 'Pickleball.com',         sector: 'Media & Streaming',   round: 'Growth',   cc: 'BA', amount: 225,  color: '#A855F7' },
	{ id: 'mk-2', date: 'May 12', name: 'Teamworks',              sector: 'Performance',         round: 'Series C', cc: 'US', amount: 100,  color: '#0F172A' },
	{ id: 'mk-3', date: 'May 09', name: 'Fastbreak AI',           sector: 'Performance',         round: 'Series B', cc: 'US', amount: 80,   color: '#22D3EE' },
	{ id: 'mk-4', date: 'May 06', name: 'ASB GlassFloor',         sector: 'Stadium & Facilities',round: 'Series A', cc: 'DE', amount: 30,   color: '#94A3B8' },
	{ id: 'mk-5', date: 'May 03', name: 'Metasports Interactive', sector: 'Esports',             round: 'Series B', cc: 'IN', amount: 20,   color: '#0EA5E9' },
	{ id: 'mk-6', date: 'Apr 28', name: 'Hoopers',                sector: 'Fan Engagement',      round: 'Series A', cc: 'PT', amount: 15.9, color: '#A78BFA' },
	{ id: 'mk-7', date: 'Apr 24', name: 'Gemini Sports Analytics',sector: 'Performance',         round: 'Series A', cc: 'US', amount: 15.1, color: '#F472B6' },
	{ id: 'mk-8', date: 'Apr 20', name: 'PlayReplay',             sector: 'Performance',         round: 'Series A', cc: 'SE', amount: 12,   color: '#3B82F6' },
];

// PLACEHOLDER — 3-card "Featured Reports" fallback (mirrors STX_DATA.REPORTS[0..2])
const MOCK_FEATURED_REPORTS = [
	{ id: 'mr-1', title: 'Global Sports Tech Ecosystem Report 2026', kind: 'Flagship', year: '2026', pages: 184, color: 'linear-gradient(135deg, oklch(58% 0.22 350), oklch(70% 0.18 290))' },
	{ id: 'mr-2', title: 'Global Sports Tech VC Report 2025',         kind: 'VC',       year: '2025', pages: 124, color: 'linear-gradient(135deg, oklch(70% 0.18 145), oklch(58% 0.22 200))' },
	{ id: 'mr-3', title: 'Football Tech Report 2025',                 kind: 'Vertical', year: '2025', pages: 96,  color: 'linear-gradient(135deg, oklch(78% 0.16 75), oklch(65% 0.22 25))' },
];

// PLACEHOLDER — 6 mover rows (mirrors STX_DATA.COMPANIES[0..5] with synthetic deltas)
const MOCK_MOVERS = [
	{ id: 'mv-1', name: 'Pickleball.com',         hq: 'Sarajevo',   cc: 'BA', sector: 'Media & Streaming',     spark: [40, 44, 48, 52, 58, 64, 71, 78, 82, 85, 88, 92], color: '#A855F7' },
	{ id: 'mv-2', name: 'Teamworks',              hq: 'Durham',     cc: 'US', sector: 'Performance',           spark: [50, 52, 55, 58, 62, 64, 66, 70, 74, 76, 79, 82], color: '#0F172A' },
	{ id: 'mv-3', name: 'Fastbreak AI',           hq: 'Charlotte',  cc: 'US', sector: 'Performance',           spark: [45, 47, 50, 52, 55, 57, 60, 63, 65, 67, 70, 72], color: '#22D3EE' },
	{ id: 'mv-4', name: 'ASB GlassFloor',         hq: 'Stein',      cc: 'DE', sector: 'Stadium & Facilities',  spark: [55, 54, 56, 58, 60, 62, 63, 65, 64, 66, 67, 68], color: '#94A3B8' },
	{ id: 'mv-5', name: 'Metasports Interactive', hq: 'Hyderabad',  cc: 'IN', sector: 'Esports',               spark: [38, 42, 47, 51, 56, 61, 65, 70, 74, 78, 82, 85], color: '#0EA5E9' },
	{ id: 'mv-6', name: 'Hoopers',                hq: 'Lisbon',     cc: 'PT', sector: 'Fan Engagement',        spark: [50, 51, 53, 55, 56, 58, 60, 61, 63, 64, 66, 68], color: '#A78BFA' },
];

// PLACEHOLDER — 3 upcoming events (mirrors STX_DATA.EVENTS[0..2])
const MOCK_EVENTS = [
	{ id: 'me-1', name: 'IBM Sports Tech Startup Challenge', month: 'MAY', day: 11, cc: 'CA', city: 'Vancouver' },
	{ id: 'me-2', name: 'Impact Players Conf.',              month: 'MAY', day: 12, cc: 'GB', city: 'Belfast' },
	{ id: 'me-3', name: 'Media Production & Tech Show',      month: 'MAY', day: 13, cc: 'GB', city: 'London' },
];

interface DealResp { data: Array<DealRow>; total?: number; }
interface DealRow {
	id: string;
	company_name?: string;
	company?: { name: string; slug?: string; color?: string };
	amount_usd?: number | string | null;
	round_type?: string | null;
	announced_date?: string | null;
	country_code?: string | null;
	sector_name?: string | null;
}

interface CompanyResp { data: Array<CompanyRow>; total?: number; }
interface CompanyRow {
	id: string;
	name: string;
	slug?: string;
	primary_sector?: string | null;
	hq_city?: string | null;
	hq_country?: string | null;
}

interface ReportResp { data: Array<ReportRow>; }
interface ReportRow {
	id: string;
	short_title?: string;
	title: string;
	cover_url?: string | null;
	report_type?: string | null;
	pages?: number | null;
	year?: number | null;
}

interface EventResp { data: Array<EventRow>; }
interface EventRow {
	id: string;
	name: string;
	city?: string | null;
	country_code?: string | null;
	start_date?: string | null;
}

interface AcquisitionResp { total?: number; }

export default function DashboardPage() {
	const { data: companies } = useQuery<CompanyResp>({ queryKey: qk.companies.list({ limit: 6 }), staleTime: 5 * 60_000 });
	const { data: dealsResp } = useQuery<DealResp>({ queryKey: qk.deals.list({ limit: 20, sort: '-announced_date' }), staleTime: 5 * 60_000 });
	const { data: acquisitions } = useQuery<AcquisitionResp>({ queryKey: qk.acquisitions.list({ limit: 1 }), staleTime: 60 * 60_000 });
	const { data: reports } = useQuery<ReportResp>({ queryKey: qk.reports.list(), staleTime: 30 * 60_000 });
	const { data: events } = useQuery<EventResp>({ queryKey: qk.ecosystem.listByType('event', { limit: 3 }), staleTime: 30 * 60_000 });

	const totalCompanies = companies?.total ?? 0;
	const recentDealsApi = (dealsResp?.data ?? []).slice(0, 20);
	const totalDeals = dealsResp?.total ?? 0;
	const totalMa = acquisitions?.total ?? 0;
	const movers = (companies?.data ?? []).slice(0, 6);
	const featuredReportsApi = (reports?.data ?? []).slice(0, 3);
	const upcomingEvents = (events?.data ?? []).slice(0, 3);

	// Use real data when available, top up with mocks to keep the layout dense.
	const showMockDeals = recentDealsApi.length < 8;
	const showMockReports = featuredReportsApi.length < 3;
	const showMockMovers = movers.length === 0;
	const showMockEvents = upcomingEvents.length === 0;

	// Hero KPIs: when API has any companies, show the live count for that one
	// card and keep the others on prototype values until aggregation lands.
	const heroStats = MOCK_HERO_STATS.map((s, i) => {
		if (i === 0 && totalDeals > 0) return s; // keep prototype headline for capital
		if (i === 1 && totalDeals > 0) return { ...s, value: totalDeals.toLocaleString(), unit: '' };
		if (i === 2 && totalMa > 0) return { ...s, value: totalMa.toLocaleString() };
		if (i === 3 && totalCompanies > 0) return s;
		return s;
	});

	return (
		<Page>
			<DashboardHeader />

			{/* Hero stat strip — first card uses the `feature` variant for emphasis */}
			<div className="grid-4" style={{ marginBottom: 'var(--space-5)' }}>
				{heroStats.map((s, i) => (
					<div key={s.label} className={`card ${i === 0 ? 'feature' : ''}`} style={{ padding: 'var(--space-4)' }}>
						<Stat {...s} />
					</div>
				))}
			</div>

			{/* Map + Sector Heat */}
			<div className="grid-2" style={{ gridTemplateColumns: '1.6fr 1fr', marginBottom: 'var(--space-5)' }}>
				<div className="card">
					<SectionHead title="Global Activity" meta="2026 YTD · 105 rounds" />
					<div style={{ padding: 'var(--space-3)' }}>
						<WorldMap height={320} dots={MOCK_MAP_DOTS} />
						<div
							style={{
								display: 'flex',
								gap: 24,
								justifyContent: 'center',
								marginTop: 8,
								flexWrap: 'wrap',
								fontSize: 11,
								fontFamily: 'var(--font-mono)',
								color: 'var(--fg-muted)',
								textTransform: 'uppercase',
								letterSpacing: '0.08em',
							}}
						>
							<span>🇺🇸 N. America 38%</span>
							<span>🇪🇺 Europe 31%</span>
							<span>🇮🇳 APAC 22%</span>
							<span>🌍 Other 9%</span>
						</div>
					</div>
				</div>

				<div className="card">
					<SectionHead title="Sector Heat" meta="QoQ funding %" />
					<div style={{ padding: 'var(--space-4)' }}>
						<Heatmap data={MOCK_SECTOR_HEAT} />
					</div>
				</div>
			</div>

			{/* Latest funding + Featured reports */}
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
					<table className="data-table">
						<thead>
							<tr>
								<th>Date</th><th>Company</th><th>Sector</th><th>Round</th><th>Loc</th>
								<th style={{ textAlign: 'right' }}>Amount</th>
							</tr>
						</thead>
						<tbody>
							{showMockDeals
								? MOCK_RECENT_DEALS.map((d) => (
									<tr key={d.id}>
										<td className="num">{d.date}</td>
										<td>
											<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
												<Logo co={{ name: d.name, color: d.color }} size={24} />
												<span style={{ fontWeight: 600 }}>{d.name}</span>
											</div>
										</td>
										<td><SectorPill name={d.sector} /></td>
										<td><Tag variant="pos">{d.round}</Tag></td>
										<td><Flag cc={d.cc} /></td>
										<td className="num" style={{ textAlign: 'right', fontWeight: 700 }}>
											${d.amount}<span style={{ fontSize: 10, color: 'var(--fg-muted)', marginLeft: 2 }}>M</span>
										</td>
									</tr>
								))
								: recentDealsApi.map((d) => {
									const coName = d.company?.name ?? d.company_name ?? '—';
									const coSlug = d.company?.slug;
									return (
										<tr key={d.id}>
											<td className="num">{formatShortDate(d.announced_date ?? null)}</td>
											<td>
												<Link
													href={coSlug ? `/companies/${coSlug}` : '/funding'}
													style={{ display: 'flex', alignItems: 'center', gap: 8 }}
												>
													<Logo co={{ name: coName, color: d.company?.color }} size={24} />
													<span style={{ fontWeight: 600 }}>{coName}</span>
												</Link>
											</td>
											<td>{d.sector_name ? <SectorPill name={d.sector_name} /> : '—'}</td>
											<td>
												<Tag variant={d.round_type?.toLowerCase().includes('acquired') ? 'pill' : 'pos'}>
													{d.round_type ?? '—'}
												</Tag>
											</td>
											<td>{d.country_code ? <Flag cc={d.country_code} /> : '—'}</td>
											<td className="num" style={{ textAlign: 'right', fontWeight: 700 }}>
												{formatDealAmount(d.amount_usd)}
											</td>
										</tr>
									);
								})}
						</tbody>
					</table>
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
						{showMockReports
							? MOCK_FEATURED_REPORTS.map((r) => (
								<Link key={r.id} href="/reports" className="report-card">
									<div className="report-cover" style={{ background: r.color }}>
										<span className="rc-meta">{r.year} · {r.pages}p</span>
										<span className="rc-title">{r.title}</span>
									</div>
									<div style={{ padding: 'var(--space-3)' }}>
										<div style={{ fontSize: 12, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
											{r.kind}
										</div>
										<div style={{ fontWeight: 600 }}>{r.title}</div>
									</div>
								</Link>
							))
							: featuredReportsApi.map((r, i) => {
								const slug = r.short_title ?? r.id;
								const accent = MOCK_FEATURED_REPORTS[i % MOCK_FEATURED_REPORTS.length].color;
								return (
									<Link key={r.id} href={`/reports/${slug}`} className="report-card">
										<div className="report-cover" style={{ background: r.cover_url ? `url(${r.cover_url}) center/cover` : accent }}>
											<span className="rc-meta">{r.year ?? '2026'} · {r.pages ?? '—'}p</span>
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
							})}
					</div>
				</div>
			</div>

			{/* Movers + Pipeline funnel */}
			<div className="grid-2" style={{ marginBottom: 'var(--space-5)' }}>
				<div className="card">
					<SectionHead title="Movers" meta="Most-watched · 7d" />
					<div style={{ padding: 'var(--space-3)' }}>
						{(showMockMovers ? MOCK_MOVERS : movers).map((c, i, arr) => {
							const isMock = showMockMovers;
							const spark = isMock ? (c as typeof MOCK_MOVERS[number]).spark : generateSpark((c as CompanyRow).id);
							const first = spark[0];
							const last = spark[spark.length - 1];
							const deltaPct = ((last - first) / first * 100).toFixed(1);
							const dir: 'pos' | 'neg' = last >= first ? 'pos' : 'neg';
							const name = isMock ? (c as typeof MOCK_MOVERS[number]).name : (c as CompanyRow).name;
							const cc = isMock ? (c as typeof MOCK_MOVERS[number]).cc : ((c as CompanyRow).hq_country ? countryCode((c as CompanyRow).hq_country!) : '');
							const subline = isMock
								? `${(c as typeof MOCK_MOVERS[number]).hq} · ${(c as typeof MOCK_MOVERS[number]).sector}`
								: `${(c as CompanyRow).hq_city ?? ''}${(c as CompanyRow).hq_city && (c as CompanyRow).primary_sector ? ' · ' : ''}${(c as CompanyRow).primary_sector ?? ''}`;
							const color = isMock ? (c as typeof MOCK_MOVERS[number]).color : undefined;
							const id = isMock ? (c as typeof MOCK_MOVERS[number]).id : (c as CompanyRow).id;
							const slug = isMock ? null : ((c as CompanyRow).slug ?? (c as CompanyRow).id);
							return (
								<div
									key={id}
									style={{
										display: 'flex',
										alignItems: 'center',
										gap: 12,
										padding: '10px 6px',
										borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none',
									}}
								>
									<div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-muted)', width: 22 }}>
										{String(i + 1).padStart(2, '0')}
									</div>
									<Logo co={{ name, color }} size={32} />
									<div style={{ flex: 1, minWidth: 0 }}>
										{slug ? (
											<Link href={`/companies/${slug}`} style={{ fontWeight: 600 }}>{name}</Link>
										) : (
											<div style={{ fontWeight: 600 }}>{name}</div>
										)}
										<div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>
											{cc && <Flag cc={cc} />} {subline}
										</div>
									</div>
									<Sparkline values={spark} w={50} h={20} fill={false} />
									<div className={`stat-delta ${dir}`} style={{ minWidth: 56, justifyContent: 'flex-end' }}>
										{dir === 'pos' ? '▲' : '▼'} {Math.abs(Number(deltaPct))}%
									</div>
								</div>
							);
						})}
					</div>
				</div>

				<div className="card">
					<SectionHead title="Pipeline · This Week" meta="Funding signals" />
					<div style={{ padding: 'var(--space-3)' }}>
						<PipelineFunnel stages={MOCK_PIPELINE} />
					</div>
				</div>
			</div>

			{/* Footer feeds */}
			<div className="grid-3">
				<div className="card" style={{ padding: 'var(--space-4)' }}>
					<div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
						Newsletter · This Week
					</div>
					<h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 6, fontFamily: 'var(--font-display)' }}>
						The Sports Tech Recap #424
					</h3>
					<p style={{ fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.55, marginBottom: 12 }}>
						Pickleball.com lands $225M, Genius/Legend close, and the wearables sub-sector heats up after Nextiles exit.
					</p>
					<Link className="btn" href="/newsletter">
						Read issue <ArrowRight size={12} />
					</Link>
				</div>

				<div className="card" style={{ padding: 'var(--space-4)' }}>
					<div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
						Upcoming Events
					</div>
					<div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
						{(showMockEvents ? MOCK_EVENTS : upcomingEvents).map((e) => {
							const isMock = showMockEvents;
							const day = isMock ? (e as typeof MOCK_EVENTS[number]).day : splitDate((e as EventRow).start_date ?? null).day;
							const month = isMock ? (e as typeof MOCK_EVENTS[number]).month : splitDate((e as EventRow).start_date ?? null).month;
							const cc = isMock ? (e as typeof MOCK_EVENTS[number]).cc : (e as EventRow).country_code;
							const city = isMock ? (e as typeof MOCK_EVENTS[number]).city : ((e as EventRow).city ?? '');
							const name = isMock ? (e as typeof MOCK_EVENTS[number]).name : (e as EventRow).name;
							const id = isMock ? (e as typeof MOCK_EVENTS[number]).id : (e as EventRow).id;
							return (
								<Link key={id} href="/events" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
									<div style={{ width: 44, height: 44, background: 'var(--bg-3)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
										<div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, lineHeight: 1, textAlign: 'center' }}>
											<div style={{ fontSize: 9, color: 'var(--fg-muted)' }}>{month}</div>
											{day}
										</div>
									</div>
									<div style={{ flex: 1, minWidth: 0 }}>
										<div style={{ fontWeight: 600, fontSize: 13 }}>{name}</div>
										<div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>
											{cc && <Flag cc={cc} />} {city}
										</div>
									</div>
								</Link>
							);
						})}
					</div>
				</div>

				<div className="card" style={{ padding: 'var(--space-4)' }}>
					<div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
						Programs
					</div>
					<h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 6, fontFamily: 'var(--font-display)' }}>
						4 active accelerators
					</h3>
					<p style={{ fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.55, marginBottom: 12 }}>
						Stadia Ventures, Comcast NBC, Techstars Sports & LeAD — applications open through Q3.
					</p>
					<Link className="btn" href="/programs">
						Browse programs <ArrowRight size={12} />
					</Link>
				</div>
			</div>
		</Page>
	);
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

function generateSpark(seed: string): number[] {
	let x = (seed.charCodeAt(0) ?? 0) + (seed.charCodeAt(1) ?? 0);
	const out: number[] = [];
	let v = 50;
	for (let i = 0; i < 12; i += 1) {
		x = (x * 9301 + 49297) % 233280;
		const r = (x / 233280 - 0.5) * 20 + 2;
		v = Math.max(10, Math.min(90, v + r));
		out.push(v);
	}
	return out;
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
