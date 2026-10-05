'use client';

import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import { Sparkles, Bookmark, Layers, CalendarDays } from 'lucide-react';
import { AgentComposer, FeedCard, H1, SectionHead, PlaceholderTag } from '@/components/atlas';
import { useCompanyWatchlists } from '@/components/features/watchlists/use-company-watchlists';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useThesis, listText, thesisTags } from './use-thesis';
import { SAMPLE_COMPANIES, SAMPLE_DEALS } from './sample-data';
import { usePlaceholderState } from '@/hooks/use-placeholder-state';

/**
 * Scout Home (Claude Design "Home"): greeting, the thesis it's tuned to,
 * suggested starting points and "What needs your attention". Watchlists and
 * the roundup link to real data; thesis matches and deal counts are samples.
 */
export function ScoutHome() {
	const { data: profile } = useUserProfile();
	const [thesis] = useThesis();
	const { lists } = useCompanyWatchlists();
	const [dismissed] = usePlaceholderState<string[]>('dismissed-recs', []);
	const [onboarded] = usePlaceholderState<boolean>('onboarded', false);
	const first = (profile?.display_name ?? profile?.full_name ?? '').split(' ')[0] || 'there';
	const hour = new Date().getHours();
	const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
	const matches = SAMPLE_COMPANIES.filter((c) => c.checks.every(Boolean) && !dismissed.includes(c.id)).length;
	const fits = SAMPLE_DEALS.filter((d) => d.kind !== 'circle').length;
	const tags = thesisTags(thesis);
	const month = new Date(new Date().getFullYear(), new Date().getMonth() - 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
	const [q, setQ] = useState('');
	const prompts = [
		`Find ${thesis.stages[0] ?? 'early-stage'} companies in ${thesis.sectors[0] ?? 'sports tech'}`,
		`Show recent deals in ${thesis.regions[0] ?? 'Europe'}`,
		`What’s new in ${(thesis.sectors[1] ?? thesis.sectors[0] ?? 'fan engagement').toLowerCase()}?`,
		'Show companies raising now',
	];
	// Backend Not Connected: there's no Scout agent endpoint yet, so asking doesn't send anything.
	const ask = () => toast.info('Atlas chat for Scout isn’t connected to a backend yet.');

	return (
		<div className="scout-home">
			<section className="scout-home__hero">
				<H1>{greeting}, {first}</H1>
				<p className="scout-home__sub">Here’s what has changed across {listText(thesis.sectors) || 'sports tech'} since your last visit.</p>
				<div className="scout-home__thesis">
					<span className="atlas-eyebrow">Tuned to your thesis</span>
					<div className="scout-tags">{tags.map((t) => <span key={t} className="scout-tag">{t}</span>)}</div>
					<Link href="/scout/thesis" className="scout-link">Edit thesis</Link>
				</div>
				<div className="scout-home__composer">
					<AgentComposer
						value={q}
						onChange={setQ}
						onSubmit={ask}
						placeholder="Ask Atlas about companies, deals, your thesis…"
						suggestions={prompts}
						badge={<PlaceholderTag />}
					/>
				</div>
			</section>

			<section className="scout-home__attn">
				<SectionHead title={<>What needs your attention<PlaceholderTag /></>} meta="Based on your thesis · since your last visit" />
				<div className="atlas-feed-grid">
					{onboarded
						? <FeedCard tag="Recommended" icon={Sparkles} title={`${matches} companies match your thesis`} body={`${listText(thesis.stages)} companies in ${listText(thesis.sectors)} across ${listText(thesis.regions)}.`} href="/scout/discover/recommended" />
						: <FeedCard tag="Recommended" icon={Sparkles} title="Complete your investment thesis" body="Tell Atlas what you’re looking for to personalise Scout." href="/scout/onboarding" actionLabel="Set up" />}
					<FeedCard
						tag="Watchlist" icon={Bookmark}
						title={lists.length ? `${lists.length} watchlist${lists.length === 1 ? '' : 's'} to review` : 'Start your first watchlist'}
						body={lists.length ? `Including “${lists[0].name}”. Track stages on the board view.` : 'Save companies from any profile to follow their signals and funding.'}
						href="/scout/watchlists"
					/>
					<FeedCard tag="Deal Flow" icon={Layers} title={`${fits} live raises fit your thesis`} body="Deal Flow ranked by fit: 1 Featured Deal and verified raises." href="/scout/deal-flow" />
					<FeedCard tag="Monthly Roundup" icon={CalendarDays} title={`${month} market roundup`} body="Funding, deals and news across sports tech for the month." href="/scout/intelligence/roundup" />
				</div>
			</section>
		</div>
	);
}
