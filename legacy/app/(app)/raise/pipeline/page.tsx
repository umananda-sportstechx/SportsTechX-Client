'use client';

import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { toast } from 'sonner';
import { Plus, X, Loader2, Archive } from 'lucide-react';
import { Page } from '@/components/ui/atoms';
import { qk } from '@/lib/query-keys';
import { apiRequest } from '@/lib/query-client';

/**
 * Atlas Raise — investor Pipeline (Notion "Pipeline"). Kanban across the 8
 * stages; click a card to open the detail panel (move stage, next step, amount,
 * notes, archive). Board filters mirror the Home attention deep-links.
 *
 * v1 uses a stage <select> in the detail panel rather than drag-and-drop.
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
const FILTERS: [string, string][] = [['', 'All'], ['overdue', 'Overdue'], ['no_next_step', 'No next step'], ['committed', 'Committed']];
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
		<Page>
			<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 'var(--space-4)' }}>
				<h1 style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>Pipeline</h1>
				<div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
					{FILTERS.map(([f, l]) => (
						<button key={f} className={`btn ghost ${filter === f ? 'active' : ''}`} style={filter === f ? { borderColor: 'var(--accent)', color: 'var(--accent)' } : undefined} onClick={() => setFilter(f)}>{l}</button>
					))}
					<button className="btn" onClick={() => setAdding(true)}><Plus size={13} /> Add investor</button>
				</div>
			</div>

			{isLoading ? <div style={{ display: 'grid', placeItems: 'center', minHeight: 300 }}><Loader2 className="spin" size={22} /></div> : (
				<div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 12 }}>
					{STAGES.map(([s, label]) => (
						<div key={s} style={{ flex: '0 0 240px', minWidth: 240 }}>
							<div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--fg-muted)', marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
								<span>{label}</span><span>{byStage[s]?.length ?? 0}</span>
							</div>
							<div style={{ display: 'grid', gap: 8, minHeight: 40 }}>
								{(byStage[s] ?? []).map((p) => (
									<button key={p.id} className="card" style={{ padding: 12, textAlign: 'left', cursor: 'pointer', border: '1px solid var(--border)' }} onClick={() => setOpen(p)}>
										<div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{nameOf(p)}</div>
										{p.contact_name && <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{p.contact_name}</div>}
										{p.potential_amount && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent)', marginTop: 4 }}>{money(p.potential_amount)}</div>}
										{p.next_step && <div style={{ fontSize: 12, color: overdue(p.next_step_due) ? 'var(--danger, #dc2626)' : 'var(--fg-2)', marginTop: 6 }}>
											{p.next_step}{p.next_step_due ? ` · ${new Date(p.next_step_due).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}` : ''}
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
		</Page>
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
			<Field label="Stage">
				<select style={inputStyle} value={f.stage} onChange={(e) => set('stage', e.target.value)}>
					{STAGES.map(([s, l]) => <option key={s} value={s}>{l}</option>)}
				</select>
			</Field>
			<Field label="Contact"><input style={inputStyle} value={f.contact_name ?? ''} onChange={(e) => set('contact_name', e.target.value)} /></Field>
			<Field label="Potential amount (€)"><input type="number" min={0} style={inputStyle} value={(f.potential_amount as string) ?? ''} onChange={(e) => set('potential_amount', e.target.value)} /></Field>
			<Field label="Next step"><input style={inputStyle} value={f.next_step ?? ''} onChange={(e) => set('next_step', e.target.value)} /></Field>
			<Field label="Next step due"><input type="date" style={inputStyle} value={f.next_step_due ?? ''} onChange={(e) => set('next_step_due', e.target.value)} /></Field>
			<Field label="Notes"><textarea style={{ ...inputStyle, height: 80, padding: 10 }} value={f.notes ?? ''} onChange={(e) => set('notes', e.target.value)} /></Field>

			<div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
				<button className="btn" disabled={busy} onClick={() => void save({
					stage: f.stage, contact_name: f.contact_name || null, potential_amount: f.potential_amount || null,
					next_step: f.next_step || null, next_step_due: f.next_step_due || null, notes: f.notes || null,
				})}>{busy ? <Loader2 className="spin" size={13} /> : 'Save'}</button>
				<button className="btn ghost" disabled={busy} onClick={() => void save({ is_archived: true })}><Archive size={13} /> Archive</button>
			</div>

			<div style={{ marginTop: 24 }}>
				<div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--fg-muted)', marginBottom: 10 }}>Activity</div>
				<div style={{ display: 'grid', gap: 8 }}>
					{(act?.data ?? []).map((a, i) => (
						<div key={i} style={{ fontSize: 12, color: 'var(--fg-2)', display: 'flex', justifyContent: 'space-between', gap: 10 }}>
							<span>{describe(a)}</span><span style={{ color: 'var(--fg-muted)', whiteSpace: 'nowrap' }}>{new Date(a.occurred_at).toLocaleDateString()}</span>
						</div>
					))}
					{(act?.data?.length ?? 0) === 0 && <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>No activity yet.</div>}
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
			<div style={{ fontSize: 13, color: 'var(--fg-2)', marginBottom: 12 }}>Add a custom investor to your pipeline. Use the Investors page to add matched investors with full profiles.</div>
			<Field label="Investor name"><input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} autoFocus /></Field>
			<button className="btn" disabled={busy || !name.trim()} onClick={() => void add()}>{busy ? <Loader2 className="spin" size={13} /> : 'Add to pipeline'}</button>
		</Drawer>
	);
}

function describe(a: Activity): string {
	if (a.type === 'created') return 'Added to pipeline';
	if (a.type === 'stage_change') return `Moved ${String(a.payload?.from ?? '')} → ${String(a.payload?.to ?? '')}`;
	if (a.type === 'commitment') return `Amount recorded: €${Number(a.payload?.amount ?? 0).toLocaleString()}`;
	return a.type;
}

// ── shared drawer + field ────────────────────────────────────────────────────
function Drawer({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
	return (
		<div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50, display: 'flex', justifyContent: 'flex-end' }}>
			<div onClick={(e) => e.stopPropagation()} style={{ width: 'min(440px, 100%)', height: '100%', background: 'var(--bg-1)', borderLeft: '1px solid var(--border)', padding: 'var(--space-5)', overflowY: 'auto' }}>
				<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
					<h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, margin: 0 }}>{title}</h2>
					<button className="btn ghost" onClick={onClose}><X size={16} /></button>
				</div>
				{children}
			</div>
		</div>
	);
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
	return <div style={{ marginBottom: 14 }}><div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-2)', marginBottom: 6 }}>{label}</div>{children}</div>;
}
const inputStyle: React.CSSProperties = { width: '100%', height: 38, padding: '0 12px', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--fg)', fontSize: 14, fontFamily: 'inherit' };
