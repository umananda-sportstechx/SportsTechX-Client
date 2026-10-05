'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, Archive } from 'lucide-react';
import { qk } from '@/lib/query-keys';
import type { Deal, Investor, PipelineActivity as Activity, PipelineStage, PipelineUpdate } from '@/types/api';
import { apiRequest } from '@/lib/query-client';
import { Screen, Card, Badge, Button, Field, Input, Select, Loading, Empty, Logo, Flag } from '@/components/atlas';

/**
 * Atlas Raise — Investor profile (mock-ups 12/13 / canvas isProfileBaseline &
 * isProfileNorthgate). One page, two states: not-in-pipeline (Add to pipeline)
 * and in-pipeline (your pipeline record + activity). Wired to GET /api/investors/:id
 * and the founder's raise pipeline.
 */

interface ThesisBundle {
	thesis: { description?: string | null } | null;
	round_types: Array<{ name: string }>;
	geo: Array<{ scope_type: string; scope_value: string }>;
}
interface Pipe {
	id: string; investor_id: string | null; stage: PipelineStage; contact_name: string | null;
	potential_amount: string | null; last_contact_at: string | null; next_step: string | null;
	next_step_due: string | null; notes: string | null;
}



const STAGES: [string, string][] = [
	['target', 'Target'], ['contacted', 'Contacted'], ['in_conversation', 'In conversation'],
	['due_diligence', 'Due diligence'], ['term_sheet', 'Term sheet'], ['committed', 'Committed'],
	['closed', 'Closed'], ['passed', 'Passed'],
];
const STAGE_LABEL = Object.fromEntries(STAGES);
const geoOf = (i: Investor) => [i.hq_country, i.hq_region].filter(Boolean)[0] ?? '—';

export default function InvestorProfilePage() {
	const id = String(useParams().id);
	const router = useRouter();
	const { data: inv, isLoading, error } = useSWR<Investor>(qk.investors.detail(id));
	const { data: bundle } = useSWR<ThesisBundle>(qk.investors.thesis(id));
	const { data: deals } = useSWR<{ data: Deal[] }>(qk.deals.list({ investor_id: id, sort: '-announced_date', limit: 12 }));
	const pipe = useSWR<{ data: Pipe[] }>(qk.raise.pipeline());
	const record = useMemo(() => (pipe.data?.data ?? []).find((r) => r.investor_id === id) ?? null, [pipe.data, id]);

	if (error) return <Screen><Empty>Investor not found. <button onClick={() => router.push('/raise/investors')} style={{ background: 'none', border: 'none', color: 'var(--a-navy)', cursor: 'pointer', font: 'inherit' }}>Back to investors</button></Empty></Screen>;
	if (isLoading || !inv) return <Screen><Loading /></Screen>;

	const stages = bundle?.round_types?.map((r) => r.name).join(', ') || 'Not specified';
	const thesisText = bundle?.thesis?.description ?? null;
	const geoText = bundle?.geo?.map((g) => g.scope_value).join(', ') || [inv.hq_country, inv.hq_region].filter(Boolean).join(', ') || '—';

	return (
		<Screen>
			<button onClick={() => router.back()} className="atlas-action" aria-label="Back"><span className="atlas-action__icon"><ArrowLeft /></span>Back</button>

			<div className="atlas-pagehead" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20, flexWrap: 'wrap', marginTop: 28 }}>
				<div style={{ display: 'flex', gap: 20, alignItems: 'center', minWidth: 0 }}>
					<Logo co={{ name: inv.name, website: inv.website, custom_logo_url: inv.logo_url }} size={72} radius={9} />
					<div style={{ minWidth: 0 }}>
						<h1 className="atlas-h1" style={{ fontSize: 30, lineHeight: 1.15 }}>{inv.name}</h1>
						<div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, fontFamily: 'var(--a-mono)', fontSize: 11, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--a-muted)', marginTop: 10 }}>
							{inv.category && <span>{inv.category}</span>}
							{inv.category && geoOf(inv) !== '—' && <span>·</span>}
							{inv.hq_country && <Flag cc={inv.hq_country} size={15} />}
							{geoOf(inv) !== '—' && <span>{geoOf(inv)}</span>}
						</div>
					</div>
				</div>
				{record
					? <Badge tone="navy">{STAGE_LABEL[record.stage] ?? record.stage}</Badge>
					: <AddButton investorId={inv.id} onAdded={() => pipe.mutate()} />}
			</div>

			{record && <PipelineRecord record={record} onChanged={() => pipe.mutate()} />}

			<div className="atlas-eyebrow" style={{ margin: record ? '32px 0 14px' : '0 0 14px' }}>{record ? 'About this investor' : ''}</div>
			<div className="atlas-kpis" style={{ marginBottom: 24 }}>
				<Tile label="Stages" value={stages} />
				<Tile label="Typical cheque size" value="Not confirmed" muted />
				<Tile label="Geography" value={geoText} />
				<Tile label="Website" value={inv.website ? <a href={inv.website} target="_blank" rel="noreferrer" style={{ color: 'var(--a-ink)', textDecoration: 'underline', textUnderlineOffset: 3 }}>Visit</a> : '—'} />
			</div>

			{inv.description && <Section title="Overview">{inv.description}</Section>}
			{thesisText && <Section title="Investment thesis">{thesisText}</Section>}

			{(() => {
				const rows = deals?.data ?? [];
				const portfolio = [...new Set(rows.map((d) => d.company_name).filter(Boolean) as string[])].slice(0, 12);
				const recent = rows.slice(0, 6);
				return <>
					{portfolio.length > 0 && (
						<Card style={{ marginBottom: 20 }}>
							<div style={{ fontSize: 17, fontFamily: 'var(--a-font)', fontWeight: 700, marginBottom: 12 }}>Portfolio</div>
							<div style={{ fontSize: 13, color: 'var(--a-muted)', lineHeight: 1.55 }}>Includes: {portfolio.join(', ')}.</div>
						</Card>
					)}
					{recent.length > 0 && (
						<Card style={{ marginBottom: 20 }}>
							<div style={{ fontSize: 17, fontFamily: 'var(--a-font)', fontWeight: 700, marginBottom: 6 }}>Recent investment activity</div>
							<div>
								{recent.map((d, i) => (
									<div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, fontSize: 13, color: 'var(--a-muted)', padding: '14px 0', borderTop: i === 0 ? 'none' : '1px solid var(--a-border)' }}>
										<span><span style={{ color: 'var(--a-ink)', fontFamily: 'var(--a-font)', fontWeight: 700 }}>{d.company_name ?? 'Company'}</span>{d.round_type_name ? ` · ${d.round_type_name}` : ''}{d.amount_usd ? ` · $${(Number(d.amount_usd) / 1e6).toFixed(1)}m` : ''}</span>
										<span style={{ color: 'var(--a-faint)', whiteSpace: 'nowrap', fontFamily: 'var(--a-mono)', fontSize: 10, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{d.announced_date ? new Date(d.announced_date).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : ''}</span>
									</div>
								))}
							</div>
						</Card>
					)}
					{!inv.description && !thesisText && portfolio.length === 0 && recent.length === 0 && <Card><div style={{ fontSize: 13, color: 'var(--a-faint)' }}>No further profile detail recorded for this investor yet.</div></Card>}
				</>;
			})()}
		</Screen>
	);
}

function AddButton({ investorId, onAdded }: { investorId: string; onAdded: () => void }) {
	const [busy, setBusy] = useState(false);
	const add = async () => {
		setBusy(true);
		try { await apiRequest('POST', '/api/raise/pipeline', { investor_id: investorId, stage: 'target' }); toast.success('Added to pipeline'); onAdded(); }
		catch (e) { toast.error((e as Error).message); }
		finally { setBusy(false); }
	};
	return <Button disabled={busy} onClick={() => void add()}>{busy ? <Loader2 className="spin" size={14} /> : 'Add to watchlist'}</Button>;
}

function PipelineRecord({ record, onChanged }: { record: Pipe; onChanged: () => void }) {
	const [f, setF] = useState<Partial<Pipe>>(record);
	const [busy, setBusy] = useState(false);
	const { data: act } = useSWR<{ data: Activity[] }>(qk.raise.pipelineActivity(record.id));
	const set = (k: keyof Pipe, v: unknown) => setF((x) => ({ ...x, [k]: v }));

	const save = async (patch: PipelineUpdate) => {
		setBusy(true);
		try { await apiRequest('PATCH', `/api/raise/pipeline/${record.id}`, patch); toast.success('Updated'); onChanged(); }
		catch (e) { toast.error((e as Error).message); }
		finally { setBusy(false); }
	};

	return (
		<Card focus glow="blue" style={{ padding: '22px 23px 24px' }}>
			<div style={{ fontSize: 18, fontFamily: 'var(--a-font)', fontWeight: 700, marginBottom: 20 }}>Your watchlist record</div>
			<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
				<Field label="Stage"><Select value={f.stage} onChange={(e) => set('stage', e.target.value)} options={STAGES} /></Field>
				<Field label="Relevant contact"><Input value={f.contact_name ?? ''} onChange={(e) => set('contact_name', e.target.value)} /></Field>
				<Field label="Potential investment (€)"><Input type="number" min={0} value={(f.potential_amount as string) ?? ''} onChange={(e) => set('potential_amount', e.target.value)} /></Field>
				<Field label="Next step"><Input value={f.next_step ?? ''} onChange={(e) => set('next_step', e.target.value)} /></Field>
				<Field label="Next step due"><Input type="date" value={f.next_step_due ?? ''} onChange={(e) => set('next_step_due', e.target.value)} /></Field>
				<Field label="Notes"><Input value={f.notes ?? ''} onChange={(e) => set('notes', e.target.value)} /></Field>
			</div>
			<div style={{ display: 'flex', gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
				<Button size="sm" disabled={busy} onClick={() => void save({ stage: f.stage, contact_name: f.contact_name || null, potential_amount: f.potential_amount || null, next_step: f.next_step || null, next_step_due: f.next_step_due || null, notes: f.notes || null })}>{busy ? <Loader2 className="spin" size={13} /> : 'Save changes'}</Button>
				<Button size="sm" variant="danger" disabled={busy} onClick={() => void save({ is_archived: true })}><Archive size={13} /> Archive investor</Button>
			</div>

			<hr className="atlas-divider" style={{ margin: '22px 0 16px' }} />
			<div className="atlas-eyebrow" style={{ marginBottom: 6 }}>Activity history</div>
			<div>
				{(act?.data ?? []).map((a, i) => (
					<div key={i} style={{ fontSize: 12, color: 'var(--a-muted)', display: 'flex', justifyContent: 'space-between', gap: 10, padding: '11px 0', borderTop: i === 0 ? 'none' : '1px solid var(--a-border)' }}>
						<span>{describe(a)}</span><span style={{ color: 'var(--a-faint)', fontFamily: 'var(--a-mono)', fontSize: 10, letterSpacing: '0.05em' }}>{new Date(a.occurred_at).toLocaleDateString()}</span>
					</div>
				))}
				{(act?.data?.length ?? 0) === 0 && <div style={{ fontSize: 12, color: 'var(--a-faint)', padding: '11px 0' }}>No activity yet.</div>}
			</div>
		</Card>
	);
}

function describe(a: Activity): string {
	if (a.type === 'created') return 'Added to watchlist';
	if (a.type === 'stage_change') return `Moved ${String(a.payload?.from ?? '')} → ${String(a.payload?.to ?? '')}`;
	if (a.type === 'commitment') return `Amount recorded: €${Number(a.payload?.amount ?? 0).toLocaleString()}`;
	return a.type;
}

function Tile({ label, value, muted }: { label: string; value: React.ReactNode; muted?: boolean }) {
	return <div className="atlas-kpi"><div className="atlas-kpi__label">{label}</div><div className="atlas-kpi__value" style={{ fontSize: 18, lineHeight: 1.3, whiteSpace: 'normal', overflowWrap: 'anywhere', marginBottom: 0, color: muted ? 'var(--a-faint)' : undefined }}>{value}</div></div>;
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
	return <Card style={{ marginBottom: 20 }}><div style={{ fontSize: 17, fontFamily: 'var(--a-font)', fontWeight: 700, marginBottom: 12 }}>{title}</div><p style={{ margin: 0, fontSize: 13, color: 'var(--a-muted)', lineHeight: 1.55 }}>{children}</p></Card>;
}
