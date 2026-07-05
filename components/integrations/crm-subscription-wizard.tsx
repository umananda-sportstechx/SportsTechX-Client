'use client';

import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Loader2, Plus, Check, ChevronRight, ChevronLeft, Coins, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { qk } from '@/lib/query-keys';
import { apiRequest } from '@/lib/query-client';

/**
 * Provider-subscription wizard (Phase 3). Walks: dataset → destination object →
 * column mapping (auto-match / pick / create-new field) → scope (specific
 * companies OR a saved filter) + row limit + live credit quote → save. Saving
 * creates a target + a subscription (with its mappings) via the API; nothing
 * syncs until the user hits "Sync now" on the subscription.
 */

const ENTITIES = [
	{ key: 'companies', label: 'Companies' },
	{ key: 'deals', label: 'Deal flow' },
	{ key: 'investors', label: 'Investors' },
	{ key: 'acquisitions', label: 'M&A' },
	{ key: 'programs', label: 'Programs' },
	{ key: 'events', label: 'Events' },
] as const;

interface ProviderObject { slug: string; label: string }
interface ProviderField { slug: string; label: string; type: string; writable: boolean }
interface ExportColumn { key: string; label: string; credit_cost: number }
interface CompanyRow { id: string; name: string }
interface CountResp { matched: number; rows: number; credits: number; credits_per_row: number; capped: boolean }

const CREATE_SENTINEL = '__create__';
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

type MapRow = { include: boolean; remoteField: string; isMatch: boolean; creating: boolean; newName: string; type: string };

export function CrmSubscriptionWizard({
	connectionId, provider, onClose, onSaved,
}: { connectionId: string; provider: string; onClose: () => void; onSaved: () => void }) {
	const [step, setStep] = useState(0);
	const [entity, setEntity] = useState<string>('companies');
	const [object, setObject] = useState('');
	const [saving, setSaving] = useState(false);

	// Mapping state (col key → row).
	const [rows, setRows] = useState<Record<string, MapRow>>({});
	// Local copy of provider fields so a created field appears immediately.
	const [fields, setFields] = useState<ProviderField[]>([]);

	// Scope state.
	const [mode, setMode] = useState<'list' | 'filter'>('filter');
	const [companies, setCompanies] = useState<CompanyRow[]>([]);
	const [companyQuery, setCompanyQuery] = useState('');
	const [includeRelated, setIncludeRelated] = useState(false);
	const [autoSync, setAutoSync] = useState(false);
	const [rowLimit, setRowLimit] = useState(100);
	// Minimal filter facets. `fSearch` (name search) applies to every dataset;
	// the rest are companies-specific. Full facet parity comes later.
	const [fSearch, setFSearch] = useState('');
	const [fSector, setFSector] = useState('');
	const [fCountry, setFCountry] = useState('');
	const [fVerified, setFVerified] = useState(false);
	const [fRaising, setFRaising] = useState(false);

	// ── Data fetches ──────────────────────────────────────────────────────────
	const { data: objectsResp, isLoading: objectsLoading, error: objectsErr } =
		useSWR<{ objects: ProviderObject[] }>(qk.integrations.crmProviderObjects(connectionId), { revalidateOnFocus: false, shouldRetryOnError: false });
	const { data: columnsResp } = useSWR<{ columns: ExportColumn[] }>(qk.exports.columns(entity), { revalidateOnFocus: false, dedupingInterval: 60_000 });
	const { data: fieldsResp, isLoading: fieldsLoading } =
		useSWR<{ fields: ProviderField[] }>(object ? qk.integrations.crmProviderFields(connectionId, object) : null, { revalidateOnFocus: false });

	const columns = useMemo(() => columnsResp?.columns ?? [], [columnsResp]);

	// Seed the provider-field list + auto-match once fields load for an object.
	useEffect(() => {
		if (!fieldsResp) return;
		setFields(fieldsResp.fields.filter((f) => f.writable));
	}, [fieldsResp]);

	// Auto-match columns → provider fields by normalized name, once both loaded.
	useEffect(() => {
		if (columns.length === 0 || fields.length === 0) return;
		setRows((prev) => {
			const next = { ...prev };
			for (const c of columns) {
				if (next[c.key]) continue; // don't clobber user edits
				const m = fields.find((f) => norm(f.slug) === norm(c.key) || norm(f.label) === norm(c.label));
				next[c.key] = m
					? { include: true, remoteField: m.slug, isMatch: false, creating: false, newName: '', type: m.type }
					: { include: false, remoteField: '', isMatch: false, creating: false, newName: '', type: 'text' };
			}
			return next;
		});
	}, [columns, fields]);

	// Company search (list mode).
	const { data: companyResults } = useSWR<{ data: CompanyRow[] }>(
		mode === 'list' && companyQuery.trim().length >= 2 ? qk.companies.list({ search: companyQuery.trim(), limit: 8 }) : null,
		{ revalidateOnFocus: false, keepPreviousData: true },
	);

	// ── Derived: mapped columns, per-row cost, quote ────────────────────────────
	const mapped = useMemo(
		() => columns.filter((c) => rows[c.key]?.include && (rows[c.key]?.remoteField || rows[c.key]?.creating)),
		[columns, rows],
	);
	const mappedKeys = mapped.map((c) => c.key);
	const perRow = mapped.reduce((s, c) => s + (c.credit_cost ?? 0.5), 0);
	const matchKeySet = Object.values(rows).some((r) => r.include && r.isMatch);

	// Filter payload for the count quote (companies facets).
	const filterObj = useMemo(() => {
		const f: Record<string, unknown> = {};
		// `q` is read by every entity's filter builder (companies also honours it).
		if (fSearch.trim()) f.q = fSearch.trim();
		if (entity === 'companies') {
			if (fSector.trim()) f.sector_slug = fSector.trim();
			if (fCountry.trim()) f.country = fCountry.trim();
			if (fVerified) f.is_verified = true;
			if (fRaising) f.is_actively_raising = true;
		}
		return f;
	}, [entity, fSearch, fSector, fCountry, fVerified, fRaising]);

	// Live quote. Filter mode → count endpoint; list mode → local (ids length).
	const { data: count } = useSWR<CountResp>(
		step === 2 && mode === 'filter' && mappedKeys.length > 0
			? qk.exports.count(entity, null, mappedKeys, filterObj)
			: null,
		{ dedupingInterval: 10_000, keepPreviousData: true },
	);
	const matched = mode === 'list' ? companies.length : (count?.matched ?? 0);
	const quoteRows = Math.min(matched, rowLimit);
	const quoteCredits = Math.ceil(quoteRows * perRow);

	// ── Mapping helpers ─────────────────────────────────────────────────────────
	const setRow = (col: string, patch: Partial<MapRow>) => {
		setRows((s) => {
			const cur = s[col] ?? { include: false, remoteField: '', isMatch: false, creating: false, newName: '', type: 'text' };
			const next = { ...s, [col]: { ...cur, ...patch } };
			if (patch.isMatch) for (const k of Object.keys(next)) if (k !== col) next[k] = { ...next[k]!, isMatch: false };
			return next;
		});
	};

	const createField = async (col: string, name: string) => {
		const label = name.trim();
		if (!label) { toast.error('Name the new field first.'); return; }
		try {
			const res = await apiRequest('POST', `/api/integrations/crm/${connectionId}/provider/objects/${object}/fields`, { label });
			const { field } = (await res.json()) as { field: ProviderField };
			setFields((f) => [...f.filter((x) => x.slug !== field.slug), field]);
			setRow(col, { creating: false, newName: '', remoteField: field.slug, type: field.type });
			toast.success(`Created “${field.label}” in ${provider}.`);
		} catch (e) {
			toast.error((e as Error).message);
		}
	};

	const addCompany = (c: CompanyRow) => {
		setCompanies((cs) => (cs.some((x) => x.id === c.id) ? cs : cs.length >= rowLimit ? cs : [...cs, c]));
		setCompanyQuery('');
	};

	// ── Validation per step ─────────────────────────────────────────────────────
	const canNext = step === 0
		? !!entity && !!object
		: step === 1
			? mapped.length > 0 && mapped.every((c) => rows[c.key]?.remoteField)
			: step === 2
				? (mode === 'list' ? companies.length > 0 : Object.keys(filterObj).length > 0) && rowLimit >= 1
				: true;

	// ── Save ────────────────────────────────────────────────────────────────────
	const save = async (thenSync: boolean) => {
		if (mapped.length === 0) { toast.error('Map at least one column.'); return; }
		setSaving(true);
		try {
			const obj = objectsResp?.objects.find((o) => o.slug === object);
			const targetRes = await apiRequest('POST', `/api/integrations/crm/${connectionId}/targets`, {
				entity, provider_object: object, provider_target_name: obj?.label ?? object,
			});
			const { target } = (await targetRes.json()) as { target: { id: string } };

			const mappings = mapped.map((c) => ({
				stx_entity_type: entity,
				stx_column: c.key,
				remote_entity_type: object,
				remote_field: rows[c.key]!.remoteField,
				is_match_key: rows[c.key]!.isMatch,
				remote_field_type: rows[c.key]!.type,
			}));

			const subRes = await apiRequest('POST', `/api/integrations/crm/${connectionId}/subscriptions`, {
				entity,
				mode,
				...(mode === 'list' ? { company_ids: companies.map((c) => c.id) } : { filter: filterObj }),
				include_related: entity === 'companies' ? includeRelated : false,
				auto_sync: mode === 'filter' ? autoSync : false,
				row_limit: rowLimit,
				target_id: target.id,
				mappings,
			});
			const { subscription } = (await subRes.json()) as { subscription: { id: string } };

			if (thenSync) {
				await apiRequest('POST', `/api/integrations/crm/${connectionId}/subscriptions/${subscription.id}/sync`);
				toast.success('Subscription saved — sync started.');
			} else {
				toast.success('Subscription saved.');
			}
			onSaved();
		} catch (e) {
			toast.error((e as Error).message);
		} finally {
			setSaving(false);
		}
	};

	const STEPS = ['Dataset', 'Map fields', 'Scope', 'Review'];

	return (
		<DialogPrimitive.Root open onOpenChange={(o) => { if (!o) onClose(); }}>
			<DialogPrimitive.Portal>
				<DialogPrimitive.Overlay style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)', zIndex: 200 }} />
				<DialogPrimitive.Content
					aria-describedby={undefined}
					style={{
						position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
						width: 'min(96vw, 720px)', maxHeight: '90vh', overflow: 'auto',
						background: 'var(--surface, var(--bg-2))', border: '1px solid var(--border-strong)',
						borderRadius: 10, padding: 'var(--space-5)', boxShadow: '0 20px 60px rgba(0,0,0,0.4)', zIndex: 201,
					}}
				>
					<DialogPrimitive.Title style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 700, margin: 0 }}>
						New subscription
					</DialogPrimitive.Title>

					{/* Stepper */}
					<div style={{ display: 'flex', gap: 6, margin: '14px 0 18px' }}>
						{STEPS.map((s, i) => (
							<div key={s} style={{ flex: 1, textAlign: 'center' }}>
								<div style={{ height: 3, borderRadius: 2, background: i <= step ? 'var(--accent)' : 'var(--border)' }} />
								<span style={{ fontSize: 11, color: i === step ? 'var(--fg)' : 'var(--fg-muted)', fontWeight: i === step ? 600 : 400 }}>{s}</span>
							</div>
						))}
					</div>

					{/* ── Step 0: dataset + destination ── */}
					{step === 0 && (
						<div>
							<Field label="Dataset">
								<select className="search-input" style={selectStyle} value={entity} onChange={(e) => { setEntity(e.target.value); setRows({}); }}>
									{ENTITIES.map((e) => <option key={e.key} value={e.key}>{e.label}</option>)}
								</select>
							</Field>
							<Field label="Destination object">
								{objectsLoading ? (
									<Spinner text="Loading objects…" />
								) : objectsErr ? (
									<p style={hint}>Couldn’t load objects from {provider}. Reconnect the provider and retry.</p>
								) : (
									<select className="search-input" style={selectStyle} value={object} onChange={(e) => { setObject(e.target.value); setRows({}); setFields([]); }}>
										<option value="">Select an object…</option>
										{(objectsResp?.objects ?? []).map((o) => <option key={o.slug} value={o.slug}>{o.label}</option>)}
									</select>
								)}
								<p style={hint}>Rows land in this {provider} object. Create custom fields on it in the next step.</p>
							</Field>
						</div>
					)}

					{/* ── Step 1: mapping ── */}
					{step === 1 && (
						<div>
							<p style={{ fontSize: 13, color: 'var(--fg-2)', margin: '0 0 12px' }}>
								Auto-matched by name. Adjust any field, mark one column as the <b>match key</b> to update
								records instead of duplicating them, or create a new field in {provider}.
							</p>
							{fieldsLoading ? <Spinner text="Loading provider fields…" /> : (
								<div style={{ display: 'grid', gridTemplateColumns: '18px 1fr 1.3fr 46px', gap: 8, alignItems: 'center' }}>
									<span /><span style={colHead}>Column</span><span style={colHead}>{provider} field</span><span style={{ ...colHead, textAlign: 'center' }}>Match</span>
									{columns.map((c) => {
										const r = rows[c.key] ?? { include: false, remoteField: '', isMatch: false, creating: false, newName: '', type: 'text' };
										return (
											<FieldMapRow key={c.key} col={c} row={r} fields={fields}
												onToggle={(v) => setRow(c.key, { include: v })}
												onSelect={(v) => v === CREATE_SENTINEL ? setRow(c.key, { creating: true, remoteField: '' }) : setRow(c.key, { remoteField: v, creating: false, type: fields.find((f) => f.slug === v)?.type ?? 'text' })}
												onMatch={() => setRow(c.key, { isMatch: true, include: true })}
												onNewName={(v) => setRow(c.key, { newName: v })}
												onCreate={() => void createField(c.key, r.newName)}
												onCancelCreate={() => setRow(c.key, { creating: false })}
											/>
										);
									})}
								</div>
							)}
							{!matchKeySet && mapped.length > 0 && (
								<p style={{ ...hint, color: 'var(--warn, #b45309)' }}>No match key set — every sync creates new records (possible duplicates).</p>
							)}
						</div>
					)}

					{/* ── Step 2: scope + quote ── */}
					{step === 2 && (
						<div>
							{entity === 'companies' && (
								<div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
									{(['filter', 'list'] as const).map((m) => (
										<button key={m} className={`btn ${mode === m ? '' : 'ghost'}`} style={{ flex: 1, fontSize: 12 }} onClick={() => setMode(m)}>
											{m === 'filter' ? 'A saved filter' : 'Specific companies'}
										</button>
									))}
								</div>
							)}

							{mode === 'list' && entity === 'companies' ? (
								<div>
									<input className="search-input" style={{ width: '100%', height: 34 }} placeholder="Search companies to add…"
										value={companyQuery} onChange={(e) => setCompanyQuery(e.target.value)} />
									{(companyResults?.data ?? []).length > 0 && companyQuery.trim().length >= 2 && (
										<div style={{ border: '1px solid var(--border)', borderRadius: 6, marginTop: 4, maxHeight: 160, overflow: 'auto' }}>
											{(companyResults?.data ?? []).map((c) => (
												<button key={c.id} onClick={() => addCompany(c)} style={pickRow}>{c.name}<Plus size={13} /></button>
											))}
										</div>
									)}
									<div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
										{companies.map((c) => (
											<span key={c.id} style={chip}>{c.name}
												<button onClick={() => setCompanies((cs) => cs.filter((x) => x.id !== c.id))} style={{ background: 'none', border: 0, cursor: 'pointer', color: 'inherit', display: 'flex' }}><X size={12} /></button>
											</span>
										))}
									</div>
									<p style={hint}>{companies.length} selected (max {rowLimit}).</p>
								</div>
							) : (
								<div>
									<Field label="Name search">
										<input className="search-input" style={selectStyle} placeholder={`Filter ${entity} by name…`} value={fSearch} onChange={(e) => setFSearch(e.target.value)} />
									</Field>
									{entity === 'companies' && (
										<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
											<Field label="Sector slug"><input className="search-input" style={selectStyle} placeholder="e.g. tracking-analytics" value={fSector} onChange={(e) => setFSector(e.target.value)} /></Field>
											<Field label="Country"><input className="search-input" style={selectStyle} placeholder="e.g. USA" value={fCountry} onChange={(e) => setFCountry(e.target.value)} /></Field>
											<label style={toggleRow}><input type="checkbox" checked={fVerified} onChange={(e) => setFVerified(e.target.checked)} /> Verified only</label>
											<label style={toggleRow}><input type="checkbox" checked={fRaising} onChange={(e) => setFRaising(e.target.checked)} /> Actively raising</label>
										</div>
									)}
									<p style={hint}>Future matching {entity} auto-enter this subscription (up to the row limit).</p>
								</div>
							)}

							{entity === 'companies' && (
								<label style={{ ...toggleRow, marginTop: 12 }}>
									<input type="checkbox" checked={includeRelated} onChange={(e) => setIncludeRelated(e.target.checked)} /> Flatten related deals / M&A onto each row
								</label>
							)}
							{mode === 'filter' && (
								<label style={{ ...toggleRow, marginTop: 10 }}>
									<input type="checkbox" checked={autoSync} onChange={(e) => setAutoSync(e.target.checked)} /> Auto-sync new matches
									<span style={{ fontSize: 11, color: 'var(--fg-muted)' }}>— push new/updated rows automatically (uses credits)</span>
								</label>
							)}

							<Field label="Row limit">
								<input type="number" min={1} max={1000} className="search-input" style={{ ...selectStyle, width: 120 }}
									value={rowLimit} onChange={(e) => setRowLimit(Math.max(1, Math.min(1000, parseInt(e.target.value, 10) || 1)))} />
							</Field>

							{/* Quote */}
							<div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-2)', fontSize: 13 }}>
								{mapped.length === 0 ? (
									<span style={{ color: 'var(--fg-muted)' }}>Map columns first to see the cost.</span>
								) : (
									<>Syncs up to <b>{quoteRows.toLocaleString()}</b> row{quoteRows === 1 ? '' : 's'} · <b>{perRow}</b> credit{perRow === 1 ? '' : 's'}/row ·{' '}
										<b><Coins size={11} style={{ verticalAlign: '-1px' }} /> {quoteCredits.toLocaleString()}</b> per sync
										{matched > rowLimit && <span style={{ color: 'var(--fg-muted)' }}> (of {matched.toLocaleString()} matching — capped at your limit)</span>}
									</>
								)}
							</div>
						</div>
					)}

					{/* ── Step 3: review ── */}
					{step === 3 && (
						<div style={{ fontSize: 13 }}>
							<ReviewLine k="Dataset" v={ENTITIES.find((e) => e.key === entity)?.label ?? entity} />
							<ReviewLine k="Destination" v={objectsResp?.objects.find((o) => o.slug === object)?.label ?? object} />
							<ReviewLine k="Mapped fields" v={`${mapped.length} column${mapped.length === 1 ? '' : 's'}${matchKeySet ? ' · match key set' : ' · no match key'}`} />
							<ReviewLine k="Scope" v={mode === 'list' ? `${companies.length} specific companies` : `Filter (${Object.keys(filterObj).length} facet${Object.keys(filterObj).length === 1 ? '' : 's'})${autoSync ? ' · auto-sync on' : ''}`} />
							<ReviewLine k="Row limit" v={String(rowLimit)} />
							<ReviewLine k="Per sync" v={`~${quoteRows.toLocaleString()} rows · ${quoteCredits.toLocaleString()} credits`} />
							<p style={{ ...hint, marginTop: 10 }}>Nothing syncs until you save. You can sync immediately or later from the subscriptions list.</p>
						</div>
					)}

					{/* Footer nav */}
					<div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 'var(--space-5)' }}>
						<button className="btn ghost" onClick={step === 0 ? onClose : () => setStep((s) => s - 1)} disabled={saving}>
							{step === 0 ? 'Cancel' : <><ChevronLeft size={14} /> Back</>}
						</button>
						{step < 3 ? (
							<button className="btn" onClick={() => setStep((s) => s + 1)} disabled={!canNext}>Next <ChevronRight size={14} /></button>
						) : (
							<div style={{ display: 'flex', gap: 8 }}>
								<button className="btn ghost" onClick={() => void save(false)} disabled={saving}>{saving ? <Loader2 size={14} className="animate-spin" /> : 'Save'}</button>
								<button className="btn" onClick={() => void save(true)} disabled={saving}>
									{saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : <><Check size={14} /> Save &amp; sync</>}
								</button>
							</div>
						)}
					</div>
				</DialogPrimitive.Content>
			</DialogPrimitive.Portal>
		</DialogPrimitive.Root>
	);
}

// ── Small presentational helpers ──────────────────────────────────────────────
const selectStyle: React.CSSProperties = { width: '100%', height: 34 };
const hint: React.CSSProperties = { fontSize: 11, color: 'var(--fg-muted)', margin: '6px 0 0' };
const colHead: React.CSSProperties = { fontSize: 11, color: 'var(--fg-muted)' };
const toggleRow: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 };
const pickRow: React.CSSProperties = { width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 10px', background: 'transparent', border: 0, borderBottom: '1px solid var(--border)', cursor: 'pointer', color: 'var(--fg)', fontSize: 13 };
const chip: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 8px', borderRadius: 999, background: 'color-mix(in oklab, var(--accent) 12%, transparent)', border: '1px solid var(--border)', fontSize: 12 };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<div style={{ marginBottom: 14 }}>
			<div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-2)', marginBottom: 6 }}>{label}</div>
			{children}
		</div>
	);
}
function Spinner({ text }: { text: string }) {
	return <div style={{ color: 'var(--fg-muted)', fontSize: 13, padding: '8px 0' }}><Loader2 size={13} className="animate-spin" style={{ verticalAlign: '-2px' }} /> {text}</div>;
}
function ReviewLine({ k, v }: { k: string; v: string }) {
	return <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}><span style={{ color: 'var(--fg-2)' }}>{k}</span><span style={{ fontWeight: 600 }}>{v}</span></div>;
}

// ── Subscriptions manager ─────────────────────────────────────────────────────

interface Subscription {
	id: string; entity: string; mode: 'list' | 'filter'; row_limit: number;
	is_active: boolean; last_sync_at: string | null; last_sync_status: string | null;
	last_sync_row_count: number | null; company_ids: string[] | null; target_id: string | null;
}

/** Modal that lists a connection's subscriptions and launches the wizard. */
export function CrmSubscriptionsPanel({
	connectionId, provider, onClose,
}: { connectionId: string; provider: string; onClose: () => void }) {
	const { data, isLoading, mutate } = useSWR<{ subscriptions: Subscription[] }>(qk.integrations.crmSubscriptions(connectionId), { revalidateOnFocus: false });
	const [wizardOpen, setWizardOpen] = useState(false);
	const [busyId, setBusyId] = useState<string | null>(null);
	const subs = data?.subscriptions ?? [];

	const syncSub = async (id: string) => {
		setBusyId(id);
		try {
			await apiRequest('POST', `/api/integrations/crm/${connectionId}/subscriptions/${id}/sync`);
			toast.success('Sync started.');
			setTimeout(() => void mutate(), 1500);
		} catch (e) { toast.error((e as Error).message); } finally { setBusyId(null); }
	};
	const deleteSub = async (id: string) => {
		setBusyId(id);
		try {
			await apiRequest('DELETE', `/api/integrations/crm/${connectionId}/subscriptions/${id}`);
			toast.success('Subscription removed.');
			void mutate();
		} catch (e) { toast.error((e as Error).message); } finally { setBusyId(null); }
	};

	return (
		<DialogPrimitive.Root open onOpenChange={(o) => { if (!o) onClose(); }}>
			<DialogPrimitive.Portal>
				<DialogPrimitive.Overlay style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)', zIndex: 200 }} />
				<DialogPrimitive.Content
					aria-describedby={undefined}
					style={{
						position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
						width: 'min(96vw, 640px)', maxHeight: '88vh', overflow: 'auto',
						background: 'var(--surface, var(--bg-2))', border: '1px solid var(--border-strong)',
						borderRadius: 10, padding: 'var(--space-5)', boxShadow: '0 20px 60px rgba(0,0,0,0.4)', zIndex: 201,
					}}
				>
					<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
						<DialogPrimitive.Title style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 700, margin: 0 }}>Subscriptions</DialogPrimitive.Title>
						<button className="btn" style={{ fontSize: 12 }} onClick={() => setWizardOpen(true)}><Plus size={14} /> New subscription</button>
					</div>
					<p style={{ fontSize: 13, color: 'var(--fg-2)', margin: '8px 0 16px' }}>
						Each subscription syncs a scoped set of rows to a {provider} object. You’re charged per synced row by the columns you map.
					</p>

					{isLoading ? <Spinner text="Loading…" /> : subs.length === 0 ? (
						<div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--fg-muted)' }}>
							<p style={{ fontSize: 14, marginBottom: 10 }}>No subscriptions yet.</p>
							<button className="btn" onClick={() => setWizardOpen(true)}><Plus size={14} /> Create your first</button>
						</div>
					) : (
						<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
							{subs.map((s) => (
								<div key={s.id} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
									<div style={{ minWidth: 0 }}>
										<div style={{ fontWeight: 600, fontSize: 14, textTransform: 'capitalize' }}>{s.entity} · {s.mode === 'list' ? `${s.company_ids?.length ?? 0} companies` : 'filter'}</div>
										<div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>
											up to {s.row_limit} rows ·{' '}
											{s.last_sync_status === 'running' ? 'syncing…'
												: s.last_sync_at ? `${s.last_sync_status === 'error' ? 'failed' : `synced ${s.last_sync_row_count ?? 0}`} · ${new Date(s.last_sync_at).toLocaleDateString()}`
													: 'never synced'}
										</div>
									</div>
									<div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
										<button className="btn ghost" style={{ fontSize: 12 }} onClick={() => void syncSub(s.id)} disabled={busyId === s.id || s.last_sync_status === 'running'}>
											{busyId === s.id || s.last_sync_status === 'running' ? <Loader2 size={13} className="animate-spin" /> : 'Sync'}
										</button>
										<button className="btn ghost" style={{ padding: '0 8px', color: 'var(--neg)' }} onClick={() => void deleteSub(s.id)} disabled={busyId === s.id} title="Remove subscription"><Trash2 size={13} /></button>
									</div>
								</div>
							))}
						</div>
					)}

					<div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-5)' }}>
						<button className="btn ghost" onClick={onClose}>Close</button>
					</div>

					{wizardOpen && (
						<CrmSubscriptionWizard
							connectionId={connectionId}
							provider={provider}
							onClose={() => setWizardOpen(false)}
							onSaved={() => { setWizardOpen(false); void mutate(); }}
						/>
					)}
				</DialogPrimitive.Content>
			</DialogPrimitive.Portal>
		</DialogPrimitive.Root>
	);
}

function FieldMapRow({
	col, row, fields, onToggle, onSelect, onMatch, onNewName, onCreate, onCancelCreate,
}: {
	col: ExportColumn; row: MapRow; fields: ProviderField[];
	onToggle: (v: boolean) => void; onSelect: (v: string) => void; onMatch: () => void;
	onNewName: (v: string) => void; onCreate: () => void; onCancelCreate: () => void;
}) {
	return (
		<>
			<input type="checkbox" checked={row.include} onChange={(e) => onToggle(e.target.checked)} />
			<span style={{ fontSize: 13, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={col.label}>{col.label}</span>
			{row.creating ? (
				<span style={{ display: 'flex', gap: 4 }}>
					<input className="search-input" style={{ height: 28, fontSize: 12, flex: 1 }} placeholder="New field name" value={row.newName} onChange={(e) => onNewName(e.target.value)} autoFocus />
					<button className="btn" style={{ padding: '0 8px', fontSize: 11 }} onClick={onCreate}>Add</button>
					<button className="btn ghost" style={{ padding: '0 6px' }} onClick={onCancelCreate}><X size={12} /></button>
				</span>
			) : (
				<select className="search-input" style={{ height: 28, fontSize: 12 }} value={row.remoteField} disabled={!row.include} onChange={(e) => onSelect(e.target.value)}>
					<option value="">Choose field…</option>
					{fields.map((f) => <option key={f.slug} value={f.slug}>{f.label}</option>)}
					<option value={CREATE_SENTINEL}>＋ Create new field…</option>
				</select>
			)}
			<input type="radio" name={`match-${col.key}-grp`} checked={row.isMatch} disabled={!row.include} onChange={onMatch} style={{ justifySelf: 'center' }} title="Use as the upsert match key" />
		</>
	);
}
