'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { useRouter } from 'next/navigation';
import { ArrowRight, Loader2 } from 'lucide-react';
import { useUserProfile } from '@/hooks/use-user-profile';
import { qk } from '@/lib/query-keys';
import { H1, Badge, Button } from '@/components/atlas/kit';
import { RaiseSearch, RAISE_SUGGESTIONS } from '@/components/atlas/raise-search';

/**
 * Atlas Raise — Home. Search-first: a centred composer as the focal point, with
 * "What needs your attention" as elongated cards peeking from the bottom edge
 * (scroll to reveal more). Data unchanged (GET /api/raise/home); only `attention`
 * is used here now. The search bar is UI-only for now (see RaiseSearch).
 */

interface Attention { id: string; title: string; why: string; cta_label: string; cta_href: string; count?: number }
interface Home { attention: Attention[] }

export default function RaiseHomePage() {
	const router = useRouter();
	const { data: profile } = useUserProfile();
	const { data, isLoading } = useSWR<Home>(qk.raise.home());
	const [q, setQ] = useState('');
	const goChat = (text: string) => { const t = text.trim(); if (t) router.push(`/raise/chat?q=${encodeURIComponent(t)}`); };

	if (isLoading || !data) {
		return <div className="raise-home"><div style={{ display: 'grid', placeItems: 'center', minHeight: '60vh' }}><Loader2 className="spin" size={22} /></div></div>;
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
				<div className="raise-attn-head">What needs your attention</div>
				{data.attention.length === 0 ? (
					<div className="raise-attn-empty">You’re all caught up. Keep your pipeline moving.</div>
				) : (
					<div className="raise-attn-list">
						{data.attention.map((a) => (
							<div key={a.id} className="raise-attn-card">
								<div className="raise-attn-card-main">
									<div className="raise-attn-card-title">{a.title}</div>
									<div className="raise-attn-card-why">{a.why}</div>
									{a.count != null && <div style={{ marginTop: 10 }}><Badge tone="danger">{a.count} overdue</Badge></div>}
								</div>
								<Button href={a.cta_href} variant="outline" size="sm">{a.cta_label} <ArrowRight size={13} /></Button>
							</div>
						))}
					</div>
				)}
			</section>
		</div>
	);
}
