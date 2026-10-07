'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Newspaper, Files, CalendarDays, UserRound, SlidersHorizontal } from 'lucide-react';
import { AgentComposer, FeedCard, H1, PlaceholderTag, SectionHead } from '@/components/atlas';
import useSWR from 'swr';
import { useUserProfile } from '@/hooks/use-user-profile';
import { qk } from '@/lib/query-keys';
import type { NewsletterArticle, Page, ReportListItem } from '@/types/api';
import { useInterests } from './interests';
import { hrefOf } from '@/lib/routes';

/**
 * Explore Home (Claude Design "Home"): greeting, interests count, a search bar
 * (searches the live company database) and "What needs your attention". The
 * roundup, newsletter and report cards are live; "For you" (interests) is
 * Backend Not Connected.
 */
const fmt = (d: string) => new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
const COMPANIES = hrefOf('companies');

export function ExploreHome() {
	const router = useRouter();
	const { data: profile } = useUserProfile();
	const { picked } = useInterests();
	const [q, setQ] = useState('');
	// Shares its SWR key with the Newsletter page, so visiting both costs one
	// request. Editions arrive newest-first from the feed, but sort rather than
	// trust that — the hero must genuinely be the latest.
	const news = useSWR<NewsletterArticle[]>(qk.newsletter.articles());
	const latestNews = [...(news.data ?? [])]
		.sort((a, b) => Date.parse(b.pubDate) - Date.parse(a.pubDate))[0];
	// Shares the Reports library's SWR key, so visiting both costs one request.
	// Deliberately not `limit: 1`: the list default sorts by `-created_at` and
	// the `-report_year` sort puts year-less rows FIRST, so a single row is the
	// wrong report either way (measured: it returns a 2021 edition). The whole
	// set is 33 rows / 23KB, so sorting client-side is the cheaper correct option.
	const reports = useSWR<Page<ReportListItem>>(qk.reports.list({ limit: 100 }));
	const latestReport = [...(reports.data?.data ?? [])]
		.sort((a, b) => (b.report_year ?? 0) - (a.report_year ?? 0) || (b.report_month ?? 0) - (a.report_month ?? 0))[0];
	const first = (profile?.display_name ?? profile?.full_name ?? '').split(' ')[0] || 'there';
	const hour = new Date().getHours();
	const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
	const lastMonth = new Date(new Date().getFullYear(), new Date().getMonth() - 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

	const search = (text: string) => { const t = text.trim(); router.push(t ? `${COMPANIES}?q=${encodeURIComponent(t)}` : COMPANIES); };
	const suggestions: Record<string, string> = {
		'Fan engagement companies': `${COMPANIES}?q=${encodeURIComponent('fan engagement')}`,
		'Latest funding rounds': hrefOf('roundup'),
		'Upcoming events': hrefOf('events'),
		'How sports tech is structured': hrefOf('framework'),
	};

	return (
		<div className="explore-home">
			<section>
				<H1>{greeting}, {first}</H1>
				<div className="explore-home__sub">
					<span>Here&apos;s what has changed across the sports-tech market.</span>
					<Link href={hrefOf('interests')} className="explore-home__interests"><SlidersHorizontal size={12} aria-hidden="true" />Interests <b>{picked.length}</b></Link>
				</div>
				<div className="explore-home__search">
					<AgentComposer
						value={q}
						onChange={setQ}
						onSubmit={() => search(q)}
						placeholder="Search companies, reports, events and categories"
						suggestions={Object.keys(suggestions)}
						onSuggestion={(s) => router.push(suggestions[s])}
					/>
				</div>
			</section>

			<section className="explore-home__attn">
				<SectionHead title="What needs your attention" meta="Based on your interests · updated today" />
				<div className="atlas-feed-grid">
					{latestNews && (
						<FeedCard tag="Newsletter" icon={Newspaper} title={latestNews.title} body={`${fmt(latestNews.pubDate)} · ${latestNews.description}`} href={hrefOf('newsletter')} actionLabel="Read" />
					)}
					{latestReport && (
						<FeedCard tag="Report" icon={Files} title={latestReport.title} body={`${latestReport.report_year ?? ''} · ${latestReport.description ?? ''}`.trim()} href={hrefOf('reports')} actionLabel="Open" />
					)}
					<FeedCard tag="Monthly roundup" icon={CalendarDays} title={`${lastMonth} market roundup`} body="The month’s most relevant funding rounds, acquisitions and industry developments in one read." href={hrefOf('roundup')} />
					{picked.length === 0 ? (
						<FeedCard tag="For you" icon={UserRound} title="Your market view is broad" body="Select sectors, sports or countries to make these recommendations sharper." href={hrefOf('interests')} actionLabel="Choose" />
					) : (
						<FeedCard
							tag="For you" icon={UserRound}
							title={<>Companies in {picked[0]}<PlaceholderTag /></>}
							body={`Because you follow ${picked.slice(0, 3).join(', ')}${picked.length > 3 ? ` and ${picked.length - 3} more` : ''}.`}
							href={`${COMPANIES}?q=${encodeURIComponent(picked[0] ?? '')}`}
							actionLabel="Explore"
						/>
					)}
				</div>
			</section>
		</div>
	);
}
