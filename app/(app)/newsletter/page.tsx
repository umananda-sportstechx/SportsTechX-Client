'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Page, Tag, SectionHead } from '@/components/ui/atoms';

/**
 * Newsletter — pixel-perfect port of ui_design/screens-3.jsx NewsletterScreen.
 *
 * No /api/newsletters endpoint exists yet, so the hero issue + past-issue list
 * render from `MOCK_NEWSLETTERS` (verbatim from STX_DATA.NEWSLETTERS). Swap
 * each constant for a real query once the endpoint ships.
 */

// PLACEHOLDER — STX_DATA.NEWSLETTERS verbatim.
const MOCK_NEWSLETTERS: Array<{
	num: number; title: string; sub: string; date: string; emoji: string; latest?: boolean;
}> = [
	{ num: 179, title: 'KKR Closes Arctos Deal, Invests in MLS NEXT Pro',  sub: 'Plus how athlete pay structures determine power balance in sport.', date: 'May 8, 2026',  emoji: '🤝', latest: true },
	{ num: 178, title: 'Another Week, Another Two Mega Deals',             sub: 'Funding & M&A roundup — April 2026.',                                date: 'Apr 30, 2026', emoji: '💰' },
	{ num: 177, title: "Catterton's $500M Athlete Sports Tech Fund",       sub: 'European deal flow at multi-year highs.',                            date: 'Apr 23, 2026', emoji: '🇪🇺' },
	{ num: 176, title: "TPG Sports' $2B Bet on the Industry",              sub: 'PEAK 2026 Las Vegas preview.',                                       date: 'Apr 16, 2026', emoji: '🎰' },
	{ num: 175, title: 'The State of Athlete Wearables',                   sub: 'Heart rate, fatigue, and the new frontier.',                         date: 'Apr 9, 2026',  emoji: '⌚' },
	{ num: 174, title: 'Football Clubs Going Public — Why Now',            sub: 'Why this wave of IPOs is different.',                                date: 'Apr 2, 2026',  emoji: '⚽' },
];

const HERO_FOOTER_STATS = [
	{ label: 'Subscribers',   value: '18,432' },
	{ label: 'Open rate',     value: '52.4%' },
	{ label: 'Issue length',  value: '~7 min' },
	{ label: 'Sent',          value: MOCK_NEWSLETTERS[0].date },
];

export default function NewsletterPage() {
	const latest = MOCK_NEWSLETTERS[0];
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
					The Sports Tech Recap · weekly
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
					Newsletter
				</h1>
				<p style={{ fontSize: 14, color: 'var(--fg-2)', maxWidth: 720, margin: 0 }}>
					Weekly intelligence read by 18,400+ operators, founders, and investors. Issue #424.
				</p>
			</div>

			{/* Latest issue hero */}
			<div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 'var(--space-5)' }}>
				<div
					style={{
						padding: 'var(--space-5)',
						background: 'var(--accent)',
						color: 'var(--accent-fg)',
						position: 'relative',
					}}
				>
					<div
						style={{
							display: 'flex',
							justifyContent: 'space-between',
							alignItems: 'center',
							marginBottom: 16,
							fontFamily: 'var(--font-mono)',
							fontSize: 11,
							textTransform: 'uppercase',
							letterSpacing: '0.12em',
							opacity: 0.85,
						}}
					>
						<span>Issue #{latest.num} · {latest.date}</span>
						<span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
							<span className="live-dot" style={{ background: 'currentColor' }} /> Live
						</span>
					</div>
					<h2
						style={{
							fontFamily: 'var(--font-display)',
							fontSize: 36,
							fontWeight: 800,
							letterSpacing: '-0.02em',
							lineHeight: 1.1,
							marginBottom: 12,
							maxWidth: 800,
						}}
					>
						{latest.title}
					</h2>
					<p
						style={{
							fontSize: 16,
							opacity: 0.92,
							maxWidth: 700,
							lineHeight: 1.5,
							marginBottom: 18,
						}}
					>
						{latest.sub}
					</p>
					<div style={{ display: 'flex', gap: 8 }}>
						<button className="btn" style={{ background: '#fff', color: 'var(--accent)' }}>
							Read full issue <ArrowRight size={12} />
						</button>
						<button className="btn ghost" style={{ borderColor: 'rgba(255,255,255,.4)', color: '#fff' }}>
							Forward to a colleague
						</button>
					</div>
				</div>
				<div
					style={{
						padding: 'var(--space-4) var(--space-5)',
						display: 'grid',
						gridTemplateColumns: 'repeat(4, 1fr)',
						gap: 24,
						borderTop: '1px solid var(--border)',
					}}
				>
					{HERO_FOOTER_STATS.map((s) => (
						<div key={s.label}>
							<div className="co-stat-label">{s.label}</div>
							<div className="co-stat-val">{s.value}</div>
						</div>
					))}
				</div>
			</div>

			<SectionHead title="Past issues" meta={`${MOCK_NEWSLETTERS.length} of 424 shown`} />

			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
					gap: 0,
					border: '1px solid var(--border)',
					background: 'var(--bg-1)',
				}}
			>
				{MOCK_NEWSLETTERS.map((issue, i) => (
					<div
						key={issue.num}
						className="news-row"
						style={{
							borderBottom: i < MOCK_NEWSLETTERS.length - 1 ? '1px solid var(--border)' : 'none',
						}}
					>
						<div className="news-num">#{issue.num}</div>
						<div style={{ flex: 1, minWidth: 0 }}>
							<div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
								<span style={{ fontSize: 18 }}>{issue.emoji}</span>
								<span style={{ fontWeight: 600, fontSize: 15 }}>{issue.title}</span>
								{issue.latest && <Tag variant="pos">Latest</Tag>}
							</div>
							<div style={{ fontSize: 13, color: 'var(--fg-2)' }}>{issue.sub}</div>
						</div>
						<div
							style={{
								fontFamily: 'var(--font-mono)',
								fontSize: 11,
								color: 'var(--fg-muted)',
								textTransform: 'uppercase',
								letterSpacing: '0.08em',
								whiteSpace: 'nowrap',
							}}
						>
							{issue.date}
						</div>
						<Link href={`/newsletter/${issue.num}`}>
							<button className="btn ghost"><ArrowRight size={12} /></button>
						</Link>
					</div>
				))}
			</div>
		</Page>
	);
}
