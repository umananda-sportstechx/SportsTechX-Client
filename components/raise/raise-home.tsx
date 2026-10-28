'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { useRouter } from 'next/navigation';
import { Loader2, Settings, FileCheck, Bookmark, Presentation, CalendarCheck, UserRound } from 'lucide-react';
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

/** The round at a glance: committed vs target and the countdown to the founder's
 *  target close date (both from Raise Setup). Missing pieces link back to setup. */
function RoundStrip({ r }: { r: Round }) {
	const ccy = (r.currency_code || 'EUR').toUpperCase();
	const target = Number(r.target_amount) || 0;
	const committed = Number(r.committed_amount) || 0;
	const ended = r.status === 'funded' || r.status === 'closed';
	const days = r.target_close_date ? daysUntil(r.target_close_date) : null;
	const closeOn = r.target_close_date ? new Date(`${r.target_close_date.slice(0, 10)}T00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : null;
	const name = ROUND_NAME[r.round_type ?? ''];
	const editRound = () => openRaiseSetup({ edit: true });
	const edit = <button type="button" className="raise-round__edit" onClick={editRound}>Set it</button>;
	return (
		<div className="atlas-card raise-round">
			<div className="raise-round__main">
				<div className="atlas-eyebrow">{name ? `Your ${name} round` : 'Your round'}{r.status === 'paused' ? ' · paused' : ''}</div>
				{target > 0 ? (
					<>
						<div className="raise-round__amount"><strong>{money(committed, ccy)}</strong> of {money(target, ccy)} committed</div>
						<Progress pct={(committed / target) * 100} />
					</>
				) : <div className="raise-round__amount raise-round__muted">No target amount yet. {edit}</div>}
			</div>
			<div className="raise-round__clock">
				{ended ? <div className="raise-round__big">Round {r.status}</div>
					: days == null ? <div className="raise-round__muted">No target close date. {edit}</div>
					: (
						<>
							<div className="raise-round__big">{days > 0 ? days : days === 0 ? 'Today' : Math.abs(days)}</div>
							<div className="raise-round__muted">
								{days > 0 ? `${days === 1 ? 'day' : 'days'} to your target close · ${closeOn}`
									: days === 0 ? `is your target close · ${closeOn}`
									: <>{Math.abs(days) === 1 ? 'day' : 'days'} past your target close · {closeOn}. <button type="button" className="raise-round__edit" onClick={editRound}>Update</button></>}
							</div>
						</>
					)}
			</div>
		</div>
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
				{!data.needs_setup && data.raise && <RoundStrip r={data.raise} />}
				<SectionHead title="What needs your attention" />
				{data.attention.length === 0 ? (
					<div className="raise-attn-empty">You’re all caught up. Keep your watchlist moving.</div>
				) : (
					<div className="atlas-feed-grid">
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
			</section>
		</div>
	);
}
