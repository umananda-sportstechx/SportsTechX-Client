'use client';

import { useMemo } from 'react';
import useSWR from 'swr';
import { ArrowRight } from 'lucide-react';
import { qk } from '@/lib/query-keys';
import { Page, Empty, SectionHead, PageTitle, Tag } from '@/components/ui/atoms';

/**
 * Newsletter — pixel-aligned to `ui_design_2/app/screens-3.jsx` NewsletterScreen.
 *
 * Layout:
 *   1. PageTitle: kicker, title, sub mentioning subscribers + latest issue #
 *   2. Latest issue hero — slate-gradient panel + 4-column stat strip
 *   3. "Past issues" list — bordered container, one `.news-row` per article
 *
 * Data source: `/api/newsletter/articles` (Beehiiv RSS proxy). The RSS feed
 * doesn't expose issue numbers or engagement stats — issue # is derived from
 * the sorted position (newest = highest), and subscriber/open-rate metrics
 * are hard-coded placeholders matching the design's static labels.
 */

interface NewsletterArticle {
	title: string;
	link: string;
	description: string;
	content: string;
	thumbnail: string;
	pubDate: string;
	author: string;
	categories: string[];
}

// Beehiiv publication facts — pulled from the public landing page. Update
// here when the SportsTechX page shows new numbers.
const NEWSLETTER_STATS = {
	subscribers: '18,432',
	openRate: '52.4%',
	issueLength: '~7 min',
};

export default function NewsletterPage() {
	const { data, isLoading, error } = useSWR<NewsletterArticle[]>(qk.newsletter.articles(), {
		dedupingInterval: 30 * 60_000,
		revalidateOnFocus: false,
	});

	const sorted = useMemo(() => {
		const arr = [...(data ?? [])];
		arr.sort((a, b) => {
			const da = new Date(a.pubDate).getTime() || 0;
			const db = new Date(b.pubDate).getTime() || 0;
			return db - da;
		});
		return arr;
	}, [data]);

	const latest = sorted[0] ?? null;
	const total = sorted.length;
	// Issue numbers: newest = total, oldest = 1.
	const numberFor = (idx: number) => total - idx;

	return (
		<Page>
			<PageTitle
				kicker="The Sports Tech Recap · weekly"
				title="Newsletter"
				sub={`Weekly intelligence read by ${NEWSLETTER_STATS.subscribers}+ operators, founders, and investors${
					latest ? ` · Issue #${numberFor(0)}` : ''
				}.`}
			/>

			{isLoading && sorted.length === 0 ? (
				<Empty msg="Loading…" />
			) : error || sorted.length === 0 ? (
				<Empty msg="No issues to display yet. Check back soon." />
			) : (
				<>
					{latest && <LatestHero article={latest} issueNum={numberFor(0)} />}

					<SectionHead title="Past issues" meta={`${total} ${total === 1 ? 'issue' : 'issues'} shown`} />

					<div
						style={{
							display: 'flex',
							flexDirection: 'column',
							gap: 0,
							border: '1px solid var(--border)',
							background: 'var(--bg-1)',
						}}
					>
						{sorted.map((article, i) => (
							<a
								key={article.link}
								href={article.link}
								target="_blank"
								rel="noopener noreferrer"
								className="news-row"
								style={{
									borderBottom: i < sorted.length - 1 ? '1px solid var(--border)' : 'none',
									textDecoration: 'none',
									color: 'inherit',
								}}
							>
								<div className="news-num">#{numberFor(i)}</div>
								<div style={{ flex: 1, minWidth: 0 }}>
									<div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
										{extractLeadingEmoji(article.title) && (
											<span style={{ fontSize: 18 }}>{extractLeadingEmoji(article.title)}</span>
										)}
										<span style={{ fontWeight: 600, fontSize: 15 }}>
											{stripLeadingEmoji(article.title)}
										</span>
										{i === 0 && <Tag variant="pos">Latest</Tag>}
									</div>
									{article.description && (
										<div
											style={{
												fontSize: 13,
												color: 'var(--fg-2)',
												display: '-webkit-box',
												WebkitLineClamp: 1,
												WebkitBoxOrient: 'vertical',
												overflow: 'hidden',
											}}
										>
											{stripHtml(article.description)}
										</div>
									)}
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
									{formatShortDate(article.pubDate)}
								</div>
								<button
									className="btn ghost"
									onClick={(e) => {
										// Container is already an <a>; the arrow is decorative.
										e.preventDefault();
										window.open(article.link, '_blank', 'noopener,noreferrer');
									}}
									aria-label="Open issue"
								>
									<ArrowRight size={12} />
								</button>
							</a>
						))}
					</div>
				</>
			)}
		</Page>
	);
}

function LatestHero({ article, issueNum }: { article: NewsletterArticle; issueNum: number }) {
	// Layer a slightly transparent slate gradient over the article thumbnail
	// so the cover shows through as a darker, grayed-out backdrop while keeping
	// the white headline + body legible.
	const heroBackground = article.thumbnail
		? `linear-gradient(135deg, rgba(44, 58, 74, 0.86) 0%, rgba(26, 33, 41, 0.92) 100%), url(${article.thumbnail}) center / cover`
		: 'linear-gradient(135deg, var(--slate-deep) 0%, #1A2129 100%)';

	return (
		<div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 'var(--space-5)' }}>
			{/* Slate-gradient panel — falls through to the article cover when present. */}
			<div
				style={{
					padding: 'var(--space-5)',
					background: heroBackground,
					color: '#fff',
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
						opacity: 0.7,
					}}
				>
					<span>Issue #{issueNum} · {formatLongDate(article.pubDate)}</span>
					<span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
						<span className="live-dot" /> Live
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
					{stripLeadingEmoji(article.title)}
				</h2>
				{article.description && (
					<p
						style={{
							fontSize: 16,
							opacity: 0.85,
							maxWidth: 700,
							lineHeight: 1.5,
							marginBottom: 18,
						}}
					>
						{stripHtml(article.description)}
					</p>
				)}
				<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
					<a href={article.link} target="_blank" rel="noopener noreferrer">
						<button className="btn">Read full issue <ArrowRight size={12} /></button>
					</a>
					<a
						href={`mailto:?subject=${encodeURIComponent(article.title)}&body=${encodeURIComponent(article.link)}`}
					>
						<button
							className="btn ghost"
							style={{ borderColor: 'rgba(255,255,255,.4)', color: '#fff' }}
						>
							Forward to a colleague
						</button>
					</a>
				</div>
			</div>

			{/* Stat strip */}
			<div
				style={{
					padding: 'var(--space-4) var(--space-5)',
					display: 'grid',
					gridTemplateColumns: 'repeat(4, 1fr)',
					gap: 24,
					borderTop: '1px solid var(--border)',
				}}
			>
				<StatCell label="Subscribers" value={NEWSLETTER_STATS.subscribers} />
				<StatCell label="Open rate" value={NEWSLETTER_STATS.openRate} />
				<StatCell label="Issue length" value={NEWSLETTER_STATS.issueLength} />
				<StatCell label="Sent" value={formatLongDate(article.pubDate)} />
			</div>
		</div>
	);
}

function StatCell({ label, value }: { label: string; value: string }) {
	return (
		<div>
			<div className="co-stat-label">{label}</div>
			<div className="co-stat-val">{value}</div>
		</div>
	);
}

// ─── Helpers ──────────────────────────────────────────────────────────────

/**
 * Extended Unicode pattern that catches emoji/extended pictographic characters
 * at the start of a string. Beehiiv editors often lead titles with one.
 */
const LEADING_EMOJI_RE = /^([\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}][\u{FE0F}\u{200D}\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}]*)\s+/u;

function extractLeadingEmoji(title: string): string | null {
	const m = title.match(LEADING_EMOJI_RE);
	return m ? m[1] : null;
}

function stripLeadingEmoji(title: string): string {
	return title.replace(LEADING_EMOJI_RE, '').trim() || title;
}

function stripHtml(html: string | null | undefined): string {
	if (!html) return '';
	return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

function formatShortDate(iso: string): string {
	if (!iso) return '';
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return '';
	return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
}

function formatLongDate(iso: string): string {
	if (!iso) return '';
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return '';
	return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
