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

	const [dismissed, setDismissed] = useState<Set<string>>(new Set());
	const matches = useSWR<MatchResult>(['/api/recommendations/investors', { limit: 24 }]);
	const all = useSWR<{ data: Investor[]; meta?: { total?: number } }>(tab === 'all' ? qk.investors.list({ q: dq || undefined, limit: 40 }) : null);
	const pipe = useSWR<{ data: Array<{ investor_id: string | null }> }>(qk.raise.pipeline());
	const criteria = useSWR<{ criteria: { investor_types?: string[]; geographies?: string[]; cheque_min?: string | null; cheque_max?: string | null } | null }>(qk.raise.current());
	const inPipeline = useMemo(() => new Set((pipe.data?.data ?? []).map((r) => r.investor_id).filter(Boolean) as string[]), [pipe.data]);

	const criteriaSummary = useMemo(() => {
		const c = criteria.data?.criteria;
		if (!c) return null;
		const parts: string[] = [];
		if (c.investor_types?.length) parts.push(c.investor_types.join(', '));
		if (c.geographies?.length) parts.push(c.geographies.join(', '));
		if (c.cheque_min || c.cheque_max) {
			const fmt = (v: string | null | undefined) => (v ? `€${(Number(v) / 1000).toLocaleString()}k` : '');
			parts.push(`${fmt(c.cheque_min)}${c.cheque_min && c.cheque_max ? '–' : ''}${fmt(c.cheque_max)} cheque`);
		}
		return parts.length ? `Matching on ${parts.join(' · ')}` : null;
	}, [criteria.data]);

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
							: <>
								{criteriaSummary && (
									<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap', border: '1px solid var(--a-border)', borderRadius: 10, padding: '14px 20px', marginBottom: 14 }}>
										<span style={{ fontSize: 13, color: 'var(--a-muted)' }}>{criteriaSummary}</span>
										<Button href="/raise/settings" variant="outline" size="sm">Edit criteria</Button>
									</div>
								)}
								<Grid>
									{matches.data!.results.filter((m) => !dismissed.has(m.id)).map((m) => (
										<InvestorCard key={m.id} inv={m} added={inPipeline.has(m.id)} onAdd={() => add(m.id)} reasons={m.match_reasons}
											onDismiss={() => setDismissed((s) => new Set(s).add(m.id))} />
									))}
								</Grid>
							</>
				) : (
					<>
						<div style={{ position: 'relative', marginBottom: 16 }}>
							<Search size={14} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--a-faint)', pointerEvents: 'none' }} />
							<Input placeholder="Search investors by name" value={q} onChange={(e) => setQ(e.target.value)} style={{ paddingLeft: 34 }} />
						</div>
						{all.isLoading ? <Loading /> : (all.data?.data.length ?? 0) === 0 ? <Empty>No investors found.</Empty>
							: <AllTable rows={all.data!.data} total={all.data?.meta?.total ?? all.data!.data.length} inPipeline={inPipeline} />}
					</>
				)}
			</div>
		</Screen>
	);
}

function InvestorCard({ inv, added, onAdd, reasons, onDismiss }: { inv: Investor; added: boolean; onAdd: () => void; reasons?: string[]; onDismiss?: () => void }) {
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
			<div style={{ display: 'flex', gap: 8, marginTop: 'auto', alignItems: 'center', flexWrap: 'wrap' }}>
				{added
					? <Button variant="ghost" size="sm" disabled><Check size={13} /> In pipeline</Button>
					: <Button size="sm" disabled={busy} onClick={() => void doAdd()}>{busy ? <Loader2 className="spin" size={13} /> : <><Plus size={13} /> Add to pipeline</>}</Button>}
				{!added && onDismiss && <Button variant="outline" size="sm" onClick={onDismiss}>Not relevant</Button>}
				<Button href={`/raise/investors/${inv.id}`} variant="ghost" size="sm"><ExternalLink size={13} /> View profile</Button>
			</div>
		</Card>
	);
}

function Grid({ children }: { children: React.ReactNode }) { return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>{children}</div>; }

const COLS = 'minmax(0,2fr) 130px 150px minmax(0,1.6fr) 110px';
function AllTable({ rows, total, inPipeline }: { rows: Investor[]; total: number; inPipeline: Set<string> }) {
	return (
		<div>
			<div style={{ fontSize: 12, color: 'var(--a-faint)', marginBottom: 8 }}>{total} investors</div>
			<div style={{ borderTop: '1px solid var(--a-border)' }}>
				<div style={{ display: 'grid', gridTemplateColumns: COLS, gap: 16, fontSize: 12, color: 'var(--a-muted)', padding: '10px 0', borderBottom: '1px solid var(--a-border)' }}>
					<span>Investor</span><span>Type</span><span>Geography</span><span>Description</span><span style={{ textAlign: 'right' }}>Action</span>
				</div>
				{rows.map((i) => (
					<div key={i.id} style={{ display: 'grid', gridTemplateColumns: COLS, gap: 16, fontSize: 13, padding: '13px 0', borderBottom: '1px solid var(--a-border)', alignItems: 'center' }}>
						<span style={{ fontWeight: 500 }}>{i.name}{inPipeline.has(i.id) && <span style={{ marginLeft: 8 }}><Badge tone="navy">In pipeline</Badge></span>}</span>
						<span style={{ color: 'var(--a-muted)' }}>{i.category ?? '—'}</span>
						<span style={{ color: 'var(--a-muted)' }}>{i.hq_country ?? '—'}</span>
						<span style={{ color: 'var(--a-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{i.description ?? '—'}</span>
						<Link href={`/raise/investors/${i.id}`} style={{ textAlign: 'right', color: 'var(--a-navy)', fontSize: 13 }}>View profile</Link>
					</div>
				))}
			</div>
		</div>
	);
}
