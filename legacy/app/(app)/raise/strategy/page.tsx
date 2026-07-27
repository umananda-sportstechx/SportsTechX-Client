'use client';

import { useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { toast } from 'sonner';
import { Check, Lock, Loader2, Calendar } from 'lucide-react';
import { Page } from '@/components/ui/atoms';
import { qk } from '@/lib/query-keys';
import { apiRequest } from '@/lib/query-client';

/**
 * Atlas Raise — Strategy Session (Notion "2d"). Quarterly session with STX
 * leadership. Reuses the Home read-model's `strategy` block (status + unlock
 * steps); "Book your call" posts to /api/raise/strategy/book. Time confirmed
 * manually by STX (calendar integration deferred).
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
		<Page>
			<div style={{ maxWidth: 560 }}>
				<h1 style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 6px' }}>Strategy session</h1>
				<p style={{ color: 'var(--fg-2)', fontSize: 15, lineHeight: 1.6, marginBottom: 24 }}>
					Get direct feedback from SportsTechX leadership on your deck, investor strategy and next steps — one quarterly session.
				</p>

				{isLoading || !s ? <div style={{ display: 'grid', placeItems: 'center', minHeight: 200 }}><Loader2 className="spin" size={22} /></div> : (
					<div className="card" style={{ padding: 24 }}>
						{s.status === 'booked' ? (
							<>
								<div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--accent)', fontWeight: 700, marginBottom: 8 }}><Calendar size={16} /> Session {s.scheduled_at ? 'booked' : 'requested'}</div>
								<div style={{ fontSize: 14, color: 'var(--fg-2)' }}>{s.scheduled_at ? new Date(s.scheduled_at).toLocaleString() : 'SportsTechX will confirm a time with you shortly.'}</div>
							</>
						) : s.status === 'available' ? (
							<>
								<div style={{ fontWeight: 700, fontSize: 18, marginBottom: 6 }}>Your strategy session is available</div>
								<div style={{ fontSize: 14, color: 'var(--fg-2)', lineHeight: 1.5, marginBottom: 18 }}>Use your quarterly session to pressure-test the raise and plan what to do next.</div>
								<button className="btn" disabled={busy} onClick={() => void book()}>{busy ? <Loader2 className="spin" size={13} /> : 'Book your call'}</button>
							</>
						) : (
							<>
								<div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--fg-muted)', fontSize: 13, marginBottom: 14 }}><Lock size={14} /> Unlock your session by completing:</div>
								<div style={{ display: 'grid', gap: 10 }}>
									{s.steps.map((st) => (
										<div key={st.label} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: st.done ? 'var(--fg)' : 'var(--fg-muted)' }}>
											{st.done ? <Check size={16} color="var(--accent)" /> : <span style={{ width: 16, height: 16, borderRadius: '50%', border: '1.5px solid var(--border)' }} />}
											{st.label}
										</div>
									))}
								</div>
								<div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 14 }}>
									{s.steps.filter((x) => x.done).length} of {s.steps.length} complete · continue from your <Link href="/raise" style={{ color: 'var(--accent)' }}>Home</Link>.
								</div>
							</>
						)}
					</div>
				)}
			</div>
		</Page>
	);
}
