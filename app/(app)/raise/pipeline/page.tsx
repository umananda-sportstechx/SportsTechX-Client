'use client';

import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { toast } from 'sonner';
import { Plus, X, Loader2, Archive, Search } from 'lucide-react';
import { qk } from '@/lib/query-keys';
import type { PipelineActivity as Activity, PipelineStage, PipelineUpdate } from '@/types/api';
import { apiRequest } from '@/lib/query-client';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { Button, Field, Input, Select, Textarea, Loading, Eyebrow, Logo, Flag, ListSwitcher } from '@/components/atlas';
import { RaiseSectionHeader } from '@/components/raise/raise-section-header';

/**
 * Atlas Raise — investor Watchlist, formerly "Pipeline" (mock-up 14 / Notion "Pipeline"). Route stays /raise/pipeline. Full-width
 * Kanban across the 8 stages with drag-and-drop between columns (native HTML5).
 * Click a card for the detail panel; add investors from the Atlas database or as
 * a custom entry. Board fills the content area so the horizontal scroll sits at
 * the bottom edge, not mid-screen.
 */
interface Pipe {
	id: string; investor_id: string | null; custom_name: string | null;
	investor_name: string | null; investor_slug: string | null; investor_logo_url: string | null; investor_website: string | null; stage: PipelineStage;
	contact_name: string | null; potential_amount: string | null; last_contact_at: string | null;
	next_step: string | null; next_step_due: string | null; notes: string | null; is_archived: boolean;
}


const STAGES: [PipelineStage, string][] = [
	['target', 'Target'], ['contacted', 'Contacted'], ['in_conversation', 'In conversation'],
	['due_diligence', 'Due diligence'], ['term_sheet', 'Term sheet'], ['committed', 'Committed'],
	['closed', 'Closed'], ['passed', 'Passed'],
];
const FILTERS: [string, string][] = [['', 'All'], ['overdue', 'Overdue next step'], ['no_next_step', 'No next step'], ['committed', 'Committed'], ['archived', 'Show archived']];
// Page gutters — track the Atlas Screen padding (57/56 desktop → 16 on phones).
const PAD_X = 'clamp(16px, 4vw, 56px)';
const PAD_TOP = 'clamp(24px, 4vw, 57px)';
const nameOf = (p: Pipe) => p.investor_name ?? p.custom_name ?? 'Investor';
const money = (v: string | null) => (v == null ? null : `€${Number(v).toLocaleString()}`);
const overdue = (d: string | null) => !!d && new Date(d) < new Date(new Date().toDateString());

/** Placeholder watchlists until multiple lists exist in the backend. */
const WATCHLISTS = [{ id: 'main', name: 'Main watchlist' }];

export default function RaisePipelinePage() {
	const [watchlist, setWatchlist] = useState('main');
	const initialFilter = useSearchParams().get('filter') ?? '';
	const [filter, setFilter] = useState(initialFilter);
	const [open, setOpen] = useState<Pipe | null>(null);
	const [adding, setAdding] = useState(false);
	const [dragOver, setDragOver] = useState<string | null>(null);
	const params = filter ? { filter } : {};
	const { data, isLoading, mutate } = useSWR<{ data: Pipe[] }>(qk.raise.pipeline(params));
	const rows = data?.data ?? [];
	// Unfiltered set of investor_ids already in the pipeline — used by the Add panel
	// so an active board filter can't hide an existing entry and allow a duplicate.
	const allPipe = useSWR<{ data: Pipe[] }>(qk.raise.pipeline());
	const existingIds = useMemo(() => new Set((allPipe.data?.data ?? []).map((r) => r.investor_id).filter(Boolean) as string[]), [allPipe.data]);

	const byStage = useMemo(() => {
		const m: Record<string, Pipe[]> = {};
		for (const [s] of STAGES) m[s] = [];
		for (const r of rows) (m[r.stage] ??= []).push(r);
		return m;
	}, [rows]);

	const refresh = () => void mutate();

	// Drag-and-drop: move a card to the dropped column's stage.
	const moveCard = async (id: string, stage: PipelineStage) => {
		const card = rows.find((r) => r.id === id);
		if (!card || card.stage === stage) return;
		// optimistic
		void mutate({ data: rows.map((r) => (r.id === id ? { ...r, stage } : r)) }, { revalidate: false });
		try { await apiRequest('PATCH', `/api/raise/pipeline/${id}`, { stage }); refresh(); }
		catch (e) { toast.error((e as Error).message); refresh(); }
	};

	return (
		<div style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
			<div style={{ padding: `${PAD_TOP} ${PAD_X} 18px` }}>
				<RaiseSectionHeader
					actions={<>
						{/* Placeholder: one watchlist today (the investor board). Multiple named
						    watchlists need backend support — swap WATCHLISTS for real data then. */}
						<ListSwitcher noun="watchlist" lists={WATCHLISTS.map((w) => ({ ...w, meta: String(rows.length) }))} value={watchlist} onChange={setWatchlist} createPlaceholder />
						<Button onClick={() => setAdding(true)}><Plus size={13} /> Add investor</Button>
					</>}
				/>
				<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
					<div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
						{FILTERS.map(([f, l]) => (
							<button key={f} aria-pressed={filter === f} className={filter === f ? 'atlas-btn atlas-btn--primary' : 'atlas-btn atlas-btn--outline'} onClick={() => setFilter(f)}>{l}</button>
						))}
					</div>
					<span style={{ fontSize: 13, color: 'var(--a-muted)' }}>{rows.length} investor{rows.length === 1 ? '' : 's'} in this watchlist</span>
				</div>
			</div>

			{isLoading ? <Loading /> : (
				<div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: `0 ${PAD_X} 20px` }}>
					<div style={{ display: 'flex', gap: 14, minWidth: 'max-content', height: '100%' }}>
						{STAGES.map(([s, label]) => (
							<div key={s}
								onDragOver={(e) => { e.preventDefault(); if (dragOver !== s) setDragOver(s); }}
								onDragLeave={() => setDragOver((cur) => (cur === s ? null : cur))}
								onDrop={(e) => { e.preventDefault(); setDragOver(null); const id = e.dataTransfer.getData('text/plain'); if (id) void moveCard(id, s); }}
								className="atlas-card"
								style={{ flex: '0 0 248px', minWidth: 248, display: 'flex', flexDirection: 'column', padding: '14px 12px 12px', borderColor: dragOver === s ? 'var(--a-border-strong)' : undefined }}>
								<div style={{ fontFamily: 'var(--a-mono)', fontSize: 11, letterSpacing: '0.05em', textTransform: 'uppercase', padding: '0 4px 12px', marginBottom: 10, borderBottom: '1px solid var(--a-border)', display: 'flex', justifyContent: 'space-between', gap: 8, color: 'var(--a-ink)' }}>
									<span>{label}</span><span style={{ color: 'var(--a-faint)' }}>{byStage[s]?.length ?? 0}</span>
								</div>
								<div style={{ display: 'grid', gap: 8, gridAutoRows: 'min-content', minHeight: 60, flex: 1, borderRadius: 'var(--a-radius-sm)', background: dragOver === s ? 'var(--a-navy-soft)' : 'transparent', outline: dragOver === s ? '1px dashed var(--a-navy)' : 'none', padding: dragOver === s ? 6 : 0, transition: 'background 0.1s' }}>
									{(byStage[s] ?? []).length === 0 && dragOver !== s
										? <div style={{ border: '1px dashed var(--a-border-strong)', borderRadius: 'var(--a-radius-sm)', padding: '14px 10px', textAlign: 'center', fontFamily: 'var(--a-mono)', fontSize: 10, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--a-faint)' }}>No investors yet</div>
										: (byStage[s] ?? []).map((p) => (
											<div key={p.id} draggable
												onDragStart={(e) => { e.dataTransfer.setData('text/plain', p.id); e.dataTransfer.effectAllowed = 'move'; }}
												onClick={() => setOpen(p)}
												style={{ textAlign: 'left', cursor: 'grab', background: 'var(--a-field)', border: '1px solid var(--a-border)', borderRadius: 'var(--a-radius-sm)', padding: 12 }}>
												<div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}>
													<Logo co={{ name: nameOf(p), website: p.investor_website, custom_logo_url: p.investor_logo_url }} size={28} radius={7} />
													<div style={{ fontFamily: 'var(--a-font)', fontWeight: 700, fontSize: 13, color: 'var(--a-ink)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nameOf(p)}</div>
												</div>
												<div style={{ fontSize: 11, color: 'var(--a-muted)', lineHeight: 1.45 }}>{p.contact_name ? `Contact: ${p.contact_name}` : 'No contact yet'}</div>
												{p.potential_amount && <div style={{ fontFamily: 'var(--a-mono)', fontSize: 10, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--a-navy)', marginTop: 6 }}>{money(p.potential_amount)} potential</div>}
												{p.next_step && <div style={{ fontSize: 11, lineHeight: 1.45, color: overdue(p.next_step_due) ? 'var(--a-danger)' : 'var(--a-muted)', marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--a-border)' }}>
													Next: {p.next_step}{p.next_step_due ? ` · ${new Date(p.next_step_due).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}` : ''}{overdue(p.next_step_due) ? ' — overdue' : ''}
												</div>}
											</div>
										))}
								</div>
							</div>
						))}
					</div>
				</div>
			)}

			{open && <DetailPanel row={open} onClose={() => setOpen(null)} onSaved={() => { refresh(); setOpen(null); }} />}
			{adding && <AddPanel onClose={() => setAdding(false)} onSaved={() => { refresh(); void allPipe.mutate(); setAdding(false); }} existing={existingIds} />}
		</div>
	);
}

function DetailPanel({ row, onClose, onSaved }: { row: Pipe; onClose: () => void; onSaved: () => void }) {
	const [f, setF] = useState<Partial<Pipe>>(row);
	const [busy, setBusy] = useState(false);
	const { data: act } = useSWR<{ data: Activity[] }>(qk.raise.pipelineActivity(row.id));
	const set = (k: keyof Pipe, v: unknown) => setF((x) => ({ ...x, [k]: v }));

	const save = async (patch: PipelineUpdate) => {
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
			<div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
				<Button disabled={busy} onClick={() => void save({
					stage: f.stage, contact_name: f.contact_name || null, potential_amount: f.potential_amount || null,
					next_step: f.next_step || null, next_step_due: f.next_step_due || null, notes: f.notes || null,
				})}>{busy ? <Loader2 className="spin" size={13} /> : 'Save'}</Button>
				<Button variant="ghost" disabled={busy} onClick={() => void save({ is_archived: true })}><Archive size={13} /> Archive</Button>
			</div>

			<div style={{ marginTop: 24 }}>
				<div style={{ marginBottom: 10 }}><Eyebrow>Activity</Eyebrow></div>
				<div className="atlas-card" style={{ padding: 0, overflow: 'hidden' }}>
					{(act?.data ?? []).map((a, i) => (
						<div key={i} style={{ fontSize: 12, color: 'var(--a-muted)', lineHeight: 1.55, display: 'flex', justifyContent: 'space-between', gap: 10, padding: '11px 16px', borderTop: i === 0 ? 'none' : '1px solid var(--a-border)' }}>
							<span>{describe(a)}</span><span style={{ fontFamily: 'var(--a-mono)', fontSize: 10, letterSpacing: '0.05em', color: 'var(--a-faint)', whiteSpace: 'nowrap' }}>{new Date(a.occurred_at).toLocaleDateString()}</span>
						</div>
					))}
					{(act?.data?.length ?? 0) === 0 && <div style={{ fontSize: 12, color: 'var(--a-faint)', padding: '11px 16px' }}>No activity yet.</div>}
				</div>
			</div>
		</Drawer>
	);
}

interface Inv { id: string; name: string; category: string | null; hq_country: string | null; website: string | null; logo_url: string | null }
function AddPanel({ onClose, onSaved, existing }: { onClose: () => void; onSaved: () => void; existing: Set<string> }) {
	const [q, setQ] = useState('');
	const dq = useDebouncedValue(q);
	const [name, setName] = useState('');
	const [busy, setBusy] = useState(false);
	const results = useSWR<{ data: Inv[] }>(dq.trim().length >= 2 ? qk.investors.list({ q: dq, limit: 8 }) : null);

	const addDb = async (inv: Inv) => {
		if (existing.has(inv.id) || busy) return;
		setBusy(true);
		try { await apiRequest('POST', '/api/raise/pipeline', { investor_id: inv.id, stage: 'target' }); toast.success(`${inv.name} added`); onSaved(); }
		catch (e) { toast.error((e as Error).message); setBusy(false); }
	};
	const addCustom = async () => {
		if (!name.trim() || busy) return;
		setBusy(true);
		try { await apiRequest('POST', '/api/raise/pipeline', { custom_name: name.trim(), stage: 'target' }); onSaved(); }
		catch (e) { toast.error((e as Error).message); setBusy(false); }
	};

	return (
		<Drawer onClose={onClose} title="Add investor">
			<div style={{ marginBottom: 8 }}><Eyebrow>From the Atlas database</Eyebrow></div>
			<div style={{ fontSize: 12, color: 'var(--a-muted)', lineHeight: 1.55, marginBottom: 12 }}>Search the investor database — adds with a full profile.</div>
			<div style={{ position: 'relative' }}>
				<Search size={13} style={{ position: 'absolute', left: 12, top: 8, color: 'var(--a-ink)', pointerEvents: 'none' }} />
				<Input className="atlas-input--search" placeholder="Search investors by name…" value={q} onChange={(e) => setQ(e.target.value)} style={{ paddingLeft: 31 }} autoFocus />
			</div>
			{dq.trim().length >= 2 && (
				<div className="atlas-card" style={{ marginTop: 10, padding: 0, overflow: 'hidden' }}>
					{results.isLoading ? <div style={{ padding: 12, fontSize: 13, color: 'var(--a-faint)' }}>Searching…</div>
						: (results.data?.data.length ?? 0) === 0 ? <div style={{ padding: 12, fontSize: 13, color: 'var(--a-faint)' }}>No investors found.</div>
							: results.data!.data.map((inv) => {
								const added = existing.has(inv.id);
								return (
									<button key={inv.id} onClick={() => void addDb(inv)} disabled={added || busy}
										style={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '10px 14px', background: 'none', border: 'none', borderBottom: '1px solid var(--a-border)', cursor: added ? 'default' : 'pointer', textAlign: 'left', color: 'inherit', font: 'inherit' }}>
										<span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
										<Logo co={{ name: inv.name, website: inv.website, custom_logo_url: inv.logo_url }} size={24} radius={6} />
										<span style={{ fontFamily: 'var(--a-font)', fontWeight: 700, fontSize: 13, color: 'var(--a-ink)' }}>{inv.name}</span>
										{inv.hq_country && <Flag cc={inv.hq_country} size={13} />}
										{inv.category && <span style={{ fontFamily: 'var(--a-mono)', fontSize: 9, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--a-faint)' }}>{inv.category}</span>}
									</span>
										<span style={{ fontFamily: 'var(--a-mono)', fontSize: 10, letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap', color: added ? 'var(--a-faint)' : 'var(--a-ink)' }}>{added ? 'In watchlist' : '+ Add'}</span>
									</button>
								);
							})}
				</div>
			)}

			<hr className="atlas-divider" style={{ margin: '24px 0' }} />
			<div style={{ marginBottom: 8 }}><Eyebrow>Or add a custom investor</Eyebrow></div>
			<div style={{ fontSize: 12, color: 'var(--a-muted)', lineHeight: 1.55, marginBottom: 12 }}>For an investor not yet in the Atlas database.</div>
			<Field label="Investor name"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
			<div style={{ marginTop: 14 }}><Button variant="outline" disabled={busy || !name.trim()} onClick={() => void addCustom()}>{busy ? <Loader2 className="spin" size={13} /> : 'Add custom investor'}</Button></div>
		</Drawer>
	);
}

function describe(a: Activity): string {
	if (a.type === 'created') return 'Added to watchlist';
	if (a.type === 'stage_change') return `Moved ${String(a.payload?.from ?? '')} → ${String(a.payload?.to ?? '')}`;
	if (a.type === 'commitment') return `Amount recorded: €${Number(a.payload?.amount ?? 0).toLocaleString()}`;
	return a.type;
}

function Drawer({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
	return (
		<div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50, display: 'flex', justifyContent: 'flex-end' }}>
			<div className="atlas" onClick={(e) => e.stopPropagation()} style={{ width: 'min(440px, 100%)', height: '100%', background: 'var(--a-page)', borderLeft: '1px solid var(--a-card-border)', boxShadow: '-12px 0 40px rgba(0,0,0,0.12)', padding: 28, overflowY: 'auto' }}>
				<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingBottom: 18, marginBottom: 22, borderBottom: '1px solid var(--a-border)' }}>
					<div className="atlas-h2" style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
					<button className="atlas-btn atlas-btn--ghost atlas-btn--sm" aria-label="Close" onClick={onClose}><X size={16} /></button>
				</div>
				{children}
			</div>
		</div>
	);
}
