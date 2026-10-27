'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Newspaper, Files, CalendarDays, UserRound, SlidersHorizontal } from 'lucide-react';
import { AgentComposer, FeedCard, H1, SectionHead } from '@/components/atlas';
import useSWR from 'swr';
import { useUserProfile } from '@/hooks/use-user-profile';
import type { SectorRef } from '@/hooks/use-sector-tiers';
import { qk } from '@/lib/query-keys';
import type { NewsletterArticle, Page, ReportListItem } from '@/types/api';
import { useInterests, type Interests } from './interests';
import { hrefOf } from '@/lib/routes';

/**
 * Explore Home (Claude Design "Home"): greeting, interests count, a search bar
 * (searches the live company database) and "What needs your attention". Every
 * card is live; "For you" reads the interests saved via `/api/explore/interests`.
 */
const fmt = (d: string) => new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
const COMPANIES = hrefOf('companies');

/**
 * "For you" links to a filter the Companies page really applies — a top sector
 * (`?sector=<slug>`) or a sport (`?sport=<id>`) — and its title names that
 * filter. It used to send the sector *name* as `?q=`, a company-name search.
 * A sub-sector maps to its pillar (sub filters are an advanced-filter feature);
 * regions have no single company filter, so they get the whole list. Null while
 * the taxonomy loads, so the title never shows a raw id.
 */
function forYouLink(v: Interests, sectors: SectorRef[], picked: string[]): { title: string; href: string } | null {
	const byId = new Map(sectors.map((s) => [s.id, s]));
	const sectorId = v.sectors[0] ?? v.subs[0];
	if (sectorId) {
		let s = byId.get(sectorId);
		for (let d = 0; s?.parent_id && byId.has(s.parent_id) && d < 6; d++) s = byId.get(s.parent_id);
		return s ? { title: `Companies in ${s.name}`, href: `${COMPANIES}?sector=${encodeURIComponent(s.slug)}` } : null;
	}
	const sport = v.sports[0];
	// With no sector picked, picked[0] is the first sport's name (or its id until sports load).
	if (sport) return picked[0] && picked[0] !== sport ? { title: `Companies in ${picked[0]}`, href: `${COMPANIES}?sport=${encodeURIComponent(sport)}` } : null;
	return { title: 'Browse the company database', href: COMPANIES };
}

export function ExploreHome() {
	const router = useRouter();
	const { data: profile } = useUserProfile();
	const { value: interests, picked } = useInterests();
	// Same key (and hour-long dedupe) as the interest options — no extra request.
	const { data: sectorData } = useSWR<SectorRef[] | { data: SectorRef[] }>(qk.reference.sectors(), { dedupingInterval: 60 * 60_000 });
	const forYou = forYouLink(interests, Array.isArray(sectorData) ? sectorData : (sectorData?.data ?? []), picked);
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

	// This box wore the agent composer's clothes — sparkle glyph, send pill,
	// suggestion chips — and quietly ran a company search. It now does what it
	// looks like it does: Explore gets the assistant, funded by the welcome
	// credits every new account receives, and the same hand-off Raise and Scout
	// home already use.
	const goChat = (text: string) => {
		const t = text.trim();
		if (t) router.push(`${hrefOf('chat')}?q=${encodeURIComponent(t)}`);
	};
	const suggestions = [
		'Who is funding fan engagement right now?',
		'Summarise last month’s funding rounds',
		'Which sports tech events are coming up?',
		'How is the sports tech market structured?',
	];

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
						onSubmit={() => goChat(q)}
						placeholder="Ask about companies, funding, events and categories"
						suggestions={suggestions}
						onSuggestion={goChat}
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
					) : forYou && (
						<FeedCard
							tag="For you" icon={UserRound}
							title={forYou.title}
							body={`Because you follow ${picked.slice(0, 3).join(', ')}${picked.length > 3 ? ` and ${picked.length - 3} more` : ''}.`}
							href={forYou.href}
							actionLabel="Explore"
						/>
					)}
				</div>
			</section>
		</div>
	);
}
