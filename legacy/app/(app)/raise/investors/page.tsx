'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { toast } from 'sonner';
import { Check, Plus, ExternalLink, Loader2, Search } from 'lucide-react';
import { Page } from '@/components/ui/atoms';
import { qk } from '@/lib/query-keys';
import { apiRequest } from '@/lib/query-client';
import { useDebouncedValue } from '@/hooks/use-debounced-value';

/**
 * Atlas Raise — Investors (Notion "Investors"). Two tabs: Recommended (reuses the
 * existing investor-matching engine at /api/recommendations/investors) and All
 * (the investor database). "Add to pipeline" posts to the raise Pipeline; already-
 * added investors show "In pipeline".
 */

interface Match {
	id: string; name: string; slug: string | null; website: string | null;
	category: string | null; description: string | null; score: number; match_reasons: string[];
}
interface MatchResult { company: { id: string; name: string } | null; reason?: string; results: Match[] }
interface Investor { id: string; name: string; slug: string | null; category: string | null; description: string | null; website: string | null; hq_country?: string | null }

export default function RaiseInvestorsPage() {
	const [tab, setTab] = useState<'recommended' | 'all'>('recommended');
	const [q, setQ] = useState('');
	const dq = useDebouncedValue(q);

	const matches = useSWR<MatchResult>(['/api/recommendations/investors', { limit: 24 }]);
	const all = useSWR<{ data: Investor[] }>(tab === 'all' ? qk.investors.list({ q: dq || undefined, limit: 40 }) : null);
	// Which investors are already in the pipeline → show "In pipeline".
	const pipe = useSWR<{ data: Array<{ investor_id: string | null }> }>(qk.raise.pipeline());
	const inPipeline = useMemo(() => new Set((pipe.data?.data ?? []).map((r) => r.investor_id).filter(Boolean) as string[]), [pipe.data]);

	const add = async (investorId: string) => {
		try {
			await apiRequest('POST', '/api/raise/pipeline', { investor_id: investorId, stage: 'target' });
			toast.success('Added to pipeline');
			void pipe.mutate();
		} catch (e) { toast.error((e as Error).message); }
	};

	return (
		<Page>
			<h1 style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 16px' }}>Investors</h1>

			<div style={{ display: 'flex', gap: 18, borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
				{(['recommended', 'all'] as const).map((t) => (
					<button key={t} onClick={() => setTab(t)} style={{
						padding: '8px 2px', border: 0, background: 'transparent', cursor: 'pointer', fontSize: 14, fontWeight: 700,
						color: tab === t ? 'var(--accent)' : 'var(--fg-muted)', borderBottom: `2px solid ${tab === t ? 'var(--accent)' : 'transparent'}`, marginBottom: -1,
					}}>{t === 'recommended' ? 'Recommended' : 'All investors'}</button>
				))}
			</div>

			{tab === 'recommended' ? (
				matches.isLoading ? <Spin />
					: matches.data?.reason === 'no_company_claim' || !matches.data?.company ? (
						<Empty>
							Add your company so Atlas can match investors to your sector, stage and geography.{' '}
							<Link href="/raise/setup" style={{ color: 'var(--accent)' }}>Complete setup →</Link>
						</Empty>
					) : (matches.data?.results.length ?? 0) === 0 ? <Empty>No matches yet. Broaden your investor criteria in setup.</Empty>
						: <Grid>
							{matches.data!.results.map((m) => (
								<InvestorCard key={m.id} inv={m} added={inPipeline.has(m.id)} onAdd={() => add(m.id)}
									badge={<span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent)' }}>{Math.round(m.score)}% match</span>}
									reasons={m.match_reasons} />
							))}
						</Grid>
			) : (
				<>
					<div style={{ position: 'relative', maxWidth: 360, marginBottom: 16 }}>
						<Search size={14} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--fg-muted)' }} />
						<input placeholder="Search investors…" value={q} onChange={(e) => setQ(e.target.value)}
							style={{ width: '100%', height: 38, padding: '0 12px 0 34px', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--fg)', fontSize: 14 }} />
					</div>
					{all.isLoading ? <Spin /> : (all.data?.data.length ?? 0) === 0 ? <Empty>No investors found.</Empty>
						: <Grid>
							{all.data!.data.map((inv) => (
								<InvestorCard key={inv.id} inv={inv} added={inPipeline.has(inv.id)} onAdd={() => add(inv.id)} />
							))}
						</Grid>}
				</>
			)}
		</Page>
	);
}

function InvestorCard({ inv, added, onAdd, badge, reasons }: {
	inv: Investor; added: boolean; onAdd: () => void; badge?: React.ReactNode; reasons?: string[];
}) {
	const [busy, setBusy] = useState(false);
	const doAdd = async () => { setBusy(true); await onAdd(); setBusy(false); };
	return (
		<div className="card" style={{ padding: 18, display: 'flex', flexDirection: 'column' }}>
			<div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 6 }}>
				<div style={{ fontWeight: 700, fontSize: 16 }}>{inv.name}</div>
				{badge}
			</div>
			{inv.category && <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginBottom: 8 }}>{inv.category}</div>}
			{inv.description && <div style={{ fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.5, marginBottom: 10, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{inv.description}</div>}
			{reasons && reasons.length > 0 && (
				<div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
					{reasons.slice(0, 3).map((r, i) => <span key={i} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: 'var(--bg-2)', color: 'var(--fg-2)' }}>{r}</span>)}
				</div>
			)}
			<div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
				{added
					? <button className="btn ghost" disabled style={{ color: 'var(--accent)' }}><Check size={13} /> In pipeline</button>
					: <button className="btn" disabled={busy} onClick={() => void doAdd()}>{busy ? <Loader2 className="spin" size={13} /> : <><Plus size={13} /> Add to pipeline</>}</button>}
				{inv.slug && <Link href={`/investors/${inv.slug}`} className="btn ghost"><ExternalLink size={13} /> Profile</Link>}
			</div>
		</div>
	);
}

function Grid({ children }: { children: React.ReactNode }) { return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>{children}</div>; }
function Spin() { return <div style={{ display: 'grid', placeItems: 'center', minHeight: 240 }}><Loader2 className="spin" size={22} /></div>; }
function Empty({ children }: { children: React.ReactNode }) { return <div className="card" style={{ padding: 28, textAlign: 'center', color: 'var(--fg-2)', fontSize: 14 }}>{children}</div>; }
