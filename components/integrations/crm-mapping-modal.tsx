'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { qk } from '@/lib/query-keys';
import { apiRequest } from '@/lib/query-client';

/**
 * Field-mapping editor for one CRM connection. Per STX dataset (companies,
 * deals, …) the user names the remote object/collection and maps each exportable
 * column → a remote field, marking one column as the upsert match key. Saving
 * PUTs the full mapping set (the endpoint replaces all mappings for the
 * connection), then the sync engine consumes it.
 */

const ENTITIES: { key: string; label: string }[] = [
	{ key: 'companies', label: 'Companies' },
	{ key: 'deals', label: 'Deal flow' },
	{ key: 'investors', label: 'Investors' },
	{ key: 'acquisitions', label: 'M&A' },
	{ key: 'programs', label: 'Programs' },
	{ key: 'events', label: 'Events' },
];

// Sensible default remote-object slug per provider+entity (user can override).
const DEFAULT_REMOTE_OBJECT: Record<string, Record<string, string>> = {
	attio: { companies: 'companies', investors: 'companies', deals: 'deals', acquisitions: 'deals', programs: 'companies', events: 'companies' },
};

interface ColumnsResp { columns: { key: string; label: string }[] }
interface MappingRow {
	stx_entity_type: string; stx_column: string;
	remote_entity_type: string; remote_field: string; is_match_key: boolean;
}
interface MappingsResp { mappings: MappingRow[] }

type RowState = { include: boolean; remoteField: string; isMatch: boolean };
type EntityState = { remoteObject: string; rows: Record<string, RowState> };

export function CrmMappingModal({
	connectionId, provider, onClose, onSaved,
}: { connectionId: string; provider: string; onClose: () => void; onSaved: () => void }) {
	const { data: existing, isLoading } = useSWR<MappingsResp>(qk.integrations.crmMappings(connectionId), { revalidateOnFocus: false });
	const [state, setState] = useState<Record<string, EntityState>>({});
	const [saving, setSaving] = useState(false);

	// Seed editor state from the saved mappings once they load.
	useEffect(() => {
		if (!existing) return;
		const next: Record<string, EntityState> = {};
		for (const e of ENTITIES) {
			const ms = existing.mappings.filter((m) => m.stx_entity_type === e.key);
			next[e.key] = {
				remoteObject: ms[0]?.remote_entity_type ?? DEFAULT_REMOTE_OBJECT[provider]?.[e.key] ?? '',
				rows: Object.fromEntries(ms.map((m) => [m.stx_column, { include: true, remoteField: m.remote_field, isMatch: m.is_match_key }])),
			};
		}
		setState(next);
	}, [existing, provider]);

	const setEntity = (entity: string, patch: Partial<EntityState>) =>
		setState((s) => ({ ...s, [entity]: { remoteObject: s[entity]?.remoteObject ?? '', rows: s[entity]?.rows ?? {}, ...patch } }));

	const save = async () => {
		const mappings: MappingRow[] = [];
		for (const e of ENTITIES) {
			const es = state[e.key];
			if (!es) continue;
			const included = Object.entries(es.rows).filter(([, r]) => r.include && r.remoteField.trim());
			if (included.length === 0) continue;
			if (!es.remoteObject.trim()) {
				toast.error(`Set the remote object for ${e.label}.`);
				return;
			}
			for (const [col, r] of included) {
				mappings.push({
					stx_entity_type: e.key, stx_column: col,
					remote_entity_type: es.remoteObject.trim(), remote_field: r.remoteField.trim(), is_match_key: r.isMatch,
				});
			}
		}
		if (mappings.length === 0) { toast.error('Map at least one column.'); return; }
		setSaving(true);
		try {
			await apiRequest('PUT', `/api/integrations/crm/${connectionId}/mappings`, { mappings });
			toast.success('Field mappings saved.');
			onSaved();
		} catch (e) {
			toast.error((e as Error).message);
		} finally {
			setSaving(false);
		}
	};

	return (
		<DialogPrimitive.Root open onOpenChange={(o) => { if (!o) onClose(); }}>
			<DialogPrimitive.Portal>
				<DialogPrimitive.Overlay style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)', zIndex: 200 }} />
				<DialogPrimitive.Content
					aria-describedby={undefined}
					style={{
						position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
						width: 'min(96vw, 680px)', maxHeight: '88vh', overflow: 'auto',
						background: 'var(--surface, var(--bg-2))', border: '1px solid var(--border-strong)',
						borderRadius: 8, padding: 'var(--space-5)', boxShadow: '0 20px 60px rgba(0,0,0,0.4)', zIndex: 201,
					}}
				>
					<DialogPrimitive.Title style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 700, margin: 0 }}>
						Map fields
					</DialogPrimitive.Title>
					<p style={{ fontSize: 13, color: 'var(--fg-2)', margin: '6px 0 14px' }}>
						For each dataset, name the remote object and map columns to its fields. Mark one column
						as the <b>match key</b> to update existing records instead of creating duplicates.
					</p>

					{isLoading ? (
						<div style={{ color: 'var(--fg-muted)', padding: 16 }}><Loader2 size={14} className="animate-spin" style={{ verticalAlign: '-2px' }} /> Loading…</div>
					) : (
						ENTITIES.map((e) => (
							<EntitySection
								key={e.key}
								entity={e.key}
								label={e.label}
								state={state[e.key]}
								onChange={(patch) => setEntity(e.key, patch)}
							/>
						))
					)}

					<div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 'var(--space-5)' }}>
						<button className="btn ghost" onClick={onClose} disabled={saving}>Cancel</button>
						<button className="btn" onClick={() => void save()} disabled={saving}>
							{saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : 'Save mappings'}
						</button>
					</div>
				</DialogPrimitive.Content>
			</DialogPrimitive.Portal>
		</DialogPrimitive.Root>
	);
}

function EntitySection({
	entity, label, state, onChange,
}: { entity: string; label: string; state: EntityState | undefined; onChange: (patch: Partial<EntityState>) => void }) {
	const [open, setOpen] = useState(false);
	const { data } = useSWR<ColumnsResp>(open ? qk.exports.columns(entity) : null, { revalidateOnFocus: false, dedupingInterval: 60_000 });
	const cols = data?.columns ?? [];
	const rows = state?.rows ?? {};
	const includedCount = Object.values(rows).filter((r) => r.include && r.remoteField.trim()).length;

	// Auto-open a section that already has mappings.
	useEffect(() => { if (state && Object.keys(state.rows).length > 0) setOpen(true); }, [state]);

	const setRow = (col: string, patch: Partial<RowState>) => {
		const cur = rows[col] ?? { include: false, remoteField: '', isMatch: false };
		const nextRows = { ...rows, [col]: { ...cur, ...patch } };
		// Only one match key per entity.
		if (patch.isMatch) for (const k of Object.keys(nextRows)) if (k !== col) nextRows[k] = { ...nextRows[k]!, isMatch: false };
		onChange({ rows: nextRows });
	};

	return (
		<div style={{ border: '1px solid var(--border)', borderRadius: 8, marginBottom: 10 }}>
			<button
				onClick={() => setOpen((v) => !v)}
				style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'transparent', border: 0, cursor: 'pointer', color: 'var(--fg)' }}
			>
				<span style={{ fontWeight: 600, fontSize: 14 }}>{label}</span>
				<span style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{includedCount > 0 ? `${includedCount} mapped` : 'not mapped'} {open ? '▴' : '▾'}</span>
			</button>

			{open && (
				<div style={{ padding: '0 12px 12px' }}>
					<label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, fontSize: 12 }}>
						<span style={{ color: 'var(--fg-2)', minWidth: 90 }}>Remote object</span>
						<input
							className="search-input" style={{ flex: 1, height: 30 }}
							placeholder="e.g. companies"
							value={state?.remoteObject ?? ''}
							onChange={(ev) => onChange({ remoteObject: ev.target.value })}
						/>
					</label>

					<div style={{ display: 'grid', gridTemplateColumns: '20px 1fr 1fr 56px', gap: 6, alignItems: 'center', fontSize: 11, color: 'var(--fg-muted)', paddingBottom: 4 }}>
						<span /><span>Column</span><span>Remote field</span><span style={{ textAlign: 'center' }}>Match</span>
					</div>
					{cols.map((c) => {
						const r = rows[c.key] ?? { include: false, remoteField: '', isMatch: false };
						return (
							<div key={c.key} style={{ display: 'grid', gridTemplateColumns: '20px 1fr 1fr 56px', gap: 6, alignItems: 'center', padding: '3px 0' }}>
								<input type="checkbox" checked={r.include} onChange={(ev) => setRow(c.key, { include: ev.target.checked })} />
								<span style={{ fontSize: 13 }}>{c.label}</span>
								<input
									className="search-input" style={{ height: 28, fontSize: 12 }}
									placeholder="remote field"
									value={r.remoteField}
									disabled={!r.include}
									onChange={(ev) => setRow(c.key, { remoteField: ev.target.value })}
								/>
								<input
									type="radio" name={`match-${entity}`} checked={r.isMatch} disabled={!r.include}
									onChange={() => setRow(c.key, { isMatch: true })}
									style={{ justifySelf: 'center' }}
									title="Use as the upsert match key"
								/>
							</div>
						);
					})}
					{cols.length === 0 && <div style={{ fontSize: 12, color: 'var(--fg-muted)', padding: '6px 0' }}>No exportable columns for this dataset.</div>}
				</div>
			)}
		</div>
	);
}
