'use client';

import { useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { toast } from 'sonner';
import { Check, Lock, Loader2, Calendar } from 'lucide-react';
import { qk } from '@/lib/query-keys';
import { apiRequest } from '@/lib/query-client';
import { Screen, PageHead, Card, Button, Loading } from '@/components/atlas';

/**
 * Atlas Raise — Strategy Session (Notion "2d"). Quarterly session with STX
 * leadership. Reuses the Home read-model's `strategy` block; "Book your call"
 * posts to /api/raise/strategy/book. Time confirmed manually by STX.
 */
interface Home { strategy: { status: string; scheduled_at: string | null; next_eligible_at: string | null; steps: { label: string; done: boolean }[] } }

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

	return (
		<Screen width={620}>
			<PageHead title="Strategy session" sub="Get direct feedback from SportsTechX leadership on your deck, investor strategy and next steps — one quarterly session." />

			<div>
				{isLoading || !s ? <Loading /> : (
					<Card glow={s.status === 'available' ? 'blue' : undefined}>
						{s.status === 'booked' ? (
							<>
								<div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontFamily: 'var(--a-font)', fontWeight: 700, fontSize: 16, color: 'var(--a-ink)', marginBottom: 8 }}><Calendar size={16} color="var(--a-navy)" /> Session {s.scheduled_at ? 'booked' : 'requested'}</div>
								<div style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--a-muted)' }}>{s.scheduled_at ? new Date(s.scheduled_at).toLocaleString() : 'SportsTechX will confirm a time with you shortly.'}</div>
							</>
						) : s.status === 'available' ? (
							<>
								<div style={{ fontFamily: 'var(--a-font)', fontWeight: 700, fontSize: 16, marginBottom: 6 }}>Your strategy session is available</div>
								<div style={{ fontSize: 13, color: 'var(--a-muted)', lineHeight: 1.55, marginBottom: 18 }}>Use your quarterly session to pressure-test the raise and plan what to do next.</div>
								<Button onClick={() => void book()} disabled={busy}>{busy ? <Loader2 className="animate-spin" size={13} /> : 'Book your call'}</Button>
							</>
						) : (
							<>
								<div className="atlas-eyebrow" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 10 }}><Lock size={12} /> Unlock your session by completing:</div>
								<div style={{ display: 'grid' }}>
									{s.steps.map((st, i) => (
										<div key={st.label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderTop: i ? '1px solid var(--a-border)' : 'none', fontSize: 13, color: st.done ? 'var(--a-ink)' : 'var(--a-faint)' }}>
											{st.done ? <Check size={16} color="var(--a-navy)" /> : <span style={{ width: 16, height: 16, borderRadius: '50%', border: '1.5px solid var(--a-border-strong)' }} />}
											{st.label}
										</div>
									))}
								</div>
								<div style={{ fontSize: 12, color: 'var(--a-muted)', marginTop: 6, paddingTop: 14, borderTop: '1px solid var(--a-border)' }}>
									<span style={{ fontFamily: 'var(--a-mono)', fontSize: 11 }}>{s.steps.filter((x) => x.done).length} of {s.steps.length}</span> complete · continue from your <Link href="/raise" style={{ color: 'var(--a-ink)', textDecoration: 'underline', textUnderlineOffset: 2 }}>Home</Link>.
								</div>
							</>
						)}
					</Card>
				)}
			</div>
		</Screen>
	);
}
