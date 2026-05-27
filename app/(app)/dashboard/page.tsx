'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { ArrowRight } from 'lucide-react';
import { qk } from '@/lib/query-keys';
import {
	Page, Stat, Logo, Flag, SectionHead, Tag, Empty, AudiencePill,
} from '@/components/ui/atoms';

/**
 * Dashboard — pixel-aligned to `ui_design_2/app/screens-1.jsx`.
 *
 * Layout (top → bottom):
 *  1. PageHeader: full date kicker + "Pulse by SportsTechX." + sub.
 *  2. Hero stat strip: 4 `.card.feature` KPI tiles (Capital · YTD, Disclosed
 *     rounds, M&A · YTD, Median round) from `/api/analytics/*`.
 *  3. Two-column row (1.6fr / 1fr): Latest Funding Rounds + Latest Newsletter.
 *  4. Featured Reports — full-width card with 3-column report grid.
 *  5. Three-column footer: Actively Raising + Upcoming Events + Programs.
 *
 * Every data slot binds to a real API; no MOCK_* fallbacks.
 */

interface DashboardStats {
	total_funding: number;
	total_deals: number;
	total_acquisitions: number;
	total_companies: number;
	total_investors: number;
	total_ecosystem_entities: number;
}

interface FundingTotals {
	total_amount: number;
	round_count: number;
	median_amount: number;
	largest_amount: number;
}

interface DealResp { data: DealRow[]; total?: number }
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
	sector_slug?: string | null;
	primary_sector?: string | null;
	primary_sector_slug?: string | null;
	company_slug?: string | null;
}

interface CompanyResp { data: unknown[]; total?: number }

interface ReportResp { data: ReportRow[] }
interface ReportRow {
	id: string;
	short_title?: string;
	slug?: string;
	title: string;
	cover_url?: string | null;
	cover_color?: string | null;
	report_type?: string | null;
	pages?: number | null;
	report_year?: number | null;
	description?: string | null;
}

interface EventResp { data: EventRow[] }
interface EventRow {
	id: string;
	name: string;
	slug?: string | null;
	hq_city?: string | null;
	hq_country?: string | null;
	start_date?: string | null;
}

interface ProgramResp { data: ProgramRow[]; total?: number }
interface ProgramRow {
	id: string;
	name: string;
}

interface NewsletterArticle {
	title: string;
	link: string;
	description: string;
	thumbnail: string;
	pubDate: string;
	author: string;
}

interface QuarterlyPoint {
	year: number;
	quarter: number;
	quarter_label: string;
	total_amount: number;
	deal_count: number;
}

export default function DashboardPage() {
	const currentYear = new Date().getFullYear();
	const { data: stats } = useSWR<DashboardStats>(qk.analytics.dashboard('ytd'), { dedupingInterval: 10 * 60_000 });
	const { data: fundingTotals } = useSWR<FundingTotals>(qk.analytics.fundingTotals('ytd'), { dedupingInterval: 10 * 60_000 });
	const { data: quarters } = useSWR<QuarterlyPoint[]>(
		qk.analytics.quarterly({ from: currentYear - 2, to: currentYear }),
		{ dedupingInterval: 10 * 60_000 },
	);
	const { data: dealsResp } = useSWR<DealResp>(qk.deals.list({ limit: 8, sort: '-announced_date' }), { dedupingInterval: 5 * 60_000 });
	const { data: reports } = useSWR<ReportResp>(qk.reports.list(), { dedupingInterval: 30 * 60_000 });
	const { data: events } = useSWR<EventResp>(qk.ecosystem.listByType('event', { limit: 3, sort: 'start_date' }), { dedupingInterval: 30 * 60_000 });
	const { data: programs } = useSWR<ProgramResp>(qk.ecosystem.listByType('program', { limit: 4, status: 'open' }), { dedupingInterval: 30 * 60_000 });
	const { data: raisingResp } = useSWR<CompanyResp>(qk.companies.list({ is_actively_raising: true, limit: 1 }), { dedupingInterval: 10 * 60_000 });
	const { data: newsletter } = useSWR<NewsletterArticle[]>(qk.newsletter.articles(), { dedupingInterval: 30 * 60_000, revalidateOnFocus: false });

	const recentDeals = (dealsResp?.data ?? []).slice(0, 8);
	const featuredReports = (reports?.data ?? []).slice(0, 3);
	const upcomingEvents = (events?.data ?? []).slice(0, 3);
	const openPrograms = programs?.data ?? [];
	const programsCount = programs?.total ?? openPrograms.length;
	const actuallyRaising = raisingResp?.total ?? 0;
	const latestIssue = newsletter?.[0];

	return (
		<Page>
			<PageHeader />

			{/* Hero stat strip — all four use .card.feature (slate gradient in dark mode) */}
			<div className="grid-4" style={{ marginBottom: 'var(--space-5)' }}>
				{heroStrip(stats, fundingTotals, quarters).map((s) => (
					<div key={s.label} className="card feature" style={{ padding: 'var(--space-4)' }}>
						<Stat {...s} />
					</div>
				))}
			</div>

			{/* Funding rounds (1.6fr) + Newsletter (1fr) */}
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
									const sectorName = d.sector_name ?? d.primary_sector ?? '';
									const sectorSlug = d.sector_slug ?? d.primary_sector_slug ?? sectorName;
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
											<td>
												{sectorName
													? <AudiencePill sectorSlug={sectorSlug} label={sectorName} size="sm" />
													: <span style={{ color: 'var(--fg-muted)' }}>—</span>}
											</td>
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

				{/* Latest Newsletter — exact design parity */}
				<div className="card">
					<SectionHead
						title="Latest Newsletter"
						meta={latestIssue ? formatIssueDate(latestIssue.pubDate) : undefined}
						action={
							<Link className="btn ghost" href="/newsletter">
								All issues <ArrowRight size={12} />
							</Link>
						}
					/>
					<div style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', height: 'calc(100% - 48px)' }}>
						{!latestIssue ? (
							<Empty msg="No newsletter issues yet" />
						) : (
							<>
								<div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
									The Sports Tech Recap · {formatIssueDate(latestIssue.pubDate)}
								</div>
								<h3
									style={{
										fontFamily: 'var(--font-display)',
										fontSize: 22,
										fontWeight: 700,
										lineHeight: 1.2,
										marginBottom: 12,
										letterSpacing: '-0.01em',
									}}
								>
									{latestIssue.title}
								</h3>
								{/* Cover from Beehiiv RSS thumbnail — sits between title and description,
								    clickable, opens issue in new tab. */}
								{latestIssue.thumbnail && (
									<a
										href={latestIssue.link}
										target="_blank"
										rel="noopener noreferrer"
										style={{
											display: 'block',
											position: 'relative',
											aspectRatio: '16 / 9',
											overflow: 'hidden',
											marginBottom: 12,
											border: '1px solid var(--border)',
										}}
									>
										{/* eslint-disable-next-line @next/next/no-img-element */}
										<img
											src={latestIssue.thumbnail}
											alt=""
											style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
										/>
									</a>
								)}
								<p
									style={{
										fontSize: 13,
										color: 'var(--fg-2)',
										lineHeight: 1.55,
										// marginBottom: 16,
										flex: 1,
										display: '-webkit-box',
										WebkitLineClamp: 3,
										WebkitBoxOrient: 'vertical',
										overflow: 'hidden',
									}}
								>
									{stripHtml(latestIssue.description)}
								</p>
								<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
									<div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-muted)' }}>
										5 min read
									</div>
									<a href={latestIssue.link} target="_blank" rel="noopener noreferrer" className="btn">
										Read issue <ArrowRight size={12} />
									</a>
								</div>
							</>
						)}
					</div>
				</div>
			</div>

			{/* Featured Reports — full-width row */}
			<div className="card" style={{ marginBottom: 'var(--space-5)' }}>
				<SectionHead
					title="Featured Reports"
					meta="latest research"
					action={
						<Link className="btn ghost" href="/reports">
							All {(reports?.data?.length ?? 0) > 0 ? (reports!.data!.length) : ''} <ArrowRight size={12} />
						</Link>
					}
				/>
				<div style={{ padding: 'var(--space-3)', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-3)' }}>
					{featuredReports.length === 0 ? (
						<div style={{ gridColumn: '1 / -1' }}>
							<Empty msg="No reports published yet" />
						</div>
					) : (
						featuredReports.map((r) => {
							const slug = r.slug ?? r.short_title ?? r.id;
							const coverBg = r.cover_url
								? `url(${r.cover_url}) center/cover`
								: (r.cover_color ?? 'oklch(58% 0.22 240)');
							return (
								<Link key={r.id} href={`/reports/${slug}`} className="report-card">
									<div className="report-cover" style={{ background: coverBg }}>
										<span className="rc-meta">
											{r.report_year ?? ''}{r.pages ? ` · ${r.pages}p` : ''}
										</span>
										<span className="rc-title">{r.title}</span>
									</div>
									<div style={{ padding: 'var(--space-3)' }}>
										<div style={{ fontSize: 12, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
											{r.report_type ?? 'Report'}
										</div>
										<div style={{ fontWeight: 600, marginBottom: 4 }}>{r.title}</div>
										{r.description && (
											<div
												style={{
													fontSize: 12,
													color: 'var(--fg-2)',
													display: '-webkit-box',
													WebkitLineClamp: 2,
													WebkitBoxOrient: 'vertical',
													overflow: 'hidden',
												}}
											>
												{r.description}
											</div>
										)}
									</div>
								</Link>
							);
						})
					)}
				</div>
			</div>

			{/* Footer feeds — Actively Raising / Upcoming Events / Programs */}
			<div className="grid-3">
				<div className="card" style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column' }}>
					<div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
						Actively Raising
					</div>
					<div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
						<h3 style={{ fontFamily: 'var(--font-display)', fontSize: 44, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1, margin: 0 }}>
							{actuallyRaising.toLocaleString()}
						</h3>
					</div>
					<p style={{ fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.55, marginBottom: 12 }}>
						Companies confirmed to be on the market or in active conversations with investors — filterable by stage, sector and geography.
					</p>
					<div style={{ marginTop: 'auto' }}>
						<Link className="btn" href="/companies?is_actively_raising=true">
							View companies <ArrowRight size={12} />
						</Link>
					</div>
				</div>

				<div className="card" style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column' }}>
					<div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
						Upcoming Events
					</div>
					{upcomingEvents.length === 0 ? (
						<div style={{ flex: 1, display: 'grid', placeItems: 'center', minHeight: 80 }}>
							<Empty msg="No upcoming events" />
						</div>
					) : (
						<div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
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
											<div style={{ fontSize: 11, color: 'var(--fg-muted)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
												{cc && <Flag cc={cc} />} {e.hq_city ?? e.hq_country ?? '—'}
											</div>
										</div>
									</Link>
								);
							})}
						</div>
					)}
					<div style={{ marginTop: 'auto' }}>
						<Link className="btn" href="/events">
							Browse events <ArrowRight size={12} />
						</Link>
					</div>
				</div>

				<div className="card" style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column' }}>
					<div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
						Programs
					</div>
					<h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 6, fontFamily: 'var(--font-display)' }}>
						{programsCount} active accelerator{programsCount === 1 ? '' : 's'}
					</h3>
					<p style={{ fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.55, marginBottom: 12 }}>
						{openPrograms.length > 0
							? `${openPrograms.slice(0, 4).map((p) => p.name).join(', ')} — applications open.`
							: 'Sports-tech accelerators with applications currently open.'}
					</p>
					<div style={{ marginTop: 'auto' }}>
						<Link className="btn" href="/programs">
							Browse programs <ArrowRight size={12} />
						</Link>
					</div>
				</div>
			</div>
		</Page>
	);
}

function PageHeader() {
	const dateStr = new Date().toLocaleDateString('en-US', {
		weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
	});
	return (
		<div style={{ marginBottom: 'var(--space-5)' }}>
			<div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
				{dateStr}
			</div>
			<h1 style={{ fontFamily: 'var(--font-display)', fontSize: 44, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1, marginBottom: 8 }}>
				Pulse by SportsTechX.
			</h1>
			<p style={{ fontSize: 14, color: 'var(--fg-2)', maxWidth: 640, margin: 0 }}>
				The state of the global sports technology ecosystem — live deal flow, M&amp;A, ecosystem signals, and curated intelligence.
			</p>
		</div>
	);
}

/**
 * Build the 4 hero stat cards. Sparklines + QoQ deltas are derived from the
 * quarterly capital flow series — falls back to no spark + no delta if the
 * series isn't loaded yet.
 */
function heroStrip(
	s: DashboardStats | undefined,
	f: FundingTotals | undefined,
	q: QuarterlyPoint[] | undefined,
) {
	const cap = splitDollars(s?.total_funding ?? 0);
	const median = splitDollars(f?.median_amount ?? 0);
	const year = new Date().getFullYear();

	// Sparkline series — last 12 data points if available.
	const capSpark = q ? q.slice(-12).map((p) => p.total_amount) : undefined;
	const roundsSpark = q ? q.slice(-12).map((p) => p.deal_count) : undefined;

	// QoQ delta — compare last quarter to the one before.
	const capDelta = pctDelta(q, (p) => p.total_amount);
	const roundsDelta = pctDelta(q, (p) => p.deal_count);

	return [
		{
			label: `Capital · YTD ${year}`,
			value: cap.value,
			unit: cap.unit,
			delta: capDelta?.label,
			deltaDir: (capDelta?.dir ?? 'pos') as 'pos' | 'neg',
			spark: capSpark,
		},
		{
			label: 'Disclosed rounds',
			value: (s?.total_deals ?? 0).toLocaleString(),
			delta: roundsDelta?.label,
			deltaDir: (roundsDelta?.dir ?? 'pos') as 'pos' | 'neg',
			spark: roundsSpark,
		},
		{
			label: 'M&A · YTD',
			value: (s?.total_acquisitions ?? 0).toLocaleString(),
			deltaDir: 'pos' as const,
		},
		{
			label: 'Median round',
			value: median.value,
			unit: median.unit,
			deltaDir: 'pos' as const,
		},
	];
}

function pctDelta(
	series: QuarterlyPoint[] | undefined,
	pick: (p: QuarterlyPoint) => number,
): { label: string; dir: 'pos' | 'neg' } | null {
	if (!series || series.length < 2) return null;
	const last = pick(series[series.length - 1]);
	const prev = pick(series[series.length - 2]);
	if (prev === 0) return null;
	const pct = Math.round(((last - prev) / prev) * 100);
	if (!Number.isFinite(pct) || pct === 0) return null;
	return {
		label: `${pct > 0 ? '+' : ''}${pct}% QoQ`,
		dir: pct >= 0 ? 'pos' : 'neg',
	};
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

function formatIssueDate(iso: string): string {
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return iso;
	return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
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
	const display = m >= 1000 ? `${(m / 1000).toFixed(1)}` : m >= 1 ? m.toFixed(1) : (n / 1_000).toFixed(0);
	const unit = m >= 1000 ? 'B' : m >= 1 ? 'M' : 'K';
	return <>${display}<span style={{ fontSize: 10, color: 'var(--fg-muted)', marginLeft: 2 }}>{unit}</span></>;
}

function stripHtml(html: string | null | undefined): string {
	if (!html) return '';
	return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}
