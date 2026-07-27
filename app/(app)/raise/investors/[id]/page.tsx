'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, Archive } from 'lucide-react';
import { qk } from '@/lib/query-keys';
import { apiRequest } from '@/lib/query-client';
import { Screen, Card, Badge, Button, Field, Input, Select, Loading } from '@/components/atlas/kit';

/**
 * Atlas Raise — Investor profile (mock-ups 12/13 / canvas isProfileBaseline &
 * isProfileNorthgate). One page, two states: not-in-pipeline (Add to pipeline)
 * and in-pipeline (your pipeline record + activity). Wired to GET /api/investors/:id
 * and the founder's raise pipeline.
 */
interface Investor {
	id: string; name: string; slug: string | null; category: string | null; description: string | null;
	website: string | null; hq_country: string | null; hq_city: string | null; hq_region: string | null;
	thesis?: string | null; round_types?: Array<{ name: string }>;
}
interface Pipe {
	id: string; investor_id: string | null; stage: string; contact_name: string | null;
	potential_amount: string | null; last_contact_at: string | null; next_step: string | null;
	next_step_due: string | null; notes: string | null;
}
interface Activity { type: string; payload: Record<string, unknown> | null; occurred_at: string }

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
	const { data: inv, isLoading } = useSWR<Investor>(qk.investors.detail(id));
	const pipe = useSWR<{ data: Pipe[] }>(qk.raise.pipeline());
	const record = useMemo(() => (pipe.data?.data ?? []).find((r) => r.investor_id === id) ?? null, [pipe.data, id]);

	if (isLoading || !inv) return <Screen><Loading /></Screen>;

	const stages = inv.round_types?.map((r) => r.name).join(', ') || 'Not specified';

	return (
		<Screen>
			<button onClick={() => router.back()} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--a-muted)', fontSize: 18, padding: 0, display: 'inline-flex' }} aria-label="Back"><ArrowLeft size={18} /></button>

			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20, marginTop: 20 }}>
				<div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
					<div style={{ width: 48, height: 48, borderRadius: 10, background: 'var(--a-inset)', display: 'grid', placeItems: 'center', fontSize: 16, fontWeight: 600, color: 'var(--a-muted)' }}>{inv.name.charAt(0)}</div>
					<div>
						<div style={{ fontSize: 20, fontWeight: 600 }}>{inv.name}</div>
						<div style={{ fontSize: 13, color: 'var(--a-faint)', marginTop: 4 }}>{[inv.category, geoOf(inv)].filter(Boolean).join(' · ')}</div>
					</div>
				</div>
				{record
					? <Badge tone="navy">{STAGE_LABEL[record.stage] ?? record.stage}</Badge>
					: <AddButton investorId={inv.id} onAdded={() => pipe.mutate()} />}
			</div>

			{record && <PipelineRecord record={record} onChanged={() => pipe.mutate()} />}

			<div style={{ fontSize: 15, fontWeight: 600, margin: record ? '30px 0 14px' : '24px 0 14px' }}>{record ? 'About this investor' : ''}</div>
			<div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 14, marginBottom: 16 }}>
				<Tile label="Stages" value={stages} />
				<Tile label="Typical cheque size" value="Not confirmed" muted />
				<Tile label="Geography" value={[inv.hq_country, inv.hq_region].filter(Boolean).join(', ') || '—'} />
				<Tile label="Website" value={inv.website ? <a href={inv.website} target="_blank" rel="noreferrer" style={{ color: 'var(--a-navy)' }}>Visit</a> : '—'} />
			</div>

			{inv.description && <Section title="Overview">{inv.description}</Section>}
			{inv.thesis && <Section title="Investment thesis">{inv.thesis}</Section>}
			{!inv.description && !inv.thesis && <Card><div style={{ fontSize: 13, color: 'var(--a-faint)' }}>No further profile detail recorded for this investor yet.</div></Card>}
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
	return <Button disabled={busy} onClick={() => void add()}>{busy ? <Loader2 className="spin" size={14} /> : 'Add to pipeline'}</Button>;
}

function PipelineRecord({ record, onChanged }: { record: Pipe; onChanged: () => void }) {
	const [f, setF] = useState<Partial<Pipe>>(record);
	const [busy, setBusy] = useState(false);
	const { data: act } = useSWR<{ data: Activity[] }>(qk.raise.pipelineActivity(record.id));
	const set = (k: keyof Pipe, v: unknown) => setF((x) => ({ ...x, [k]: v }));

	const save = async (patch: Record<string, unknown>) => {
		setBusy(true);
		try { await apiRequest('PATCH', `/api/raise/pipeline/${record.id}`, patch); toast.success('Updated'); onChanged(); }
		catch (e) { toast.error((e as Error).message); }
		finally { setBusy(false); }
	};

	return (
		<Card focus style={{ marginTop: 24, padding: '20px 20px 24px' }}>
			<div style={{ fontSize: 15, fontWeight: 600, marginBottom: 18 }}>Your pipeline record</div>
			<div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 16 }}>
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

			<div style={{ height: 1, background: 'var(--a-border)', margin: '22px 0 18px' }} />
			<div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Activity history</div>
			<div style={{ display: 'grid', gap: 8 }}>
				{(act?.data ?? []).map((a, i) => (
					<div key={i} style={{ fontSize: 12, color: 'var(--a-muted)', display: 'flex', justifyContent: 'space-between', gap: 10 }}>
						<span>{describe(a)}</span><span style={{ color: 'var(--a-faint)' }}>{new Date(a.occurred_at).toLocaleDateString()}</span>
					</div>
				))}
				{(act?.data?.length ?? 0) === 0 && <div style={{ fontSize: 12, color: 'var(--a-faint)' }}>No activity yet.</div>}
			</div>
		</Card>
	);
}

function describe(a: Activity): string {
	if (a.type === 'created') return 'Added to pipeline';
	if (a.type === 'stage_change') return `Moved ${String(a.payload?.from ?? '')} → ${String(a.payload?.to ?? '')}`;
	if (a.type === 'commitment') return `Amount recorded: €${Number(a.payload?.amount ?? 0).toLocaleString()}`;
	return a.type;
}

function Tile({ label, value, muted }: { label: string; value: React.ReactNode; muted?: boolean }) {
	return <div className="atlas-stat"><div className="atlas-stat__label">{label}</div><div className="atlas-stat__value" style={{ fontSize: 13, fontWeight: 500, color: muted ? 'var(--a-faint)' : undefined }}>{value}</div></div>;
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
	return <Card style={{ marginBottom: 16 }}><div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>{title}</div><p style={{ margin: 0, fontSize: 13, color: 'var(--a-muted)', lineHeight: 1.5 }}>{children}</p></Card>;
}
