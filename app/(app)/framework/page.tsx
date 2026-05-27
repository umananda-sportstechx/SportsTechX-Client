'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { Page, SectionHead, Empty, AudienceIcon, type Audience } from '@/components/ui/atoms';

interface SectorNode {
	id: string;
	name: string;
	slug: string;
	description?: string | null;
	parent_id?: string | null;
	children?: SectorNode[];
	company_count?: number | null;
}

const PILLAR_COLORS: Record<Audience, string> = {
	athletes: 'oklch(58% 0.22 290)',
	fans: 'oklch(58% 0.22 240)',
	executives: 'oklch(58% 0.22 160)',
	business: 'oklch(58% 0.22 160)',
};

const PILLAR_NAMES: Record<Audience, string> = {
	athletes: 'Athletes',
	fans: 'Fans',
	executives: 'Executives',
	business: 'Executives',
};

const PILLAR_SUBS: Record<Audience, string> = {
	athletes: 'Tech that helps athletes train, compete, and recover.',
	fans: 'Tech that connects fans to sport — content, experiences, fantasy.',
	executives: 'Tech that powers leagues, clubs, venues, and rights-holders.',
	business: 'Tech that powers leagues, clubs, venues, and rights-holders.',
};

interface StaticCell { title: string; desc: string }

const PILLAR_ORDER: Audience[] = ['athletes', 'fans', 'executives'];

/**
 * Map the actual top-level sector slugs in the DB to the design's audience
 * taxonomy. The seed data uses `activity_performance` / `fans_content` /
 * `management_organisation` for the three pillars — those are the rows with
 * real subtree counts. Older `for_*` rows are near-empty duplicates that we
 * deliberately ignore.
 */
const PILLAR_SLUG_ALIASES: Record<Audience, string[]> = {
	athletes: ['activity_performance', 'for_athletes', 'athletes'],
	fans: ['fans_content', 'for_fans', 'fans'],
	executives: ['management_organisation', 'for_executives', 'executives'],
	business: ['management_organisation', 'for_executives', 'executives'],
};

/**
 * Static fallback labels mirrored from ui_design_2/app/data.jsx lines 220-236.
 * Used only when the API doesn't return per-audience sector hierarchy yet.
 * Counts come from `/api/sectors?tree=true` when present; '—' otherwise.
 */
const STATIC_CELLS: Record<Audience, StaticCell[]> = {
	athletes: [
		{ title: 'For Activity — Hardware', desc: 'Wearables, Equipment & Infrastructure' },
		{ title: 'For Activity — Software', desc: 'Tracking & Analytics, Classes & Tutorials' },
		{ title: 'Before / After Activity', desc: 'Booking & Discovery, Recovery, Coaching' },
	],
	fans: [
		{ title: 'Content Platforms', desc: 'News & Content, Streaming Platforms' },
		{ title: 'Fan Experiences', desc: 'Fan Engagement, Ticketing & Merchandise' },
		{ title: 'Fantasy & Betting', desc: 'Fantasy Sports, Betting Enablement' },
	],
	executives: [
		{ title: 'Organisations & Venues', desc: 'Team & Club, League & Event, Stadium' },
		{ title: 'Media & Sponsors', desc: 'Media Production, Sponsorship' },
		{ title: 'Business Tools', desc: 'Marketing, Operations, Compliance' },
	],
	business: [
		{ title: 'Organisations & Venues', desc: 'Team & Club, League & Event, Stadium' },
		{ title: 'Media & Sponsors', desc: 'Media Production, Sponsorship' },
		{ title: 'Business Tools', desc: 'Marketing, Operations, Compliance' },
	],
};

interface PillarColumn {
	audience: Audience;
	apiNode: SectorNode | null;
	cells: Array<{ key: string; title: string; desc: string; count: number | null; slug: string | null }>;
}

export default function FrameworkPage() {
	const { data, isLoading } = useSWR<SectorNode[]>(
		['/api/sectors', { tree: true }],
		{ dedupingInterval: 60 * 60_000 },
	);

	const columns = useMemo<PillarColumn[]>(() => {
		// Build slug → node lookup once.
		const bySlug = new Map<string, SectorNode>();
		for (const node of data ?? []) {
			bySlug.set(node.slug.toLowerCase(), node);
		}

		return PILLAR_ORDER.map((audience) => {
			// Resolve the actual pillar node via the alias map — picks the first
			// alias that exists in the API response.
			let apiNode: SectorNode | null = null;
			for (const slug of PILLAR_SLUG_ALIASES[audience]) {
				const hit = bySlug.get(slug);
				if (hit) { apiNode = hit; break; }
			}

			const apiChildren = apiNode?.children ?? [];
			const staticCells = STATIC_CELLS[audience];

			// Prefer API children when present (any number). For missing rows,
			// pad from static labels so the column always has 3 cells.
			const cells: PillarColumn['cells'] = [];
			for (const child of apiChildren.slice(0, 3)) {
				cells.push({
					key: child.id,
					title: child.name,
					desc: child.description ?? '',
					count: child.company_count ?? 0,
					slug: child.slug,
				});
			}
			while (cells.length < 3 && cells.length < staticCells.length) {
				const cell = staticCells[cells.length];
				const fallbackSlug = cell.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
				cells.push({
					key: `${audience}-${cells.length}`,
					title: cell.title,
					desc: cell.desc,
					count: null,
					slug: fallbackSlug,
				});
			}

			return { audience, apiNode, cells };
		});
	}, [data]);

	const showLoading = isLoading && !data;

	return (
		<Page>
			<div style={{ marginBottom: 'var(--space-5)' }}>
				<h1
					style={{
						fontFamily: 'var(--font-display)',
						fontSize: 38,
						fontWeight: 800,
						letterSpacing: '-0.02em',
						lineHeight: 1,
						margin: '0 0 10px',
					}}
				>
					The Sports Tech Framework
				</h1>
				<p style={{ fontSize: 14, color: 'var(--fg-2)', lineHeight: 1.55, margin: 0 }}>
					Introduced in 2017 and continuously refined — a shared structure for identifying, comparing and assessing
					every corner of sports tech at a global level. Three audience-led groups{' '}
					(<strong>Athlete · Fan · Sports Executive</strong>) cascade into sub-sectors and sub-sub-sectors that form
					the backbone of every report and dataset we publish.
				</p>
			</div>

			{showLoading ? (
				<Empty msg="Loading framework…" />
			) : (
				<div className="fw-grid">
					{columns.map((col) => {
						const color = PILLAR_COLORS[col.audience];
						const title = PILLAR_NAMES[col.audience];
						const sub = PILLAR_SUBS[col.audience];
						return (
							<div key={col.audience} className="fw-col">
								<div className="fw-col-head" style={{ background: color }}>
									<div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
										<AudienceIcon audience={col.audience} size={14} style={{ opacity: 0.9 }} />
										<div
											style={{
												fontFamily: 'var(--font-mono)',
												fontSize: 10,
												textTransform: 'uppercase',
												letterSpacing: '0.12em',
												opacity: 0.85,
											}}
										>
											FOR
										</div>
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
										{title}
									</h2>
									<div style={{ fontSize: 12, opacity: 0.9, lineHeight: 1.4 }}>{sub}</div>
								</div>
								<div style={{ display: 'flex', flexDirection: 'column' }}>
									{col.cells.map((cell) => {
										const inner = (
											<>
												<div
													style={{
														display: 'flex',
														justifyContent: 'space-between',
														alignItems: 'flex-start',
														marginBottom: 6,
													}}
												>
													<div style={{ fontWeight: 700, fontSize: 14 }}>{cell.title}</div>
													{cell.count != null && (
														<div
															style={{
																fontFamily: 'var(--font-mono)',
																fontSize: 12,
																fontWeight: 700,
																color,
															}}
														>
															{cell.count.toLocaleString()}
														</div>
													)}
												</div>
												<div style={{ fontSize: 12, color: 'var(--fg-2)', lineHeight: 1.45 }}>
													{cell.desc || '—'}
												</div>
											</>
										);
										return cell.slug ? (
											<Link
												key={cell.key}
												href={`/companies?sector=${cell.slug}`}
												className="fw-cell"
												style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
											>
												{inner}
											</Link>
										) : (
											<div key={cell.key} className="fw-cell">{inner}</div>
										);
									})}
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
						{ n: '01', title: 'FOR', desc: 'Every company is mapped to one of three audience groups: For Athletes, For Fans, or For Executives.' },
						{ n: '02', title: 'Vertical', desc: 'Within each FOR group, companies are mapped into 3 verticals (e.g. For Activity, Content Platforms…).' },
						{ n: '03', title: 'Sub-sector', desc: 'Each vertical contains specialised sub-sectors (e.g. Wearables, Streaming, Stadium Tech…).' },
					].map((s) => (
						<div key={s.n}>
							<div
								style={{
									fontFamily: 'var(--font-mono)',
									fontSize: 11,
									color: 'var(--fg-muted)',
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
