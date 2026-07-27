'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { toast } from 'sonner';
import { Check, Plus, ExternalLink, Loader2, Search } from 'lucide-react';
import { qk } from '@/lib/query-keys';
import { apiRequest } from '@/lib/query-client';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { Screen, H1, Card, Badge, Button, Tabs, Input, Loading, Empty } from '@/components/atlas/kit';

/**
 * Atlas Raise — Investors (mock-ups 10/11 / Notion "Investors"). Recommended
 * (reuses the investor-matching engine at /api/recommendations/investors) and All
 * (the investor database). Recommendations lead with the *reasons* Atlas matched
 * them — not a mystery % score (Notion). "Add to pipeline" posts to raise Pipeline.
 */
interface Match { id: string; name: string; slug: string | null; website: string | null; category: string | null; description: string | null; score: number; match_reasons: string[] }
interface MatchResult { company: { id: string; name: string } | null; reason?: string; results: Match[] }
interface Investor { id: string; name: string; slug: string | null; category: string | null; description: string | null; website: string | null; hq_country?: string | null }

export default function RaiseInvestorsPage() {
	const [tab, setTab] = useState<'recommended' | 'all'>('recommended');
	const [q, setQ] = useState('');
	const dq = useDebouncedValue(q);

	const matches = useSWR<MatchResult>(['/api/recommendations/investors', { limit: 24 }]);
	const all = useSWR<{ data: Investor[] }>(tab === 'all' ? qk.investors.list({ q: dq || undefined, limit: 40 }) : null);
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
		<Screen>
			<H1>Investors</H1>
			<div style={{ marginTop: 16 }}>
				<Tabs tabs={[{ key: 'recommended', label: 'Recommended' }, { key: 'all', label: 'All investors' }]} value={tab} onChange={setTab} />
			</div>

			<div style={{ marginTop: 20 }}>
				{tab === 'recommended' ? (
					matches.isLoading ? <Loading />
						: matches.data?.reason === 'no_company_claim' || !matches.data?.company ? (
							<Empty>Add your company so Atlas can match investors to your sector, stage and geography.{' '}<Link href="/raise/setup" style={{ color: 'var(--a-navy)' }}>Complete setup →</Link></Empty>
						) : (matches.data?.results.length ?? 0) === 0 ? <Empty>No matches yet. Broaden your investor criteria in setup.</Empty>
							: <Grid>
								{matches.data!.results.map((m) => (
									<InvestorCard key={m.id} inv={m} added={inPipeline.has(m.id)} onAdd={() => add(m.id)} reasons={m.match_reasons} />
								))}
							</Grid>
				) : (
					<>
						<div style={{ position: 'relative', maxWidth: 360, marginBottom: 16 }}>
							<Search size={14} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--a-faint)', pointerEvents: 'none' }} />
							<Input placeholder="Search investors…" value={q} onChange={(e) => setQ(e.target.value)} style={{ paddingLeft: 34 }} />
						</div>
						{all.isLoading ? <Loading /> : (all.data?.data.length ?? 0) === 0 ? <Empty>No investors found.</Empty>
							: <Grid>{all.data!.data.map((inv) => <InvestorCard key={inv.id} inv={inv} added={inPipeline.has(inv.id)} onAdd={() => add(inv.id)} />)}</Grid>}
					</>
				)}
			</div>
		</Screen>
	);
}

function InvestorCard({ inv, added, onAdd, reasons }: { inv: Investor; added: boolean; onAdd: () => void; reasons?: string[] }) {
	const [busy, setBusy] = useState(false);
	const doAdd = async () => { setBusy(true); await onAdd(); setBusy(false); };
	return (
		<Card style={{ display: 'flex', flexDirection: 'column' }}>
			<div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
				<div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--a-inset)', display: 'grid', placeItems: 'center', fontWeight: 600, color: 'var(--a-muted)', flexShrink: 0 }}>{inv.name.charAt(0)}</div>
				<div style={{ minWidth: 0 }}>
					<div style={{ fontWeight: 600, fontSize: 15 }}>{inv.name}</div>
					{inv.category && <div style={{ fontSize: 12, color: 'var(--a-faint)' }}>{inv.category}{inv.hq_country ? ` · ${inv.hq_country}` : ''}</div>}
				</div>
			</div>
			{inv.description && <div style={{ fontSize: 13, color: 'var(--a-muted)', lineHeight: 1.5, marginBottom: 10, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{inv.description}</div>}
			{reasons && reasons.length > 0 && (
				<div style={{ fontSize: 13, color: 'var(--a-muted)', lineHeight: 1.5, marginBottom: 12 }}>
					<span style={{ color: 'var(--a-ink)', fontWeight: 500 }}>Why Atlas recommends this: </span>{reasons.slice(0, 2).join('; ')}.
				</div>
			)}
			<div style={{ display: 'flex', gap: 8, marginTop: 'auto', alignItems: 'center' }}>
				{added
					? <Button variant="ghost" size="sm" disabled><Check size={13} /> In pipeline</Button>
					: <Button size="sm" disabled={busy} onClick={() => void doAdd()}>{busy ? <Loader2 className="spin" size={13} /> : <><Plus size={13} /> Add to pipeline</>}</Button>}
				{inv.slug && <Button href={`/investors/${inv.slug}`} variant="ghost" size="sm"><ExternalLink size={13} /> Profile</Button>}
			</div>
		</Card>
	);
}

function Grid({ children }: { children: React.ReactNode }) { return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>{children}</div>; }
