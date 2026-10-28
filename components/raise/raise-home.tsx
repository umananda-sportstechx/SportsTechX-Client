'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { useRouter } from 'next/navigation';
import { Loader2, Settings, FileCheck, Bookmark, Presentation, CalendarCheck, UserRound, Hourglass } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useUserProfile } from '@/hooks/use-user-profile';
import { qk } from '@/lib/query-keys';
import { SETUP_CARD_WIZARD, openRaiseSetup, openScoutThesis } from '@/lib/setup-events';
import { H1, Badge, SectionHead, FeedCard, Progress } from '@/components/atlas';
import { RaiseSearch, RAISE_SUGGESTIONS } from '@/components/raise/raise-search';
import { hrefOf } from '@/lib/routes';

/**
 * Atlas Raise — Home. Search-first: a centred composer as the focal point, with
 * "What needs your attention" as elongated cards peeking from the bottom edge
 * (scroll to reveal more). Data unchanged (GET /api/raise/home); only `attention`
 * is used here now. The search bar is UI-only for now (see RaiseSearch).
 *
 * A component rather than a page: `/app` picks one of the three product homes
 * by tier, the way Explore and Scout always did.
 */

interface Attention { id: string; title: string; why: string; cta_label: string; cta_href: string; count?: number }
interface Round {
	round_type: string | null; target_amount: string | number | null; committed_amount: string | number | null;
	currency_code: string | null; target_close_date: string | null; status: string | null;
}
interface Home { needs_setup?: boolean; raise?: Round | null; attention: Attention[] }

const ROUND_NAME: Record<string, string> = { pre_seed: 'Pre-seed', seed: 'Seed', series_a: 'Series A', series_b_plus: 'Series B+', bridge: 'Bridge' };
const money = (v: number, ccy: string) => {
	try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: ccy, notation: 'compact', maximumFractionDigits: 1 }).format(v); }
	catch { return `${ccy} ${v.toLocaleString()}`; } // unknown currency code
};
/** Whole days from today to a YYYY-MM-DD date, in the viewer's own calendar. */
const daysUntil = (ymd: string) => {
	const [y, m, d] = ymd.slice(0, 10).split('-').map(Number);
	const today = new Date(); today.setHours(0, 0, 0, 0);
	return Math.round((new Date(y!, m! - 1, d!).getTime() - today.getTime()) / 864e5);
};

/** The round at a glance, as the first "needs your attention" card: countdown to
 *  the founder's target close date (title), committed vs target (body + bar).
 *  Both come from Raise Setup; the action re-opens it to edit. */
function RoundCard({ r }: { r: Round }) {
	const ccy = (r.currency_code || 'EUR').toUpperCase();
	const target = Number(r.target_amount) || 0;
	const committed = Number(r.committed_amount) || 0;
	const ended = r.status === 'funded' || r.status === 'closed';
	const days = r.target_close_date ? daysUntil(r.target_close_date) : null;
	const closeOn = r.target_close_date ? new Date(`${r.target_close_date.slice(0, 10)}T00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : null;
	const name = ROUND_NAME[r.round_type ?? ''];
	const plural = (n: number) => `${n} ${n === 1 ? 'day' : 'days'}`;

	const title = ended ? `${name ?? 'Your'} round ${r.status}`
		: days == null ? 'Set a target close date'
		: days > 0 ? `${plural(days)} to your target close`
		: days === 0 ? 'Your target close is today'
		: `${plural(-days)} past your target close`;
	const amounts = target <= 0 ? null
		: ended && committed === 0 ? `Target ${money(target, ccy)}` // funded, nothing recorded: don't say "€0 committed"
		: `${money(committed, ccy)} of ${money(target, ccy)} committed`;
	const body = [
		amounts ?? (ended ? null : 'Add how much you’re raising to track progress.'),
		!ended && closeOn ? `Target close ${closeOn}` : null,
		r.status === 'paused' ? 'Raise paused' : null,
	].filter(Boolean).join(' · ');
	// A round marked funded with nothing recorded as committed: no empty bar
	// contradicting the title.
	const showBar = target > 0 && !(ended && committed === 0);

	return (
		<FeedCard
			tag={name ? `${name} round` : 'Your round'}
			icon={Hourglass}
			title={title}
			body={body || undefined}
			onAction={() => openRaiseSetup({ edit: true })}
			actionLabel={days != null && days < 0 && !ended ? 'Update date' : 'Edit round'}
			extra={showBar ? <Progress pct={(committed / target) * 100} /> : undefined}
		/>
	);
}

/** Category tag + icon per attention item (ids come from the raise-home service). */
const ATTENTION_TAG: Record<string, { tag: string; icon: LucideIcon }> = {
	setup: { tag: 'Setup', icon: Settings },
	deck: { tag: 'Pitch deck', icon: FileCheck },
	overdue: { tag: 'Watchlist', icon: Bookmark },
	'next-steps': { tag: 'Watchlist', icon: Bookmark },
	amounts: { tag: 'Watchlist', icon: Bookmark },
	'add-first': { tag: 'Investors', icon: Presentation },
	strategy: { tag: 'Strategy', icon: CalendarCheck },
};
const DEFAULT_TAG = { tag: 'For you', icon: UserRound };

export function RaiseHome() {
	const router = useRouter();
	const { data: profile } = useUserProfile();
	const { data, isLoading } = useSWR<Home>(qk.raise.home());
	const [q, setQ] = useState('');
	const goChat = (text: string) => { const t = text.trim(); if (t) router.push(`${hrefOf('chat')}?q=${encodeURIComponent(t)}`); };

	if (isLoading || !data) {
		return <div className="raise-home"><div style={{ display: 'grid', placeItems: 'center', minHeight: '60vh' }}><Loader2 className="animate-spin" size={22} /></div></div>;
	}

	const greetName = profile?.display_name?.split(' ')[0] ?? profile?.full_name?.split(' ')[0] ?? 'there';
	const hour = new Date().getHours();
	const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
	const showRound = !data.needs_setup && !!data.raise;

	return (
		<div className="raise-home">
			<section className="raise-hero">
				<div className="raise-hero-inner">
					<H1 className="raise-hero-title">{greeting}, {greetName}</H1>
					<p className="raise-hero-sub">What would you like to work on?</p>
					<RaiseSearch value={q} onChange={setQ} onSubmit={() => goChat(q)} suggestions={RAISE_SUGGESTIONS} onSuggestion={goChat} />
				</div>
			</section>

			<section className="raise-attn">
				<SectionHead title="What needs your attention" />
				{(showRound || data.attention.length > 0) && (
					<div className="atlas-feed-grid">
						{showRound && <RoundCard r={data.raise!} />}
						{data.attention.map((a) => {
							const t = ATTENTION_TAG[a.id] ?? DEFAULT_TAG;
							return (
								<FeedCard
									key={a.id}
									tag={t.tag}
									icon={t.icon}
									title={a.title}
									body={a.why}
									// Setup cards open the wizard in place; everything else keeps
									// its server-built link. Keyed on the card's stable `id`, not
									// on `cta_href` — the hrefs are the thing being retired.
									{...(SETUP_CARD_WIZARD[a.id]
										? { onAction: SETUP_CARD_WIZARD[a.id] === 'raise' ? openRaiseSetup : openScoutThesis }
										: { href: a.cta_href })}
									actionLabel={a.cta_label}
									extra={a.count != null ? <Badge tone="danger">{a.count} overdue</Badge> : undefined}
								/>
							);
						})}
					</div>
				)}
				{data.attention.length === 0 && <div className="raise-attn-empty">You’re all caught up. Keep your watchlist moving.</div>}
			</section>
		</div>
	);
}
