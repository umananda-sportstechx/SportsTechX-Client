'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Download, Loader2, Coins, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { qk } from '@/lib/query-keys';
import { getAuthHeaders, apiRequest } from '@/lib/query-client';
import { openCreditExhausted } from '@/lib/credit-events';
import { useCreditBalance } from '@/hooks/use-credit-balance';

/**
 * Metered export button + modal. One per catalog page.
 *
 * Lets the user pick a format (CSV/XLSX) and a subset of the admin-enabled
 * columns, then downloads the file. Each exported row costs 1 export credit
 * (the integration-credit pool, surfaced to users as "export credits"). A 402
 * pops the global out-of-credits modal.
 *
 * `search` mirrors the page's active name search so the export matches roughly
 * what the user is looking at. (Row cap server-side keeps a single export
 * bounded.)
 */

type ExportFormat = 'csv' | 'xlsx';
interface ColumnsResp { entity: string; label: string; columns: { key: string; label: string }[] }
interface CountResp { entity: string; matched: number; rows: number; credits: number; capped: boolean }
interface PreviewResp { columns: { key: string; label: string }[]; rows: Record<string, string>[] }

export function ExportButton({ entity, search }: { entity: string; search?: string | null }) {
	const [open, setOpen] = useState(false);
	return (
		<>
			<button className="btn ghost" onClick={() => setOpen(true)} title="Export to CSV / Excel">
				<Download size={12} /> Export
			</button>
			{open && <ExportModal entity={entity} search={search} onClose={() => setOpen(false)} />}
		</>
	);
}

function ExportModal({ entity, search, onClose }: { entity: string; search?: string | null; onClose: () => void }) {
	const { data, isLoading } = useSWR<ColumnsResp>(qk.exports.columns(entity), { dedupingInterval: 60_000 });
	const { data: count, isLoading: countLoading } = useSWR<CountResp>(
		qk.exports.count(entity, search), { dedupingInterval: 15_000 },
	);
	const { balance } = useCreditBalance('integration');
	const [format, setFormat] = useState<ExportFormat>('xlsx');
	const [selected, setSelected] = useState<Set<string> | null>(null);
	const [busy, setBusy] = useState(false);
	const [previewOpen, setPreviewOpen] = useState(false);
	const [preview, setPreview] = useState<PreviewResp | null>(null);
	const [previewLoading, setPreviewLoading] = useState(false);

	// Default: everything selected once columns load.
	const cols = data?.columns ?? [];
	const sel = selected ?? new Set(cols.map((c) => c.key));
	const allOn = cols.length > 0 && cols.every((c) => sel.has(c.key));
	// Stable signature of the current selection (admin order) for the preview effect.
	const selectedKeysSig = cols.filter((c) => sel.has(c.key)).map((c) => c.key).join(',');

	// When the preview is open, (re)load it as the column selection changes so it
	// always reflects exactly what will download. No credits are charged.
	useEffect(() => {
		if (!previewOpen) return;
		let cancelled = false;
		setPreviewLoading(true);
		(async () => {
			try {
				const res = await apiRequest('POST', `/api/exports/${entity}/preview`, {
					columns: selectedKeysSig ? selectedKeysSig.split(',') : [],
					search: search ?? null,
				});
				const body = (await res.json()) as PreviewResp;
				if (!cancelled) setPreview(body);
			} catch {
				if (!cancelled) setPreview(null);
			} finally {
				if (!cancelled) setPreviewLoading(false);
			}
		})();
		return () => { cancelled = true; };
	}, [previewOpen, selectedKeysSig, entity, search]);

	const toggle = (key: string) => {
		const next = new Set(sel);
		next.has(key) ? next.delete(key) : next.add(key);
		setSelected(next);
	};
	const toggleAll = () => setSelected(allOn ? new Set() : new Set(cols.map((c) => c.key)));

	const available = balance?.total_available ?? 0;
	const cost = count?.credits ?? 0;
	const insufficient = !!count && cost > available;

	const exportNow = async () => {
		const columns = cols.filter((c) => sel.has(c.key)).map((c) => c.key);
		if (columns.length === 0) { toast.error('Pick at least one column'); return; }
		setBusy(true);
		try {
			const headers = await getAuthHeaders();
			const res = await fetch(`/api/exports/${entity}`, {
				method: 'POST',
				headers: { ...headers, 'Content-Type': 'application/json' },
				body: JSON.stringify({ format, columns, search: search ?? null }),
			});

			if (res.status === 402) {
				let detail: { required?: number; available?: number } = {};
				try {
					const body = await res.json() as { error?: { details?: { required?: number; available?: number } } };
					if (body.error?.details) detail = body.error.details;
				} catch { /* ignore */ }
				openCreditExhausted({ ...detail, creditType: 'integration' });
				onClose();
				return;
			}
			if (!res.ok) {
				let msg = 'Export failed. Please try again.';
				try { const b = await res.json() as { message?: string; error?: { message?: string } }; msg = b.error?.message ?? b.message ?? msg; } catch { /* ignore */ }
				toast.error(msg);
				return;
			}

			const rows = res.headers.get('X-Export-Rows') ?? '0';
			const credits = res.headers.get('X-Export-Credits') ?? '0';
			const blob = await res.blob();
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `${entity}-export.${format}`;
			document.body.appendChild(a);
			a.click();
			a.remove();
			URL.revokeObjectURL(url);

			if (rows === '0') toast.info('No rows matched — nothing exported, no credits charged.');
			else toast.success(`Exported ${Number(rows).toLocaleString()} rows · ${Number(credits).toLocaleString()} export credits used`);
			onClose();
		} catch (e) {
			toast.error((e as Error).message || 'Export failed.');
		} finally {
			setBusy(false);
		}
	};

	const selectedCount = cols.filter((c) => sel.has(c.key)).length;

	return (
		<DialogPrimitive.Root open onOpenChange={(o) => { if (!o) onClose(); }}>
			<DialogPrimitive.Portal>
				<DialogPrimitive.Overlay style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)', zIndex: 200 }} />
				<DialogPrimitive.Content
					aria-describedby={undefined}
					style={{
						position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
						width: 'min(94vw, 540px)', maxHeight: '86vh', overflow: 'auto',
						background: 'var(--surface, var(--bg-2))', border: '1px solid var(--border-strong)',
						borderRadius: 6, padding: 'var(--space-5)', boxShadow: '0 20px 60px rgba(0,0,0,0.4)', zIndex: 201,
					}}
				>
					<DialogPrimitive.Title style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 700, margin: 0 }}>
						Export {data?.label ?? entity}
					</DialogPrimitive.Title>
					<p style={{ fontSize: 13, color: 'var(--fg-2)', margin: '8px 0 0' }}>
						Choose columns and a format. <b>1 export credit per row.</b>{' '}
						<span style={{ color: 'var(--fg-muted)' }}>
							You have <Coins size={11} style={{ verticalAlign: '-1px' }} /> {available.toLocaleString()} export credits.
						</span>
					</p>

					{/* Pre-flight cost: rows that will be exported + credits charged. */}
					<div
						style={{
							marginTop: 12, padding: '10px 12px', borderRadius: 8,
							border: `1px solid ${insufficient ? 'var(--neg)' : 'var(--border)'}`,
							background: insufficient ? 'color-mix(in oklab, var(--neg) 8%, transparent)' : 'var(--bg-2)',
							fontSize: 13,
						}}
					>
						{countLoading ? (
							<span style={{ color: 'var(--fg-muted)' }}>Calculating rows…</span>
						) : !count ? (
							<span style={{ color: 'var(--fg-muted)' }}>Row count unavailable — you’ll be charged 1 credit per exported row.</span>
						) : count.rows === 0 ? (
							<span style={{ color: 'var(--fg-muted)' }}>No rows match — nothing to export, no credits charged.</span>
						) : (
							<>
								This will export <b>{count.rows.toLocaleString()}</b> row{count.rows === 1 ? '' : 's'} and cost{' '}
								<b style={{ color: insufficient ? 'var(--neg)' : 'var(--fg)' }}>{cost.toLocaleString()}</b> export credit{cost === 1 ? '' : 's'}.
								{count.capped && (
									<div style={{ color: 'var(--fg-muted)', fontSize: 11, marginTop: 4 }}>
										Capped at {count.rows.toLocaleString()} rows per export (more match your search).
									</div>
								)}
								{insufficient && (
									<div style={{ color: 'var(--neg)', fontSize: 12, marginTop: 4 }}>
										You’re short {(cost - available).toLocaleString()} credits. Top up or narrow your search.
									</div>
								)}
							</>
						)}
					</div>

					<p style={{ fontSize: 11, color: 'var(--fg-muted)', margin: '8px 0 0' }}>
						Exports match your search box. Use <b>Preview data</b> below to confirm exactly what downloads.
					</p>

					{/* Format */}
					<div style={{ display: 'flex', gap: 8, margin: '16px 0 10px' }}>
						{(['xlsx', 'csv'] as ExportFormat[]).map((f) => (
							<button
								key={f}
								className={`btn ${format === f ? '' : 'ghost'}`}
								onClick={() => setFormat(f)}
								style={{ textTransform: 'uppercase', fontSize: 12 }}
							>
								{f}
							</button>
						))}
					</div>

					{/* Columns */}
					<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '6px 0' }}>
						<span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-2)' }}>
							Columns <span style={{ color: 'var(--fg-muted)', fontWeight: 400 }}>· {selectedCount}/{cols.length}</span>
						</span>
						<button className="btn ghost" style={{ fontSize: 11 }} onClick={toggleAll} disabled={isLoading || cols.length === 0}>
							{allOn ? 'Clear all' : 'Select all'}
						</button>
					</div>

					{isLoading ? (
						<div style={{ color: 'var(--fg-muted)', padding: '12px 0' }}>Loading columns…</div>
					) : cols.length === 0 ? (
						<div style={{ color: 'var(--fg-muted)', padding: '12px 0' }}>No columns are available for export.</div>
					) : (
						<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 6 }}>
							{cols.map((c) => (
								<label key={c.key} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border)' }}>
									<input type="checkbox" checked={sel.has(c.key)} onChange={() => toggle(c.key)} />
									<span style={{ fontSize: 13 }}>{c.label}</span>
								</label>
							))}
						</div>
					)}

					{/* Data preview — exactly what will download (no credits charged) */}
					<div style={{ marginTop: 14 }}>
						<button
							className="btn ghost"
							style={{ fontSize: 12 }}
							onClick={() => setPreviewOpen((v) => !v)}
							disabled={cols.length === 0 || selectedCount === 0}
						>
							<Eye size={13} /> {previewOpen ? 'Hide preview' : 'Preview data'}
						</button>

						{previewOpen && (
							<div style={{ marginTop: 10, border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
								<div style={{ padding: '6px 10px', fontSize: 11, color: 'var(--fg-muted)', background: 'var(--bg-2)', borderBottom: '1px solid var(--border)' }}>
									Showing the first {preview?.rows.length ?? 0} row{(preview?.rows.length ?? 0) === 1 ? '' : 's'} — sample only, no credits charged.
								</div>
								{previewLoading ? (
									<div style={{ padding: 14, color: 'var(--fg-muted)', fontSize: 13 }}>
										<Loader2 size={13} className="animate-spin" style={{ verticalAlign: '-2px' }} /> Loading preview…
									</div>
								) : !preview || preview.rows.length === 0 ? (
									<div style={{ padding: 14, color: 'var(--fg-muted)', fontSize: 13 }}>No rows to preview.</div>
								) : (
									<div style={{ overflowX: 'auto', maxHeight: 240 }}>
										<table style={{ borderCollapse: 'collapse', fontSize: 12, width: '100%' }}>
											<thead>
												<tr>
													{preview.columns.map((c) => (
														<th key={c.key} style={{ textAlign: 'left', padding: '6px 10px', position: 'sticky', top: 0, background: 'var(--bg-2)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap', fontWeight: 600 }}>
															{c.label}
														</th>
													))}
												</tr>
											</thead>
											<tbody>
												{preview.rows.map((r, i) => (
													<tr key={i}>
														{preview.columns.map((c) => (
															<td key={c.key} style={{ padding: '6px 10px', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis' }} title={r[c.key]}>
																{r[c.key] || <span style={{ color: 'var(--fg-muted)' }}>—</span>}
															</td>
														))}
													</tr>
												))}
											</tbody>
										</table>
									</div>
								)}
							</div>
						)}
					</div>

					<div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 'var(--space-5)' }}>
						<button className="btn ghost" onClick={onClose} disabled={busy}>Cancel</button>
						<button className="btn" onClick={() => void exportNow()} disabled={busy || selectedCount === 0 || insufficient || count?.rows === 0}>
							{busy ? <><Loader2 size={14} className="animate-spin" /> Exporting…</> : <><Download size={14} /> {count && count.rows > 0 ? `Export · ${cost.toLocaleString()} cr` : 'Export'}</>}
						</button>
					</div>
				</DialogPrimitive.Content>
			</DialogPrimitive.Portal>
		</DialogPrimitive.Root>
	);
}
