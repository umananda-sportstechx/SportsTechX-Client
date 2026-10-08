'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import useSWR from 'swr';
import { BadgeCheck, Bookmark, CalendarDays, Layers, ShieldCheck, Sparkles, Target } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { AgentComposer, Badge, Button, Card, FeedCard, H1, Loading, SectionHead } from '@/components/atlas';
import { useUserProfile } from '@/hooks/use-user-profile';
import { openClaim } from '@/lib/claim-events';
import { qk } from '@/lib/query-keys';
import { hrefOf } from '@/lib/routes';
import { listText, thesisTags, useThesis } from './use-thesis';

/**
 * Scout Home, from `GET /api/scout/home`.
 *
 * Everything here used to be derived from `sample-data.ts` — the match count,
 * the deal count, the attention cards. The endpoint has always returned the
 * real read-model; nothing called it.
 *
 * The server owns the derivation on purpose, and the spec it follows is
 * unusually prescriptive: **at most three attention cards, no dashboard
 * statistics, no charts.** So the cards are rendered as given rather than
 * re-derived here, and `snapshot` is copy for the cards, not a stat row.
 */
interface AttentionCard {
	id: string;
	title: string;
	why: string;
	cta_label: string;
	cta_href: string;
	count?: number;
}

interface ScoutHomeData {
	needs_setup: boolean;
	verification: 'unverified' | 'pending' | 'verified';
	scout: { full_name: string | null; fund_name: string | null; investor_type: string | null } | null;
	thesis_set: boolean;
	snapshot: { watchlist_companies: number; thesis_dimensions: number };
	attention: AttentionCard[];
	prompts: string[];
}

/** Card id → icon. An unknown id still renders, with a neutral icon. */
const CARD_ICON: Record<string, LucideIcon> = {
	'finish-setup': Target,
	onboarding: Target,
	thesis: Target,
	'new-matches': Sparkles,
	'first-watchlist': Bookmark,
	'watchlist-signals': Bookmark,
	verification: BadgeCheck,
};

export function ScoutHome() {
	const { data: profile } = useUserProfile();
	const [thesis] = useThesis();
	const { data, isLoading } = useSWR<ScoutHomeData>(qk.scout.home());
	const [q, setQ] = useState('');
	const router = useRouter();
	// Same hand-off as the founder's home (raise-home.tsx): the composer seeds the
	// full chat page via ?q=. Scout now reaches the same agent, gated to the paid
	// tiers server-side, so this is no longer a placeholder.
	const goChat = (text: string) => {
		const t = text.trim();
		if (t) router.push(`${hrefOf('chat')}?q=${encodeURIComponent(t)}`);
	};

	const first = (profile?.display_name ?? profile?.full_name ?? '').split(' ')[0] || 'there';
	const hour = new Date().getHours();
	const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
	const month = new Date(new Date().getFullYear(), new Date().getMonth() - 1)
		.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
	const tags = thesisTags(thesis);

	if (isLoading) return <Loading />;

	return (
		<div className="scout-home">
			<section className="scout-home__hero">
				<H1>{greeting}, {first}</H1>
				<p className="scout-home__sub">
					Here&rsquo;s what has changed across {listText(thesis.sectors) || 'sports tech'} since your last visit.
				</p>
				{data?.thesis_set && tags.length > 0 && (
					<div className="scout-home__thesis">
						<span className="atlas-eyebrow">Tuned to your thesis</span>
						<div className="scout-tags">{tags.map((t) => <span key={t} className="scout-tag">{t}</span>)}</div>
						<Link href={hrefOf('thesis')} className="scout-link">Edit thesis</Link>
					</div>
				)}
				<div className="scout-home__composer">
					<AgentComposer
						value={q}
						onChange={setQ}
						onSubmit={() => goChat(q)}
						placeholder="Ask Atlas about companies, deals, your thesis…"
						// Server-supplied, and written against the real thesis.
						suggestions={data?.prompts ?? []}
						onSuggestion={goChat}
					/>
				</div>
			</section>

			{data && data.verification !== 'verified' && <VerifyCard state={data.verification} />}

			<section className="scout-home__attn">
				<SectionHead title="What needs your attention" meta="Based on your thesis · since your last visit" />
				<div className="atlas-feed-grid">
					{/* Server-ranked and already capped at three. */}
					{(data?.attention ?? []).map((c) => (
						<FeedCard
							key={c.id}
							tag={c.count != null ? `${c.count}` : 'Scout'}
							icon={CARD_ICON[c.id] ?? Sparkles}
							title={c.title}
							body={c.why}
							href={c.cta_href}
							actionLabel={c.cta_label}
						/>
					))}
					{/* Two standing entry points the read-model does not emit. */}
					<FeedCard
						tag="Monthly Roundup" icon={CalendarDays}
						title={`${month} market roundup`}
						body="Funding, deals and news across sports tech for the month."
						href={hrefOf('roundup')}
					/>
					<FeedCard
						tag="Deal Flow" icon={Layers}
						title="Live raises from the Circle"
						body="Featured deals and verified raises, ranked by thesis fit."
						href={hrefOf('deal-flow')}
					/>
				</div>
			</section>
		</div>
	);
}

/**
 * Verification is reported by `/api/scout/home` and, until now, had nowhere to
 * act on it. The claim modal is mounted globally in `app/providers.tsx`, so
 * this needs no form of its own — `openClaim(null, 'investor')` opens the same
 * flow whose own first step is titled "Get verified".
 */
function VerifyCard({ state }: { state: 'unverified' | 'pending' }) {
	const pending = state === 'pending';
	return (
		<Card glow={pending ? undefined : 'blue'} focus={!pending} className="scout-verify-card">
			<div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
				<div style={{ maxWidth: 560 }}>
					<span className="atlas-eyebrow" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
						<ShieldCheck size={12} aria-hidden="true" />
						{pending ? 'Verification in review' : 'Get verified'}
					</span>
					<div style={{ fontFamily: 'var(--a-font)', fontSize: 17, fontWeight: 700, color: 'var(--a-ink)', margin: '10px 0 6px' }}>
						{pending ? 'We’re reviewing your fund' : 'Verify your fund to unlock introductions'}
					</div>
					<p style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--a-muted)', margin: 0 }}>
						{pending
							? 'The SportsTechX team is checking your details. Recommendations, signals and watchlists work in the meantime.'
							: 'Confirm the fund you invest through. Verified investors can request introductions and see opportunities shared by the Investor Circle.'}
					</p>
				</div>
				{pending
					? <Badge tone="neutral">Pending</Badge>
					: <Button size="sm" onClick={() => openClaim(null, 'investor')}>Get verified</Button>}
			</div>
		</Card>
	);
}
