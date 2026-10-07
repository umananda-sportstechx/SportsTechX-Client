'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { useRouter } from 'next/navigation';
import { Loader2, Settings, FileCheck, Bookmark, Presentation, CalendarCheck, UserRound } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useUserProfile } from '@/hooks/use-user-profile';
import { qk } from '@/lib/query-keys';
import { H1, Badge, SectionHead, FeedCard } from '@/components/atlas';
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
interface Home { attention: Attention[] }

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
									href={a.cta_href}
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
