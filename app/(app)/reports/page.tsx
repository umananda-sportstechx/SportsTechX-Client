'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { ArrowRight, Lock } from 'lucide-react';
import { qk } from '@/lib/query-keys';
import { Page, Tag, SectionHead, Empty, PageTitle } from '@/components/ui/atoms';
import { useFeatureAccess } from '@/contexts/feature-access-context';

interface Report {
	id: string;
	slug?: string;
	title: string;
	short_title?: string | null;
	description?: string | null;
	report_type?: string | null;
	pages?: number | null;
	published_at?: string | null;
	cover_url?: string | null;
	is_free?: boolean;
	drive_link?: string | null;
	is_published?: boolean;       // false → admin-only visibility; show DRAFT chip on the card
}

interface ReportsResponse {
	data: Report[];
	total: number;
}

// PLACEHOLDER — STX_DATA.REPORTS verbatim, displayed when API returns none.
const MOCK_REPORTS: Array<{
	id: string; title: string; kind: string; desc: string; year: string; pages: number; color: string;
}> = [
	{ id: 'mr-1', title: 'Global Sports Tech Ecosystem Report 2026', kind: 'Flagship', desc: 'Definitive overview of the global sports tech ecosystem.',            year: '2026', pages: 184, color: '#0F172A' },
	{ id: 'mr-2', title: 'Global Sports Tech VC Report 2025',         kind: 'VC',       desc: 'Deep dive into investment activity, capital flow, and exit trends.',  year: '2025', pages: 124, color: '#1E40AF' },
	{ id: 'mr-3', title: 'Football Tech Report 2025',                 kind: 'Vertical', desc: 'Innovation & investment in global football tech.',                    year: '2025', pages: 96,  color: '#15803D' },
	{ id: 'mr-4', title: 'Saudi Arabia Sport Business & Tech Report', kind: 'Regional', desc: 'Overview of the Saudi Arabian sport ecosystem.',                      year: '2025', pages: 78,  color: '#0C4A6E' },
	{ id: 'mr-5', title: 'Indian Sports Business & Tech Report 2025', kind: 'Regional', desc: 'Overview of the Indian sports business and tech.',                    year: '2025', pages: 82,  color: '#7C2D12' },
	{ id: 'mr-6', title: 'Womens Sport Tech 2025',                    kind: 'Vertical', desc: "Investment, audience growth, and innovation in women's sport.",      year: '2025', pages: 64,  color: '#BE185D' },
];

const COVER_COLORS = [
	'#0F172A', '#1E40AF', '#15803D', '#0C4A6E', '#7C2D12', '#BE185D', '#1E293B', '#0F766E',
];

export default function ReportsPage() {
	const reportsAccess = useFeatureAccess('reports_access');
	const { data, isLoading } = useSWR<ReportsResponse>(qk.reports.list(), {
		dedupingInterval: 10 * 60_000,
	});

	const reportsApi = data?.data ?? [];
	const useMock = !isLoading && reportsApi.length === 0;
	const total = useMock ? MOCK_REPORTS.length : (data?.total ?? reportsApi.length);
	const featuredApi = reportsApi[0];
	const restApi = reportsApi.slice(1);

	return (
		<Page>
			<PageTitle
				kicker={`Library · ${total.toLocaleString()} reports`}
				title="Reports"
				sub="Deep, expert-authored analyses of sports tech sub-sectors and regions — used by leagues, brands, and investors."
				action={!reportsAccess.hasAccess ? (
					<Link href="/subscriptions"><button className="btn">Subscribe to access all</button></Link>
				) : undefined}
			/>

			{isLoading && reportsApi.length === 0 ? (
				<Empty msg="Loading…" />
			) : useMock ? (
				<>
					<MockFeaturedHero r={MOCK_REPORTS[0]} hasAccess={reportsAccess.hasAccess} />
					<SectionHead title="All Reports" meta={`${MOCK_REPORTS.length} published`} />
					<div className="rep-grid">
						{MOCK_REPORTS.slice(1).map((r) => <MockReportCard key={r.id} r={r} />)}
					</div>
				</>
			) : featuredApi ? (
				<>
					<div
						className="card"
						style={{
							marginBottom: 'var(--space-5)',
							overflow: 'hidden',
							display: 'grid',
							gridTemplateColumns: '380px 1fr',
						}}
					>
						<div
							className="report-cover"
							style={{ background: coverColor(featuredApi, 0), height: 320, position: 'relative' }}
						>
							{featuredApi.is_published === false && (
								<span style={{
									position: 'absolute', top: 12, right: 12,
									padding: '4px 10px', background: '#fbbf24', color: '#7c2d12',
									fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', borderRadius: 2,
								}}>
									DRAFT
								</span>
							)}
							<span className="rc-meta">
								{splitYear(featuredApi.published_at, featuredApi.id)}{featuredApi.pages ? ` · ${featuredApi.pages}p` : ` · 124p`}
							</span>
							<span className="rc-title">{featuredApi.short_title ?? featuredApi.title}</span>
						</div>
						<div
							style={{
								padding: 'var(--space-5)',
								display: 'flex',
								flexDirection: 'column',
								justifyContent: 'center',
							}}
						>
							<Tag variant="pos">Just released</Tag>
							<h2
								style={{
									fontFamily: 'var(--font-display)',
									fontSize: 28,
									fontWeight: 800,
									letterSpacing: '-0.02em',
									lineHeight: 1.1,
									margin: '12px 0 8px',
								}}
							>
								{featuredApi.title}
							</h2>
							<p style={{ fontSize: 14, color: 'var(--fg-2)', lineHeight: 1.55, marginBottom: 16 }}>
								{featuredApi.description ?? 'The definitive overview of the global sports tech ecosystem — capital flows, sub-sector innovation, regional analysis, and 184 pages of research.'}
							</p>
							<div style={{ display: 'flex', gap: 8 }}>
								{reportsAccess.hasAccess && featuredApi.drive_link ? (
									<a href={featuredApi.drive_link} target="_blank" rel="noopener noreferrer">
										<button className="btn">Download PDF <ArrowRight size={12} /></button>
									</a>
								) : (
									<Link href={reportsAccess.hasAccess ? `/reports/${featuredApi.slug ?? featuredApi.id}` : '/subscriptions'}>
										<button className="btn">
											{reportsAccess.hasAccess ? 'Open report' : (<><Lock size={12} /> Unlock</>)}
											<ArrowRight size={12} />
										</button>
									</Link>
								)}
								<Link href={`/reports/${featuredApi.slug ?? featuredApi.id}`}>
									<button className="btn ghost">Read summary</button>
								</Link>
							</div>
						</div>
					</div>

					<SectionHead title="All Reports" meta={`${total.toLocaleString()} published`} />

					<div className="rep-grid">
						{restApi.map((r, i) => (
							<Link
								key={r.id}
								href={`/reports/${r.slug ?? r.id}`}
								className="card rep-card"
								style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}
							>
								<div className="report-cover" style={{ background: coverColor(r, i + 1), height: 200, position: 'relative' }}>
									{r.is_published === false && (
										<span style={{
											position: 'absolute', top: 8, right: 8,
											padding: '3px 7px', background: '#fbbf24', color: '#7c2d12',
											fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', borderRadius: 2,
										}}>
											DRAFT
										</span>
									)}
									<span className="rc-meta">
										{splitYear(r.published_at, r.id)}{r.pages ? ` · ${r.pages}p` : ` · ${pickFallbackPages(r.id)}p`}
									</span>
									<span className="rc-title" style={{ fontSize: 16 }}>{r.short_title ?? r.title}</span>
								</div>
								<div style={{ padding: 'var(--space-3)' }}>
									<div
										style={{
											fontSize: 11,
											color: 'var(--fg-muted)',
											textTransform: 'uppercase',
											letterSpacing: '0.08em',
											marginBottom: 4,
										}}
									>
										{(r.report_type ?? 'Report')} · {splitYear(r.published_at, r.id)}
									</div>
									<div style={{ fontWeight: 600, marginBottom: 4 }}>{r.title}</div>
									<div
										style={{
											fontSize: 12,
											color: 'var(--fg-2)',
											marginBottom: 10,
											display: '-webkit-box',
											WebkitLineClamp: 2,
											WebkitBoxOrient: 'vertical',
											overflow: 'hidden',
										}}
									>
										{r.description ?? pickFallbackDesc(r.id)}
									</div>
									<button className="btn ghost" style={{ width: '100%', justifyContent: 'center' }}>
										View report
									</button>
								</div>
							</Link>
						))}
					</div>
				</>
			) : (
				<Empty msg="No reports published yet" />
			)}
		</Page>
	);
}

function MockFeaturedHero({
	r,
	hasAccess,
}: { r: typeof MOCK_REPORTS[number]; hasAccess: boolean }) {
	return (
		<div
			className="card"
			style={{
				marginBottom: 'var(--space-5)',
				overflow: 'hidden',
				display: 'grid',
				gridTemplateColumns: '380px 1fr',
			}}
		>
			<div className="report-cover" style={{ background: r.color, height: 320 }}>
				<span className="rc-meta">{r.year} · {r.pages}p</span>
				<span className="rc-title">{r.title}</span>
			</div>
			<div
				style={{
					padding: 'var(--space-5)',
					display: 'flex',
					flexDirection: 'column',
					justifyContent: 'center',
				}}
			>
				<Tag variant="pos">Just released</Tag>
				<h2
					style={{
						fontFamily: 'var(--font-display)',
						fontSize: 28,
						fontWeight: 800,
						letterSpacing: '-0.02em',
						lineHeight: 1.1,
						margin: '12px 0 8px',
					}}
				>
					{r.title}
				</h2>
				<p style={{ fontSize: 14, color: 'var(--fg-2)', lineHeight: 1.55, marginBottom: 16 }}>
					The definitive overview of the global sports tech ecosystem — capital flows, sub-sector innovation, regional analysis, and 184 pages of research.
				</p>
				<div style={{ display: 'flex', gap: 8 }}>
					<Link href={hasAccess ? '/reports' : '/subscriptions'}>
						<button className="btn">
							{hasAccess ? 'Download PDF' : (<><Lock size={12} /> Unlock</>)} <ArrowRight size={12} />
						</button>
					</Link>
					<button className="btn ghost">Read summary</button>
				</div>
			</div>
		</div>
	);
}

function MockReportCard({ r }: { r: typeof MOCK_REPORTS[number] }) {
	return (
		<div className="card rep-card">
			<div className="report-cover" style={{ background: r.color, height: 200 }}>
				<span className="rc-meta">{r.year} · {r.pages}p</span>
				<span className="rc-title" style={{ fontSize: 16 }}>{r.title}</span>
			</div>
			<div style={{ padding: 'var(--space-3)' }}>
				<div
					style={{
						fontSize: 11,
						color: 'var(--fg-muted)',
						textTransform: 'uppercase',
						letterSpacing: '0.08em',
						marginBottom: 4,
					}}
				>
					{r.kind} · {r.year}
				</div>
				<div style={{ fontWeight: 600, marginBottom: 4 }}>{r.title}</div>
				<div style={{ fontSize: 12, color: 'var(--fg-2)', marginBottom: 10 }}>{r.desc}</div>
				<button className="btn ghost" style={{ width: '100%', justifyContent: 'center' }}>
					View report
				</button>
			</div>
		</div>
	);
}

// PLACEHOLDER years used when a report record lacks `published_at`.
const FALLBACK_YEARS = ['2026', '2025', '2025', '2024', '2024', '2023'];
const FALLBACK_PAGES = [64, 78, 82, 96, 124, 184];
function pickFallbackPages(id?: string): number {
	const seed = id ? ((id.charCodeAt(0) ?? 0) + (id.charCodeAt(1) ?? 0)) : 0;
	return FALLBACK_PAGES[seed % FALLBACK_PAGES.length];
}

const FALLBACK_DESCS = [
	'Deep dive into investment activity, capital flow, and exit trends.',
	'Innovation & investment in this sports-tech vertical.',
	'Regional overview of the sports business and tech ecosystem.',
	'Audience growth, content trends, and platform consolidation.',
	'Capital deployment patterns across stages and sub-sectors.',
	'Top performers, breakout startups, and emerging categories.',
];
function pickFallbackDesc(id?: string): string {
	const seed = id ? ((id.charCodeAt(0) ?? 0) + (id.charCodeAt(1) ?? 0)) : 0;
	return FALLBACK_DESCS[seed % FALLBACK_DESCS.length];
}

function splitYear(iso: string | null | undefined, id?: string): string {
	if (iso) {
		const d = new Date(iso);
		if (!Number.isNaN(d.getTime())) return String(d.getUTCFullYear());
	}
	const seed = id ? ((id.charCodeAt(0) ?? 0) + (id.charCodeAt(1) ?? 0)) : 0;
	return FALLBACK_YEARS[seed % FALLBACK_YEARS.length];
}

function coverColor(r: Report, fallbackIdx: number): string {
	if (r.cover_url) return `url(${r.cover_url}) center / cover`;
	const hash = ((r.id?.charCodeAt(0) ?? 0) + (r.id?.charCodeAt(1) ?? 0) + fallbackIdx) % COVER_COLORS.length;
	return COVER_COLORS[hash];
}
