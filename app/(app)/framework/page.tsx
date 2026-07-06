'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronRight } from 'lucide-react';
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
		{ title: 'Before / After Activity', desc: 'Booking & Discovery, Recovery & Injury Prevention, Coaching & Recruitment' },
	],
	fans: [
		{ title: 'Content Platforms', desc: 'News & Content, Streaming Platforms' },
		{ title: 'Fan Experiences', desc: 'Fan Engagement, Ticketing & Merchandise' },
		{ title: 'Fantasy Sports & Betting', desc: 'Fantasy Sports, Betting Enablement' },
	],
	executives: [
		{ title: 'Organisations & Venues', desc: 'Team & Club Management, League & Event Management, Stadium & Facility Management' },
		{ title: 'Media & Sponsors', desc: 'Media Production, Sponsorship' },
	],
	business: [
		{ title: 'Organisations & Venues', desc: 'Team & Club Management, League & Event Management, Stadium & Facility Management' },
		{ title: 'Media & Sponsors', desc: 'Media Production, Sponsorship' },
	],
};

/** Full framework taxonomy with per-level explanations, mirrored from the
 *  current hub's framework/methodology page. */
const FRAMEWORK_DETAIL: Array<{
	audience: Audience;
	n: number;
	title: string;
	intro: string;
	subs: Array<{ n: string; title: string; desc: string; leaves: Array<{ n: string; name: string; desc: string }> }>;
}> = [
	{
		audience: "athletes", n: 1, title: "For Athletes",
		intro: "This sector covers all solutions focused on the Athlete, whether professional, amateur or recreational. These are related to the actual sports activity, whether it's before, during or after it. Common goals are tracking performance, preventing injuries & finding sports to play.",
		subs: [
			{ n: "1.1", title: "For Activity – Hardware", desc: "Physical resources worn/used during an activity.", leaves: [
				{ n: "1.1.1", name: "Wearables", desc: "Attachments to the body of the athlete or the surface of playing equipment used." },
				{ n: "1.1.2", name: "Equipment & Infrastructure", desc: "Movable physical equipment or immovable resources installed on premises that are used to perform an activity." },
			] },
			{ n: "1.2", title: "For Activity — Software", desc: "Applications or platforms that support the athlete during the activity, often to improve performance, either through tracking the activity and providing feedback or by training guidance.", leaves: [
				{ n: "1.2.1", name: "Tracking & Analytics", desc: "Tools that capture and track key metrics of sports activities and provide insights." },
				{ n: "1.2.2", name: "Classes & Tutorials", desc: "Platforms that provide access to classes, videos and tutorial guides (both live and on-demand) to be active, learn new skills and help improve performance." },
			] },
			{ n: "1.3", title: "Before / After Activity", desc: "Hardware or Software solutions that help an athlete either prepare for an activity they are about to perform or recover after it.", leaves: [
				{ n: "1.3.1", name: "Booking & Discovery", desc: "Platforms to discover and book venues, find players or sports events locally or while traveling." },
				{ n: "1.3.2", name: "Recovery & Injury Prevention", desc: "Applications to reduce the likelihood of injury or help speed-up / ensure recovery." },
				{ n: "1.3.3", name: "Coaching & Recruitment", desc: "Tools to improve performance by providing training & guidance or helping connect with coaches and scouts." },
			] },
		],
	},
	{
		audience: "fans", n: 2, title: "For Fans",
		intro: "This sector is all about how sports connects to or is consumed by Fans and viewers. All of these solutions are focused on the fan and so will include content, merchandise or betting and fantasy sports. Goals typically include a better involvement and experience of fans related to the athletes, teams and sports they like.",
		subs: [
			{ n: "2.1", title: "Content Platforms", desc: "Platforms that provide access to various forms of content (both as consumers and creators), either video, audio or text based.", leaves: [
				{ n: "2.1.1", name: "News & Content", desc: "Original / editorial content, often about sports teams or athletes, or content related to live sports news & results." },
				{ n: "2.1.2", name: "Streaming Platforms", desc: "Sports streaming platforms, both live and on-demand." },
			] },
			{ n: "2.2", title: "Fan Experiences", desc: "Solutions and offerings to enhance the sports experience and to involve fans with their preferred sports, sometimes commercially.", leaves: [
				{ n: "2.2.1", name: "Fan Engagement", desc: "Helping fans connect with their favorite athletes, teams and sports as well as other fans to enhance their experience." },
				{ n: "2.2.2", name: "Ticketing & Merchandise", desc: "Platforms for fans to purchase, sell or trade tickets for events or merchandise & memorabilia from teams & athletes." },
			] },
			{ n: "2.3", title: "Fantasy Sports & Betting", desc: "Solutions to place real or play money on sports events and online games based on real or virtual teams.", leaves: [
				{ n: "2.3.1", name: "Fantasy Sports", desc: "Fantasy sports or sports prediction games." },
				{ n: "2.3.2", name: "Betting", desc: "Platforms to place sports bets." },
				{ n: "2.3.3", name: "Enablement", desc: "Tools to aid the sports betting industry, bettors or fantasy sports gamers." },
			] },
		],
	},
	{
		audience: "executives", n: 3, title: "For Executives",
		intro: "All solutions that help Sports Executives perform their responsibilities. Whether it's managing sports facilities, teams, associations, leagues, events, gyms or media companies. Goals here usually relate to improving operational efficiency or providing a better experience to the end consumer.",
		subs: [
			{ n: "3.1", title: "Organisations & Venues", desc: "Solutions to help sports related organisations or venues with managing internal operations.", leaves: [
				{ n: "3.1.1", name: "Team & Club Management", desc: "Tools for professional or amateur sports teams, clubs or gyms." },
				{ n: "3.1.2", name: "League & Event Management", desc: "Tools for organisers of leagues, tournaments, races or major events." },
				{ n: "3.1.3", name: "Stadium & Facility Management", desc: "Solutions for stadiums or sports facilities that help make operations or fan / client organisation easier." },
			] },
			{ n: "3.2", title: "Media & Sponsors", desc: "Solutions that are either for or connect with the media, or sponsoring brands.", leaves: [
				{ n: "3.2.1", name: "Media Production", desc: "Tools to make broadcasting easier and richer." },
				{ n: "3.2.2", name: "Sponsorship", desc: "Platforms to connect brands with teams and athletes for sponsorship." },
			] },
		],
	},
];
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

	const [expanded, setExpanded] = useState<Record<string, boolean>>({});

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
				// Auto-generated description = comma-joined leaf names. Falls
				// back to the API's own description field, then to the static
				// label by normalised name match (strips em-dashes/punctuation
				// so "For Activity Hardware" matches "For Activity — Hardware"),
				// then to empty.
				const leafNames = (child.children ?? []).map((g) => g.name).filter(Boolean);
				const childKey = normaliseTitle(child.name);
				const staticMatch = staticCells.find((c) => normaliseTitle(c.title) === childKey);
				const desc = leafNames.length > 0
					? leafNames.join(', ')
					: (child.description?.trim() || staticMatch?.desc || '');
				cells.push({
					key: child.id,
					title: prettyTitle(child.name),
					desc,
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
												{cell.desc && (
													<div style={{ fontSize: 12, color: 'var(--fg-2)', lineHeight: 1.45 }}>
														{cell.desc}
													</div>
												)}
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

						<div style={{ marginTop: 'var(--space-5)' }}>
					<SectionHead title="The framework explained" meta="Every sector, sub-sector and sub-sub-sector" />
					<p style={{ fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.55, margin: '10px 0 16px' }}>
						Solutions are divided into three audience-led sectors — Athlete, Fan and Sports Executive — each cascading into sub-sectors and sub-sub-sectors. Here is a detailed explanation of every level.
					</p>
					<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
						{FRAMEWORK_DETAIL.map((pillar) => {
							const color = PILLAR_COLORS[pillar.audience];
							const isOpen = expanded[pillar.audience] ?? false;
							return (
								<div key={pillar.audience} className="card" style={{ overflow: 'hidden', borderColor: color }}>
									<button
										onClick={() => setExpanded((prev) => ({ ...prev, [pillar.audience]: !isOpen }))}
										aria-expanded={isOpen}
										style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: 'var(--space-4)', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
									>
										<span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 800, fontSize: 17, color }}>
											<AudienceIcon audience={pillar.audience} size={16} />
											{pillar.n}. {pillar.title}
										</span>
										{isOpen ? <ChevronDown size={18} style={{ color }} /> : <ChevronRight size={18} style={{ color }} />}
									</button>
									{isOpen && (
										<div style={{ padding: '0 var(--space-4) var(--space-4)', borderTop: `1px solid ${color}` }}>
											<p style={{ fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.55, margin: '14px 0 18px' }}>{pillar.intro}</p>
											<div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
												{pillar.subs.map((sub) => (
													<div key={sub.n}>
														<div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{sub.n} {sub.title}</div>
														<div style={{ fontSize: 12.5, color: 'var(--fg-2)', lineHeight: 1.5, marginBottom: 10 }}>{sub.desc}</div>
														<div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingLeft: 14, borderLeft: `2px solid ${color}` }}>
															{sub.leaves.map((leaf) => (
																<div key={leaf.n} style={{ fontSize: 12.5, color: 'var(--fg-2)', lineHeight: 1.5 }}>
																	<strong style={{ color: 'var(--fg)' }}>{leaf.n} {leaf.name}:</strong> {leaf.desc}
																</div>
															))}
														</div>
													</div>
												))}
											</div>
										</div>
									)}
								</div>
							);
						})}
					</div>
				</div>
			</Page>
	);
}

/**
 * The DB seed has compact names like "For Activity Hardware"; the design
 * mockup formats them with an em-dash ("For Activity — Hardware") so the
 * "For Activity" prefix reads as a category. Targeted rewrite — anything
 * starting with "For Activity " (Hardware / Software) gets the em-dash,
 * everything else passes through unchanged.
 */
function prettyTitle(name: string): string {
	const m = name.match(/^For Activity\s+(.+)$/i);
	if (m) return `For Activity — ${m[1]}`;
	return name;
}

/**
 * Strip em-dashes, punctuation, and case so titles match regardless of
 * formatting variant ("For Activity — Hardware" === "For Activity Hardware").
 */
function normaliseTitle(s: string): string {
	return s.toLowerCase().replace(/[—–-]/g, ' ').replace(/\s+/g, ' ').trim();
}
