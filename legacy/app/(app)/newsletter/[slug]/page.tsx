'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import useSWR from 'swr';
import { ArrowLeft, ArrowRight, ExternalLink, Mail, Share2, User, Calendar, Clock } from 'lucide-react';
import { qk } from '@/lib/query-keys';
import { Page, Empty, Tag } from '@/components/ui/atoms';

interface NewsletterArticle {
	slug: string;
	title: string;
	link: string;
	description: string;
	content: string;
	thumbnail: string;
	pubDate: string;
	author: string;
	categories: string[];
}

/**
 * Newsletter detail page — renders one Beehiiv issue's full HTML content
 * inside the app. Reads `/api/newsletter/articles/:slug` (a thin lookup over
 * the cached RSS feed). Also fetches the full list to power "Next / Previous
 * issue" navigation at the bottom — same SWR key as `/newsletter` so there's
 * no second network round-trip.
 *
 * The HTML body comes from Beehiiv's `content:encoded`. We sanitize on the
 * client (strip <script> / inline event handlers + neutralise javascript:
 * URLs) before rendering, since the feed is trusted but the page is still
 * inside our auth surface.
 */
export default function NewsletterDetailPage() {
	const params = useParams<{ slug: string }>();
	const slug = params?.slug ?? '';
	const [shareToast, setShareToast] = useState<string | null>(null);

	const { data: article, isLoading, error } = useSWR<NewsletterArticle>(
		slug ? qk.newsletter.detail(slug) : null,
		{ dedupingInterval: 30 * 60_000 },
	);
	const { data: allArticles } = useSWR<NewsletterArticle[]>(qk.newsletter.articles(), {
		dedupingInterval: 30 * 60_000,
	});

	const sortedAll = useMemo(() => {
		const arr = [...(allArticles ?? [])];
		arr.sort((a, b) => (new Date(b.pubDate).getTime() || 0) - (new Date(a.pubDate).getTime() || 0));
		return arr;
	}, [allArticles]);

	const currentIdx = sortedAll.findIndex((a) => a.slug === slug);
	const newer = currentIdx > 0 ? sortedAll[currentIdx - 1] : null;
	const older = currentIdx >= 0 && currentIdx < sortedAll.length - 1 ? sortedAll[currentIdx + 1] : null;
	const issueNum = currentIdx >= 0 ? sortedAll.length - currentIdx : null;

	const sanitized = useMemo(() => sanitizeHtml(article?.content ?? ''), [article?.content]);
	const readMinutes = useMemo(
		() => estimateReadMinutes(article?.content ?? ''),
		[article?.content],
	);

	const onShare = async () => {
		if (!article) return;
		const url = window.location.href;
		try {
			if (navigator.share) {
				await navigator.share({ title: article.title, url });
				return;
			}
			await navigator.clipboard.writeText(url);
			setShareToast('Link copied');
			setTimeout(() => setShareToast(null), 1800);
		} catch {
			/* user dismissed share */
		}
	};

	if (isLoading && !article) {
		return (
			<Page>
				<Link href="/newsletter" className="co-back">
					<ArrowLeft size={12} /> Back to newsletter
				</Link>
				<Empty msg="Loading issue…" />
			</Page>
		);
	}

	if (error || !article) {
		return (
			<Page>
				<Link href="/newsletter" className="co-back">
					<ArrowLeft size={12} /> Back to newsletter
				</Link>
				<Empty msg="Issue not found" />
			</Page>
		);
	}

	const heroBackground = article.thumbnail
		? `linear-gradient(135deg, rgba(44, 58, 74, 0.86) 0%, rgba(26, 33, 41, 0.92) 100%), url(${article.thumbnail}) center / cover`
		: 'linear-gradient(135deg, var(--slate-deep) 0%, #1A2129 100%)';

	return (
		<Page>
			<Link href="/newsletter" className="co-back">
				<ArrowLeft size={12} /> Back to newsletter
			</Link>

			<article className="news-detail">
				<header
					className="news-detail-hero"
					style={{ background: heroBackground }}
				>
					<div className="news-detail-meta">
						<span>
							{issueNum != null ? `Issue #${issueNum} · ` : ''}
							{formatLongDate(article.pubDate)}
						</span>
						{currentIdx === 0 && <Tag variant="pos">Latest</Tag>}
					</div>
					<h1 className="news-detail-title">
						{stripLeadingEmoji(article.title)}
					</h1>
					{article.description && (
						<p className="news-detail-lead">{stripHtml(article.description)}</p>
					)}
					<div className="news-detail-byline">
						{article.author && (
							<span><User size={12} /> {article.author}</span>
						)}
						{article.pubDate && (
							<span><Calendar size={12} /> {formatLongDate(article.pubDate)}</span>
						)}
						{readMinutes > 0 && (
							<span><Clock size={12} /> {readMinutes} min read</span>
						)}
					</div>
					{article.categories.length > 0 && (
						<div className="news-detail-cats">
							{article.categories.slice(0, 5).map((c) => (
								<Tag key={c}>{c}</Tag>
							))}
						</div>
					)}
					<div className="news-detail-actions">
						<a href={article.link} target="_blank" rel="noopener noreferrer">
							<button className="btn">
								Open on Beehiiv <ExternalLink size={12} />
							</button>
						</a>
						<button
							className="btn ghost news-detail-btn-light"
							onClick={() => void onShare()}
						>
							<Share2 size={12} /> Share
						</button>
						<a
							href={`mailto:?subject=${encodeURIComponent(article.title)}&body=${encodeURIComponent(article.link)}`}
						>
							<button className="btn ghost news-detail-btn-light">
								<Mail size={12} /> Forward
							</button>
						</a>
					</div>
					{shareToast && <div className="news-detail-toast">{shareToast}</div>}
				</header>

				<div className="news-detail-body">
					<div
						className="news-prose"
						// Sanitized above — strips script/event handlers/javascript: URLs.
						// eslint-disable-next-line react/no-danger
						dangerouslySetInnerHTML={{ __html: sanitized }}
					/>
				</div>

				{(newer || older) && (
					<nav className="news-detail-nav">
						{newer ? (
							<Link
								href={`/newsletter/${newer.slug}`}
								className="news-detail-nav-item news-detail-nav-prev"
							>
								<div className="news-detail-nav-label">← Newer issue</div>
								<div className="news-detail-nav-title">{stripLeadingEmoji(newer.title)}</div>
							</Link>
						) : <div />}
						{older ? (
							<Link
								href={`/newsletter/${older.slug}`}
								className="news-detail-nav-item news-detail-nav-next"
							>
								<div className="news-detail-nav-label">Older issue →</div>
								<div className="news-detail-nav-title">{stripLeadingEmoji(older.title)}</div>
							</Link>
						) : <div />}
					</nav>
				)}

				<div className="news-detail-foot">
					<Link href="/newsletter" className="btn ghost">
						<ArrowLeft size={12} /> All issues
					</Link>
					<a href={article.link} target="_blank" rel="noopener noreferrer">
						<button className="btn">
							Read on Beehiiv <ArrowRight size={12} />
						</button>
					</a>
				</div>
			</article>
		</Page>
	);
}

// ─── Helpers ──────────────────────────────────────────────────────────────

/** Strip <script> blocks, inline event handlers, and javascript: URLs.
 *  Beehiiv's HTML is trusted but we render it inside our auth surface, so a
 *  minimal scrub keeps us out of trouble if a future feed leaks something. */
function sanitizeHtml(html: string): string {
	let out = html;
	out = out.replace(/<script[\s\S]*?<\/script>/gi, '');
	out = out.replace(/<style[\s\S]*?<\/style>/gi, '');
	// Remove on* event handlers — both quoted and unquoted variants.
	out = out.replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, '');
	out = out.replace(/\son[a-z]+\s*=\s*'[^']*'/gi, '');
	out = out.replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, '');
	// Neutralise javascript: URLs.
	out = out.replace(/(href|src)\s*=\s*"javascript:[^"]*"/gi, '$1="#"');
	out = out.replace(/(href|src)\s*=\s*'javascript:[^']*'/gi, "$1='#'");
	return out;
}

function estimateReadMinutes(html: string): number {
	if (!html) return 0;
	const text = stripHtml(html);
	const words = text.split(/\s+/).filter(Boolean).length;
	return Math.max(1, Math.round(words / 220));
}

const LEADING_EMOJI_RE = /^([\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}][\u{FE0F}\u{200D}\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}]*)\s+/u;
function stripLeadingEmoji(title: string): string {
	return title.replace(LEADING_EMOJI_RE, '').trim() || title;
}

function stripHtml(html: string | null | undefined): string {
	if (!html) return '';
	return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

function formatLongDate(iso: string): string {
	if (!iso) return '';
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return '';
	return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
