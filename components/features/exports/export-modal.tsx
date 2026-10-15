'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { toast } from 'sonner';
import { Download, X } from 'lucide-react';
import { Button, Loading } from '@/components/atlas';
import { Combobox } from '@/components/atlas/ui/combobox';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useCreditBalance } from '@/hooks/use-credit-balance';
import { apiRequest } from '@/lib/query-client';
import { qk } from '@/lib/query-keys';
import { isInsufficientCreditsError } from '@/lib/credit-events';
import { hrefOf } from '@/lib/routes';
import './exports.css';

/**
 * The export picker: choose columns, optionally a row window, see what it will
 * cost against your balance, download.
 *
 * The engine behind this was finished and metered long before any UI existed —
 * `:entity/columns`, `:entity/preview` (free), `:entity/count` (pre-flight) and
 * `:entity` (the charged download), across six entities, with an admin page
 * for enabling columns and setting their per-row cost.
 *
 * Three things this must get right:
 *  - **Show the cost before spending it**, and show the balance beside it so a
 *    refusal never comes as a surprise — the count endpoint prices exactly the
 *    selected columns, so the figure moves as you tick boxes.
 *  - **Credits are one shared wallet.** `'integration'` is only a ledger label;
 *    an export draws down the same balance a credit pack tops up. A refusal
 *    comes back as a 402 that `apiRequest` turns into the credits modal, so
 *    this must not also toast over it — but we also warn up front when the
 *    balance plainly won't cover the selection.
 *  - **Only export the rows you want.** A 1-indexed From/To window maps to the
 *    backend's `offset` + `range_limit`; blank means the whole filtered list.
 */
interface ColumnsResponse {
	entity: string;
	label: string;
	columns: { key: string; label: string; credit_cost: number; related: boolean }[];
}
interface CountResponse {
	matched: number; rows: number; credits: number; credits_per_row: number; capped: boolean;
}

export function ExportModal({ entity, search, filters, onClose }: {
	entity: string;
	/** The list's current search term, so the export matches what is on screen. */
	search?: string | null;
	/** The list's current facet filters, forwarded verbatim. */
	filters?: Record<string, unknown> | null;
	onClose: () => void;
}) {
	const cols = useSWR<ColumnsResponse>(qk.exports.columns(entity));
	const { balance } = useCreditBalance();
	const [picked, setPicked] = useState<string[] | null>(null);
	const [format, setFormat] = useState<'csv' | 'xlsx'>('csv');
	const [fromRow, setFromRow] = useState('');
	const [toRow, setToRow] = useState('');
	const [downloading, setDownloading] = useState(false);

	// Per-table export: only the entity's own admin-approved columns. The
	// backend also exposes "related" columns — flattened latest-only summaries
	// joined from other tables — but we deliberately don't surface those; an
	// export is just the table the user is looking at, nothing stitched in.
	const columns = useMemo(
		() => (cols.data?.columns ?? []).filter((c) => !c.related),
		[cols.data],
	);
	// Derived, not an effect: nothing is selected until the user ticks a box.
	// Export is opt-in per column — the user picks exactly what they want out,
	// so opening the modal never silently arms a charge for every column.
	const selected = picked ?? [];
	// Priced against the actual selection, so the number tracks the checkboxes —
	// but debounced, because the count endpoint runs a COUNT(*) over the whole
	// filtered table and someone ticking ten boxes should not fire ten of them.
	const pricedFor = useDebouncedValue(selected.join(','));
	const count = useSWR<CountResponse>(
		pricedFor ? qk.exports.count(entity, search ?? null, pricedFor.split(','), filters ?? null) : null,
	);
	// True while the debounce is still catching up, so the figure on screen is
	// never silently stale against the boxes.
	const repricing = pricedFor !== selected.join(',');

	// Row window (1-indexed, inclusive); blank = the whole filtered list. The
	// count endpoint prices the full set, so a window is re-priced client-side
	// from the per-row cost it returns (the server is still the authority).
	const matched = count.data?.matched ?? 0;
	const perRow = count.data?.credits_per_row ?? 0;
	const from = fromRow ? Math.max(1, Math.floor(Number(fromRow))) : null;
	const to = toRow ? Math.floor(Number(toRow)) : null;
	const hasRange = from !== null || to !== null;
	const offset = (from ?? 1) - 1;
	const endRow = to ?? matched;
	const rangeRows = Math.max(0, Math.min(matched, endRow) - offset);
	const rangeInvalid = hasRange && count.data != null
		&& (rangeRows === 0 || (from !== null && to !== null && to < from));

	const willExportRows = hasRange ? rangeRows : (count.data?.rows ?? 0);
	const requiredCredits = hasRange ? Math.ceil(rangeRows * perRow) : (count.data?.credits ?? 0);
	const insufficient = balance != null && count.data != null && !rangeInvalid
		&& requiredCredits > balance.total_available;

	const toggle = (key: string) =>
		setPicked(selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key]);

	const download = async () => {
		if (selected.length === 0) { toast.error('Pick at least one column'); return; }
		if (rangeInvalid) { toast.error('Check the row range'); return; }
		setDownloading(true);
		try {
			const res = await apiRequest('POST', `/api/exports/${entity}`, {
				format, columns: selected, search: search ?? undefined, filters: filters ?? undefined,
				...(hasRange ? { offset, range_limit: rangeRows } : {}),
			});
			if (!res.ok) throw new Error(String(res.status));
			const blob = await res.blob();
			const disposition = res.headers.get('Content-Disposition') ?? '';
			const named = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition)?.[1];
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = named ? decodeURIComponent(named) : `${entity}.${format}`;
			document.body.appendChild(a);
			a.click();
			a.remove();
			URL.revokeObjectURL(url);
			toast.success('Export downloaded');
			onClose();
		} catch (e) {
			// A credit refusal already raised the top-up modal with the numbers in
			// it; a toast on top would just be noise.
			if (!isInsufficientCreditsError(e)) toast.error((e as Error).message ?? 'Export failed');
		} finally { setDownloading(false); }
	};

	return (
		<div className="atlas export-overlay" role="presentation" onClick={onClose}>
			<div className="export-modal" role="dialog" aria-modal="true" aria-label={`Export ${entity}`} onClick={(e) => e.stopPropagation()}>
				<header className="export-modal__head">
					<div>
						<div className="atlas-eyebrow">Export</div>
						<h2 className="export-modal__title">{cols.data?.label ?? entity}</h2>
					</div>
					<button type="button" className="export-modal__x" aria-label="Close" onClick={onClose}><X size={16} /></button>
				</header>

				<div className="export-modal__body">
					{cols.isLoading ? <Loading /> : (
						<>
							<div className="export-modal__pickhead">
								<span className="atlas-eyebrow">Columns</span>
								<button type="button" className="export-modal__all" onClick={() => setPicked(
									selected.length === columns.length ? [] : columns.map((c) => c.key),
								)}>
									{selected.length === columns.length ? 'Clear all' : 'Select all'}
								</button>
							</div>
							<div className="export-modal__cols">
								{columns.map((c) => (
									<label key={c.key} className="export-modal__col">
										<input type="checkbox" checked={selected.includes(c.key)} onChange={() => toggle(c.key)} />
										<span>{c.label}</span>
									</label>
								))}
							</div>

							<div className="export-modal__pickhead" style={{ marginTop: 18 }}>
								<span className="atlas-eyebrow">Rows</span>
								{matched > 0 && <span className="export-modal__rowstotal">{matched.toLocaleString()} match your filters</span>}
							</div>
							<div className="export-modal__rows">
								<input type="number" min={1} inputMode="numeric" className="export-modal__rowinput"
									placeholder="From" value={fromRow} onChange={(e) => setFromRow(e.target.value)} aria-label="From row" />
								<span className="export-modal__rowsep">to</span>
								<input type="number" min={1} inputMode="numeric" className="export-modal__rowinput"
									placeholder={matched ? String(matched) : 'To'} value={toRow} onChange={(e) => setToRow(e.target.value)} aria-label="To row" />
								<span className="export-modal__rowshint">Leave blank to export all rows.</span>
							</div>
						</>
					)}
				</div>

				<footer className="export-modal__foot">
					<div className="export-modal__costwrap">
						<div className="export-modal__cost">
							{selected.length === 0 ? 'Pick at least one column'
								: rangeInvalid ? 'Check the row range'
									: (count.isLoading || repricing) ? 'Pricing…'
										: count.data
											? <>
												<strong>{willExportRows.toLocaleString()}</strong> rows ·{' '}
												<strong>{requiredCredits.toLocaleString()}</strong> credits
												{!hasRange && count.data.capped && <> · capped from {count.data.matched.toLocaleString()}</>}
												{balance != null && <span className="export-modal__bal"> · balance {balance.total_available.toLocaleString()}</span>}
											</>
											: 'Could not price this export'}
						</div>
						{insufficient && (
							<div className="export-modal__warn">
								Not enough credits for this export.{' '}
								<Link href={hrefOf('billing')} onClick={onClose}>Get more credits →</Link>
							</div>
						)}
					</div>
					<div className="export-modal__actions">
						<Combobox className="atlas-select export-modal__format" value={format} onChange={(v) => setFormat(v as 'csv' | 'xlsx')} ariaLabel="Format" options={[['csv', 'CSV'], ['xlsx', 'Excel']]} />
						<Button disabled={downloading || repricing || selected.length === 0 || rangeInvalid || insufficient} onClick={() => void download()}>
							<Download size={13} /> {downloading ? 'Preparing…' : 'Download'}
						</Button>
					</div>
				</footer>
			</div>
		</div>
	);
}
