'use client';

import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { toast } from 'sonner';
import { Plus, X, Loader2, Archive } from 'lucide-react';
import { qk } from '@/lib/query-keys';
import { apiRequest } from '@/lib/query-client';
import { Screen, H1, Button, Field, Input, Select, Textarea, Loading } from '@/components/atlas/kit';

/**
 * Atlas Raise — investor Pipeline (mock-up 14 / Notion "Pipeline"). Kanban across
 * the 8 stages; click a card to open the detail panel (move stage, next step,
 * amount, notes, archive). v1 uses a stage <select>, not drag-and-drop.
 */
interface Pipe {
	id: string; investor_id: string | null; custom_name: string | null;
	investor_name: string | null; investor_slug: string | null; stage: string;
	contact_name: string | null; potential_amount: string | null; last_contact_at: string | null;
	next_step: string | null; next_step_due: string | null; notes: string | null; is_archived: boolean;
}
interface Activity { type: string; payload: Record<string, unknown> | null; occurred_at: string }

const STAGES: [string, string][] = [
	['target', 'Target'], ['contacted', 'Contacted'], ['in_conversation', 'In conversation'],
	['due_diligence', 'Due diligence'], ['term_sheet', 'Term sheet'], ['committed', 'Committed'],
	['closed', 'Closed'], ['passed', 'Passed'],
];
const FILTERS: [string, string][] = [['', 'All'], ['overdue', 'Overdue next step'], ['no_next_step', 'No next step'], ['committed', 'Committed']];
const nameOf = (p: Pipe) => p.investor_name ?? p.custom_name ?? 'Investor';
const money = (v: string | null) => (v == null ? null : `€${Number(v).toLocaleString()}`);
const overdue = (d: string | null) => !!d && new Date(d) < new Date(new Date().toDateString());

export default function RaisePipelinePage() {
	const initialFilter = useSearchParams().get('filter') ?? '';
	const [filter, setFilter] = useState(initialFilter);
	const [open, setOpen] = useState<Pipe | null>(null);
	const [adding, setAdding] = useState(false);
	const params = filter ? { filter } : {};
	const { data, isLoading, mutate } = useSWR<{ data: Pipe[] }>(qk.raise.pipeline(params));
	const rows = data?.data ?? [];

	const byStage = useMemo(() => {
		const m: Record<string, Pipe[]> = {};
		for (const [s] of STAGES) m[s] = [];
		for (const r of rows) (m[r.stage] ??= []).push(r);
		return m;
	}, [rows]);

	const refresh = () => void mutate();

	return (
		<Screen width={1400}>
			<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
				<H1>Pipeline</H1>
				<Button size="sm" onClick={() => setAdding(true)}><Plus size={13} /> Add investor</Button>
			</div>

			<div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
				{FILTERS.map(([f, l]) => (
					<button key={f} aria-pressed={filter === f} className={`atlas-btn atlas-btn--outline atlas-btn--sm`} style={filter === f ? { borderColor: 'var(--a-navy)', color: 'var(--a-navy)' } : undefined} onClick={() => setFilter(f)}>{l}</button>
				))}
			</div>
			<div style={{ fontSize: 12, color: 'var(--a-faint)', marginBottom: 16 }}>{rows.length} investor{rows.length === 1 ? '' : 's'} in pipeline</div>

			{isLoading ? <Loading /> : (
				<div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 12 }}>
					{STAGES.map(([s, label]) => (
						<div key={s} style={{ flex: '0 0 236px', minWidth: 236 }}>
							<div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, display: 'flex', justifyContent: 'space-between', color: 'var(--a-ink)' }}>
								<span>{label}</span><span style={{ color: 'var(--a-faint)' }}>{byStage[s]?.length ?? 0}</span>
							</div>
							<div style={{ display: 'grid', gap: 8, minHeight: 44 }}>
								{(byStage[s] ?? []).length === 0
									? <div style={{ border: '1px dashed var(--a-border)', borderRadius: 8, padding: '14px 10px', textAlign: 'center', fontSize: 11, color: 'var(--a-faint)' }}>No investors yet</div>
									: (byStage[s] ?? []).map((p) => (
										<button key={p.id} onClick={() => setOpen(p)} style={{ textAlign: 'left', cursor: 'pointer', background: 'var(--a-rail)', border: '1px solid var(--a-border)', borderRadius: 8, padding: 12 }}>
											<div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{nameOf(p)}</div>
											<div style={{ fontSize: 11, color: 'var(--a-faint)' }}>{p.contact_name ? `Contact: ${p.contact_name}` : 'No contact yet'}</div>
											{p.potential_amount && <div style={{ fontSize: 11, color: 'var(--a-navy)', marginTop: 4 }}>{money(p.potential_amount)} potential</div>}
											{p.next_step && <div style={{ fontSize: 11, color: overdue(p.next_step_due) ? 'var(--a-danger)' : 'var(--a-muted)', marginTop: 6 }}>
												Next: {p.next_step}{p.next_step_due ? ` · ${new Date(p.next_step_due).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}` : ''}{overdue(p.next_step_due) ? ' — overdue' : ''}
											</div>}
										</button>
									))}
							</div>
						</div>
					))}
				</div>
			)}

			{open && <DetailPanel row={open} onClose={() => setOpen(null)} onSaved={() => { refresh(); setOpen(null); }} />}
			{adding && <AddPanel onClose={() => setAdding(false)} onSaved={() => { refresh(); setAdding(false); }} />}
		</Screen>
	);
}

function DetailPanel({ row, onClose, onSaved }: { row: Pipe; onClose: () => void; onSaved: () => void }) {
	const [f, setF] = useState<Partial<Pipe>>(row);
	const [busy, setBusy] = useState(false);
	const { data: act } = useSWR<{ data: Activity[] }>(qk.raise.pipelineActivity(row.id));
	const set = (k: keyof Pipe, v: unknown) => setF((x) => ({ ...x, [k]: v }));

	const save = async (patch: Record<string, unknown>) => {
		setBusy(true);
		try { await apiRequest('PATCH', `/api/raise/pipeline/${row.id}`, patch); onSaved(); }
		catch (e) { toast.error((e as Error).message); setBusy(false); }
	};

	return (
		<Drawer onClose={onClose} title={nameOf(row)}>
			<div style={{ display: 'grid', gap: 14 }}>
				<Field label="Stage"><Select value={f.stage} onChange={(e) => set('stage', e.target.value)} options={STAGES} /></Field>
				<Field label="Contact"><Input value={f.contact_name ?? ''} onChange={(e) => set('contact_name', e.target.value)} /></Field>
				<Field label="Potential amount (€)"><Input type="number" min={0} value={(f.potential_amount as string) ?? ''} onChange={(e) => set('potential_amount', e.target.value)} /></Field>
				<Field label="Next step"><Input value={f.next_step ?? ''} onChange={(e) => set('next_step', e.target.value)} /></Field>
				<Field label="Next step due"><Input type="date" value={f.next_step_due ?? ''} onChange={(e) => set('next_step_due', e.target.value)} /></Field>
				<Field label="Notes"><Textarea value={f.notes ?? ''} onChange={(e) => set('notes', e.target.value)} /></Field>
			</div>
			<div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
				<Button disabled={busy} onClick={() => void save({
					stage: f.stage, contact_name: f.contact_name || null, potential_amount: f.potential_amount || null,
					next_step: f.next_step || null, next_step_due: f.next_step_due || null, notes: f.notes || null,
				})}>{busy ? <Loader2 className="spin" size={13} /> : 'Save'}</Button>
				<Button variant="ghost" disabled={busy} onClick={() => void save({ is_archived: true })}><Archive size={13} /> Archive</Button>
			</div>

			<div style={{ marginTop: 24 }}>
				<div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--a-faint)', marginBottom: 10, fontFamily: 'var(--a-mono)' }}>Activity</div>
				<div style={{ display: 'grid', gap: 8 }}>
					{(act?.data ?? []).map((a, i) => (
						<div key={i} style={{ fontSize: 12, color: 'var(--a-muted)', display: 'flex', justifyContent: 'space-between', gap: 10 }}>
							<span>{describe(a)}</span><span style={{ color: 'var(--a-faint)', whiteSpace: 'nowrap' }}>{new Date(a.occurred_at).toLocaleDateString()}</span>
						</div>
					))}
					{(act?.data?.length ?? 0) === 0 && <div style={{ fontSize: 12, color: 'var(--a-faint)' }}>No activity yet.</div>}
				</div>
			</div>
		</Drawer>
	);
}

function AddPanel({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
	const [name, setName] = useState('');
	const [busy, setBusy] = useState(false);
	const add = async () => {
		if (!name.trim()) return;
		setBusy(true);
		try { await apiRequest('POST', '/api/raise/pipeline', { custom_name: name.trim(), stage: 'target' }); onSaved(); }
		catch (e) { toast.error((e as Error).message); setBusy(false); }
	};
	return (
		<Drawer onClose={onClose} title="Add investor">
			<div style={{ fontSize: 13, color: 'var(--a-muted)', marginBottom: 12 }}>Add a custom investor to your pipeline. Use the Investors page to add matched investors with full profiles.</div>
			<Field label="Investor name"><Input value={name} onChange={(e) => setName(e.target.value)} autoFocus /></Field>
			<div style={{ marginTop: 14 }}><Button disabled={busy || !name.trim()} onClick={() => void add()}>{busy ? <Loader2 className="spin" size={13} /> : 'Add to pipeline'}</Button></div>
		</Drawer>
	);
}

function describe(a: Activity): string {
	if (a.type === 'created') return 'Added to pipeline';
	if (a.type === 'stage_change') return `Moved ${String(a.payload?.from ?? '')} → ${String(a.payload?.to ?? '')}`;
	if (a.type === 'commitment') return `Amount recorded: €${Number(a.payload?.amount ?? 0).toLocaleString()}`;
	return a.type;
}

function Drawer({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
	return (
		<div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50, display: 'flex', justifyContent: 'flex-end' }}>
			<div className="atlas" onClick={(e) => e.stopPropagation()} style={{ width: 'min(440px, 100%)', height: '100%', background: 'var(--a-page)', borderLeft: '1px solid var(--a-border)', padding: 28, overflowY: 'auto' }}>
				<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
					<div style={{ fontSize: 18, fontWeight: 600 }}>{title}</div>
					<button className="atlas-btn atlas-btn--ghost atlas-btn--sm" aria-label="Close" onClick={onClose}><X size={16} /></button>
				</div>
				{children}
			</div>
		</div>
	);
}
