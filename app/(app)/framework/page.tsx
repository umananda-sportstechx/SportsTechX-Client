'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useQuery } from '@/lib/query-client';
import { Page, SectionHead, Empty } from '@/components/ui/atoms';

interface SectorNode {
	id: string;
	name: string;
	slug: string;
	description?: string | null;
	parent_id?: string | null;
	children?: SectorNode[];
	company_count?: number | null;
}

// PLACEHOLDER — STX_DATA.FRAMEWORK verbatim, displayed when the sector tree
// doesn't have the canonical Athletes/Fans/Executives shape.
const MOCK_FRAMEWORK: SectorNode[] = [
	{
		id: 'mf-athletes', name: 'Athletes', slug: 'athletes', description: 'Tech that helps athletes train, compete, and recover.',
		children: [
			{ id: 'mf-a-1', slug: 'for-activity-hardware',  name: 'For Activity — Hardware', description: 'Wearables, Equipment & Infrastructure',     company_count: 142 },
			{ id: 'mf-a-2', slug: 'for-activity-software',  name: 'For Activity — Software', description: 'Tracking & Analytics, Classes & Tutorials', company_count: 218 },
			{ id: 'mf-a-3', slug: 'before-after-activity',  name: 'Before / After Activity', description: 'Booking & Discovery, Recovery, Coaching',   company_count: 96 },
		],
	},
	{
		id: 'mf-fans', name: 'Fans', slug: 'fans', description: 'Tech that connects fans to sport — content, experiences, fantasy.',
		children: [
			{ id: 'mf-f-1', slug: 'content-platforms', name: 'Content Platforms', description: 'News & Content, Streaming Platforms',      company_count: 184 },
			{ id: 'mf-f-2', slug: 'fan-experiences',   name: 'Fan Experiences',   description: 'Fan Engagement, Ticketing & Merchandise',  company_count: 226 },
			{ id: 'mf-f-3', slug: 'fantasy-betting',   name: 'Fantasy & Betting', description: 'Fantasy Sports, Betting Enablement',       company_count: 78 },
		],
	},
	{
		id: 'mf-executives', name: 'Executives', slug: 'executives', description: 'Tech that powers leagues, clubs, venues, and rights-holders.',
		children: [
			{ id: 'mf-e-1', slug: 'organisations-venues', name: 'Organisations & Venues', description: 'Team & Club, League & Event, Stadium', company_count: 312 },
			{ id: 'mf-e-2', slug: 'media-sponsors',       name: 'Media & Sponsors',       description: 'Media Production, Sponsorship',        company_count: 142 },
			{ id: 'mf-e-3', slug: 'business-tools',       name: 'Business Tools',         description: 'Marketing, Operations, Compliance',    company_count: 84 },
		],
	},
];

const PILLAR_COLORS: Record<string, string> = {
	athletes: 'oklch(62% 0.18 290)',
	fans: 'oklch(62% 0.20 240)',
	executives: 'oklch(62% 0.16 160)',
	business: 'oklch(62% 0.16 160)',
};

const PILLAR_SUBS: Record<string, string> = {
	athletes: 'Tech that helps athletes train, compete, and recover.',
	fans: 'Tech that connects fans to sport — content, experiences, fantasy.',
	executives: 'Tech that powers leagues, clubs, venues, and rights-holders.',
	business: 'Tech that powers leagues, clubs, venues, and rights-holders.',
};

export default function FrameworkPage() {
	const { data, isLoading } = useQuery<SectorNode[]>({
		queryKey: ['/api/sectors', { tree: true }],
		staleTime: 60 * 60_000,
	});

	const pillars = useMemo(() => {
		const tree = data ?? [];
		const usable = tree.filter((p) => (p.children ?? []).length > 0);
		const matchesCanonical = usable.length >= 3 && usable.some((p) =>
			['athletes', 'fans', 'executives'].includes(p.slug.toLowerCase()),
		);
		if (matchesCanonical) return normalizePillars(usable);
		return MOCK_FRAMEWORK;
	}, [data]);

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
					Taxonomy · the SportsTechX framework
				</div>
				<h1
					style={{
						fontFamily: 'var(--font-display)',
						fontSize: 38,
						fontWeight: 800,
						letterSpacing: '-0.02em',
						lineHeight: 1,
						margin: '0 0 6px',
					}}
				>
					The Sports Tech Framework
				</h1>
				<p style={{ fontSize: 14, color: 'var(--fg-2)', maxWidth: 720, margin: 0 }}>
					A three-pillar taxonomy mapping the entire sports tech industry — from athletes, to fans, to executives. Used as the structural backbone of our reports and database.
				</p>
			</div>

			{isLoading && pillars.length === 0 ? (
				<Empty msg="Loading framework…" />
			) : (
				<div className="fw-grid">
					{pillars.map((col) => {
						const slug = col.slug.toLowerCase();
						const color = PILLAR_COLORS[slug] ?? 'var(--accent)';
						const sub = PILLAR_SUBS[slug] ?? col.description ?? '';
						return (
							<div key={col.id} className="fw-col">
								<div className="fw-col-head" style={{ background: color }}>
									<div
										style={{
											fontFamily: 'var(--font-mono)',
											fontSize: 10,
											textTransform: 'uppercase',
											letterSpacing: '0.12em',
											opacity: 0.85,
											marginBottom: 4,
										}}
									>
										Pillar
									</div>
									<h2
										style={{
											fontFamily: 'var(--font-display)',
											fontSize: 28,
											fontWeight: 800,
											letterSpacing: '-0.02em',
											lineHeight: 1,
											marginBottom: 6,
										}}
									>
										{col.name}
									</h2>
									<div style={{ fontSize: 12, opacity: 0.9, lineHeight: 1.4 }}>{sub}</div>
								</div>
								<div style={{ display: 'flex', flexDirection: 'column' }}>
									{(col.children ?? []).map((cell) => (
										<Link
											key={cell.id}
											href={`/companies?sector=${cell.slug}`}
											className="fw-cell"
											style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
										>
											<div
												style={{
													display: 'flex',
													justifyContent: 'space-between',
													alignItems: 'flex-start',
													marginBottom: 6,
												}}
											>
												<div style={{ fontWeight: 700, fontSize: 14 }}>{cell.name}</div>
												{cell.company_count != null && (
													<div
														style={{
															fontFamily: 'var(--font-mono)',
															fontSize: 12,
															fontWeight: 700,
															color,
														}}
													>
														{cell.company_count}
													</div>
												)}
											</div>
											<div style={{ fontSize: 12, color: 'var(--fg-2)', lineHeight: 1.45 }}>
												{cell.description ?? '—'}
											</div>
										</Link>
									))}
								</div>
							</div>
						);
					})}
				</div>
			)}

			<div className="card" style={{ marginTop: 'var(--space-5)', padding: 'var(--space-5)' }}>
				<SectionHead title="How the framework works" meta="Read the methodology" />
				<div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 32, marginTop: 16 }}>
					{[
						{ n: '01', title: 'Pillar', desc: 'Every company is mapped to one of three audience pillars: Athletes, Fans, or Executives.' },
						{ n: '02', title: 'Vertical', desc: 'Within each pillar, companies are mapped into verticals (e.g. For Activity, Content Platforms…).' },
						{ n: '03', title: 'Sub-sector', desc: 'Each vertical contains specialised sub-sectors (e.g. Wearables, Streaming, Stadium Tech…).' },
					].map((s) => (
						<div key={s.n}>
							<div
								style={{
									fontFamily: 'var(--font-mono)',
									fontSize: 11,
									color: 'var(--accent)',
									marginBottom: 6,
									fontWeight: 700,
									letterSpacing: '0.08em',
								}}
							>
								STEP {s.n}
							</div>
							<div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>{s.title}</div>
							<div style={{ fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.5 }}>{s.desc}</div>
						</div>
					))}
				</div>
			</div>
		</Page>
	);
}

function normalizePillars(tree: SectorNode[]): SectorNode[] {
	const priorityOrder = ['athletes', 'fans', 'executives', 'business'];
	const sorted = [...tree].sort((a, b) => {
		const ai = priorityOrder.indexOf(a.slug.toLowerCase());
		const bi = priorityOrder.indexOf(b.slug.toLowerCase());
		const aRank = ai === -1 ? Number.MAX_SAFE_INTEGER : ai;
		const bRank = bi === -1 ? Number.MAX_SAFE_INTEGER : bi;
		return aRank - bRank;
	});
	return sorted.slice(0, 3);
}
