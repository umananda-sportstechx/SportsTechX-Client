'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { ArrowRight, Search } from 'lucide-react';
import { qk } from '@/lib/query-keys';
import { Page, Empty, SectionHead, PageTitle } from '@/components/ui/atoms';

/**
 * Newsletter — proxy of the Beehiiv RSS feed. Same data shape and behavior
 * as legacy STX-WebApp: a hero card for the latest issue + an archive grid
 * for the rest. Search is client-side (article titles + descriptions). No
 * signup form, no DB; Beehiiv owns authoring.
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

export default function NewsletterPage() {
	const { data, isLoading, error } = useSWR<NewsletterArticle[]>(qk.newsletter.articles(), {
		dedupingInterval: 30 * 60_000,
		revalidateOnFocus: false,
	});
	const [search, setSearch] = useState('');

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
	const archive = sorted.slice(1);

	const filteredArchive = useMemo(() => {
		if (!search.trim()) return archive;
		const q = search.toLowerCase();
		return archive.filter((a) =>
			a.title.toLowerCase().includes(q) || a.description.toLowerCase().includes(q),
		);
	}, [archive, search]);

	return (
		<Page>
			<PageTitle
				kicker="Newsletter · Featured by SportsTechX"
				title="The Sports Tech Recap"
				sub="Weekly digest of the deals, M&A, and ecosystem signals shaping sports technology."
			/>

			{isLoading && sorted.length === 0 ? (
				<Empty msg="Loading…" />
			) : error || sorted.length === 0 ? (
				<Empty msg="No issues to display yet. Check back soon." />
			) : (
				<>
					{latest && <HeroIssue article={latest} />}

					{archive.length > 0 && (
						<>
							<div
								style={{
									display: 'flex',
									alignItems: 'flex-end',
									justifyContent: 'space-between',
									gap: 16,
									margin: 'var(--space-5) 0 var(--space-3)',
								}}
							>
								<SectionHead title="Archive" meta={`${archive.length} past ${archive.length === 1 ? 'issue' : 'issues'}`} />
								<div style={{ position: 'relative', minWidth: 280 }}>
									<Search
										size={14}
										style={{ position: 'absolute', left: 10, top: 9, color: 'var(--fg-muted)', pointerEvents: 'none' }}
									/>
									<input
										className="search-input"
										style={{ paddingLeft: 32, height: 32, width: '100%' }}
										placeholder="Search archive…"
										value={search}
										onChange={(e) => setSearch(e.target.value)}
									/>
								</div>
							</div>
							<div className="grid-3">
								{filteredArchive.map((a) => <ArticleCard key={a.link} article={a} />)}
							</div>
							{filteredArchive.length === 0 && (
								<Empty msg={`No archived issues match "${search}".`} />
							)}
						</>
					)}
				</>
			)}
		</Page>
	);
}

function HeroIssue({ article }: { article: NewsletterArticle }) {
	return (
		<a
			href={article.link}
			target="_blank"
			rel="noopener noreferrer"
			className="card"
			style={{
				display: 'grid',
				gridTemplateColumns: article.thumbnail ? '420px 1fr' : '1fr',
				gap: 0,
				textDecoration: 'none',
				color: 'inherit',
				overflow: 'hidden',
			}}
		>
			{article.thumbnail && (
				/* eslint-disable-next-line @next/next/no-img-element */
				<img
					src={article.thumbnail}
					alt=""
					style={{ width: '100%', height: '100%', minHeight: 240, objectFit: 'cover' }}
				/>
			)}
			<div style={{ padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
				<div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
					<span style={{
						fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--accent)',
						textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700,
					}}>
						Latest issue
					</span>
					<span style={{ fontSize: 11, color: 'var(--fg-muted)' }}>· {formatDate(article.pubDate)}</span>
				</div>
				<h2
					style={{
						fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800,
						letterSpacing: '-0.02em', lineHeight: 1.15, margin: '0 0 12px',
					}}
				>
					{article.title}
				</h2>
				{article.description && (
					<p style={{ fontSize: 14, color: 'var(--fg-2)', lineHeight: 1.55, margin: '0 0 16px' }}>
						{article.description}…
					</p>
				)}
				<div>
					<button className="btn">Read issue <ArrowRight size={12} /></button>
				</div>
			</div>
		</a>
	);
}

function ArticleCard({ article }: { article: NewsletterArticle }) {
	return (
		<a
			href={article.link}
			target="_blank"
			rel="noopener noreferrer"
			className="card"
			style={{ display: 'block', textDecoration: 'none', color: 'inherit', overflow: 'hidden' }}
		>
			{article.thumbnail && (
				/* eslint-disable-next-line @next/next/no-img-element */
				<img
					src={article.thumbnail}
					alt=""
					style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block' }}
				/>
			)}
			<div style={{ padding: 'var(--space-3)' }}>
				<div style={{ fontSize: 11, color: 'var(--fg-muted)', marginBottom: 6 }}>
					{formatMonthYear(article.pubDate)}
				</div>
				<div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6, lineHeight: 1.35 }}>
					{article.title}
				</div>
				{article.description && (
					<p
						style={{
							fontSize: 12, color: 'var(--fg-2)', lineHeight: 1.5, margin: 0,
							display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
						}}
					>
						{article.description}…
					</p>
				)}
			</div>
		</a>
	);
}

function formatDate(iso: string): string {
	if (!iso) return '';
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return '';
	return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatMonthYear(iso: string): string {
	if (!iso) return '';
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return '';
	return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}
