'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Newspaper, Files, CalendarDays, UserRound, SlidersHorizontal } from 'lucide-react';
import { AgentComposer, FeedCard, H1, PlaceholderTag, SectionHead } from '@/components/atlas';
import useSWR from 'swr';
import { useUserProfile } from '@/hooks/use-user-profile';
import { qk } from '@/lib/query-keys';
import type { NewsletterArticle } from '@/types/api';
import { SAMPLE_REPORTS } from '@/components/features/resources/sample-resources';
import { useInterests, marketInterests } from './interests';

/**
 * Explore Home (Claude Design "Home"): greeting, interests count, a search bar
 * (searches the live company database) and "What needs your attention". The
 * roundup and newsletter cards are live; the report card (sample) and "For you"
 * (interests) are Backend Not Connected.
 */
const fmt = (d: string) => new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
const COMPANIES = '/explore/market/companies';

export function ExploreHome() {
	const router = useRouter();
	const { data: profile } = useUserProfile();
	const [interests] = useInterests();
	const [q, setQ] = useState('');
	// Shares its SWR key with the Newsletter page, so visiting both costs one
	// request. Editions arrive newest-first from the feed, but sort rather than
	// trust that — the hero must genuinely be the latest.
	const news = useSWR<NewsletterArticle[]>(qk.newsletter.articles());
	const latestNews = [...(news.data ?? [])]
		.sort((a, b) => Date.parse(b.pubDate) - Date.parse(a.pubDate))[0];
	const latestReport = SAMPLE_REPORTS[0];
	const picked = marketInterests(interests);
	const first = (profile?.display_name ?? profile?.full_name ?? '').split(' ')[0] || 'there';
	const hour = new Date().getHours();
	const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
	const lastMonth = new Date(new Date().getFullYear(), new Date().getMonth() - 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

	const search = (text: string) => { const t = text.trim(); router.push(t ? `${COMPANIES}?q=${encodeURIComponent(t)}` : COMPANIES); };
	const suggestions: Record<string, string> = {
		'Fan engagement companies': `${COMPANIES}?q=${encodeURIComponent('fan engagement')}`,
		'Latest funding rounds': '/explore/market/roundup',
		'Upcoming events': '/explore/market/events',
		'How sports tech is structured': '/explore/intelligence/framework',
	};

	return (
		<div className="explore-home">
			<section>
				<H1>{greeting}, {first}</H1>
				<div className="explore-home__sub">
					<span>Here&apos;s what has changed across the sports-tech market.</span>
					<Link href="/explore/interests" className="explore-home__interests"><SlidersHorizontal size={12} aria-hidden="true" />Interests <b>{picked.length}</b></Link>
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
						<FeedCard tag="Newsletter" icon={Newspaper} title={latestNews.title} body={`${fmt(latestNews.pubDate)} · ${latestNews.description}`} href="/explore/intelligence/newsletter" actionLabel="Read" />
					)}
					<FeedCard tag="Report" icon={Files} title={<>{latestReport.title}<PlaceholderTag /></>} body={`Published ${fmt(latestReport.date)} · ${latestReport.desc}`} href="/explore/intelligence/reports" actionLabel="Open" />
					<FeedCard tag="Monthly roundup" icon={CalendarDays} title={`${lastMonth} market roundup`} body="The month’s most relevant funding rounds, acquisitions and industry developments in one read." href="/explore/market/roundup" />
					{picked.length === 0 ? (
						<FeedCard tag="For you" icon={UserRound} title="Your market view is broad" body="Select sectors, sports or countries to make these recommendations sharper." href="/explore/interests" actionLabel="Choose" />
					) : (
						<FeedCard
							tag="For you" icon={UserRound}
							title={<>Companies in {interests.sectors[0] ?? interests.subs[0] ?? interests.sports[0] ?? interests.geos[0]}<PlaceholderTag /></>}
							body={`Because you follow ${picked.slice(0, 3).join(', ')}${picked.length > 3 ? ` and ${picked.length - 3} more` : ''}.`}
							href={`${COMPANIES}?q=${encodeURIComponent(interests.subs[0] ?? interests.sports[0] ?? '')}`}
							actionLabel="Explore"
						/>
					)}
				</div>
			</section>
		</div>
	);
}
