'use client';

import { useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { toast } from 'sonner';
import { Check, Lock, Loader2, Calendar } from 'lucide-react';
import { qk } from '@/lib/query-keys';
import { apiRequest } from '@/lib/query-client';
import { Screen, PageHead, Card, Button, Badge, Loading } from '@/components/atlas';
import { hrefOf } from '@/lib/routes';

/**
 * Atlas Raise — Strategy Session (Notion "2d"). Quarterly session with STX
 * leadership. Reuses the Home read-model's `strategy` block; "Book your call"
 * posts to /api/raise/strategy/book. Time confirmed manually by STX.
 */
interface Home { strategy: { status: string; scheduled_at: string | null; next_eligible_at: string | null; steps: { label: string; done: boolean }[] } }

const PERKS: [string, string][] = [
	['Deck review', 'Pressure-test your pitch deck with STX leadership and see how investors will read it.'],
	['Investor strategy', 'Sharpen your targeting, positioning and the sequence of your raise.'],
	['Next steps', 'Leave with a concrete, prioritised plan for the weeks ahead.'],
];

export default function RaiseStrategyPage() {
	const { data, isLoading, mutate } = useSWR<Home>(qk.raise.home());
	const [busy, setBusy] = useState(false);
	const s = data?.strategy;

	const book = async () => {
		setBusy(true);
		try { await apiRequest('POST', '/api/raise/strategy/book', {}); toast.success('Session requested — STX will confirm a time.'); void mutate(); }
		catch (e) { toast.error((e as Error).message); }
		finally { setBusy(false); }
	};

	const done = s ? s.steps.filter((x) => x.done).length : 0;

	return (
		<Screen>
			<PageHead title="Strategy session" sub="Get direct feedback from SportsTechX leadership on your deck, investor strategy and next steps — one quarterly session." />

			{isLoading || !s ? <Loading /> : (
				<Card glow={s.status === 'available' ? 'blue' : undefined} style={{ marginBottom: 20 }}>
					<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 28, flexWrap: 'wrap' }}>
						{s.status === 'booked' ? (
							<>
								<div style={{ flex: 1, minWidth: 260 }}>
									<div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontFamily: 'var(--a-font)', fontWeight: 700, fontSize: 17, color: 'var(--a-ink)', marginBottom: 8 }}><Calendar size={16} color="var(--a-navy)" /> Session {s.scheduled_at ? 'confirmed' : 'requested'}</div>
									<div style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--a-muted)' }}>{s.scheduled_at ? `Your session is scheduled for ${new Date(s.scheduled_at).toLocaleString()}.` : 'SportsTechX will confirm a time with you shortly — look out for an email.'}</div>
								</div>
								<Badge tone={s.scheduled_at ? 'ok' : 'neutral'}>{s.scheduled_at ? 'Confirmed' : 'Requested'}</Badge>
							</>
						) : s.status === 'available' ? (
							<>
								<div style={{ flex: 1, minWidth: 260 }}>
									<div style={{ fontFamily: 'var(--a-font)', fontWeight: 700, fontSize: 17, marginBottom: 6, color: 'var(--a-ink)' }}>Your strategy session is available</div>
									<div style={{ fontSize: 13, color: 'var(--a-muted)', lineHeight: 1.55 }}>Use your quarterly session to pressure-test the raise and plan what to do next.</div>
								</div>
								<Button onClick={() => void book()} disabled={busy}>{busy ? <Loader2 className="animate-spin" size={13} /> : 'Book your call'}</Button>
							</>
						) : (
							<>
								<div style={{ flex: 1, minWidth: 260 }}>
									<div className="atlas-eyebrow" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 12 }}><Lock size={12} /> Unlock your session by completing</div>
									<div style={{ display: 'grid' }}>
										{s.steps.map((st, i) => (
											<div key={st.label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderTop: i ? '1px solid var(--a-border)' : 'none', fontSize: 13, color: st.done ? 'var(--a-ink)' : 'var(--a-faint)' }}>
												{st.done ? <Check size={16} color="var(--a-navy)" /> : <span style={{ width: 16, height: 16, borderRadius: '50%', border: '1.5px solid var(--a-border-strong)' }} />}
												{st.label}
											</div>
										))}
									</div>
								</div>
								<div style={{ minWidth: 180, textAlign: 'right' }}>
									<div style={{ fontFamily: 'var(--a-mono)', fontSize: 22, color: 'var(--a-ink)' }}>{done}<span style={{ color: 'var(--a-faint)', fontSize: 15 }}> / {s.steps.length}</span></div>
									<div style={{ fontSize: 11, color: 'var(--a-faint)', letterSpacing: '0.05em', textTransform: 'uppercase', fontFamily: 'var(--a-mono)', marginTop: 2 }}>complete</div>
									<Link href={hrefOf('home')} style={{ display: 'inline-block', marginTop: 12, fontSize: 12, color: 'var(--a-ink)', textDecoration: 'underline', textUnderlineOffset: 2 }}>Continue from Home →</Link>
								</div>
							</>
						)}
					</div>
				</Card>
			)}

			<Card>
				<div className="atlas-eyebrow" style={{ marginBottom: 14 }}>What to expect</div>
				<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
					{PERKS.map(([h, d]) => (
						<div key={h} style={{ border: '1px solid var(--a-border)', borderRadius: 'var(--a-radius-sm)', background: 'var(--a-inset)', padding: '16px 16px 15px' }}>
							<div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--a-font)', color: 'var(--a-ink)' }}>{h}</div>
							<div style={{ marginTop: 8, fontSize: 12.5, lineHeight: 1.5, color: 'var(--a-muted)' }}>{d}</div>
						</div>
					))}
				</div>
			</Card>
		</Screen>
	);
}
