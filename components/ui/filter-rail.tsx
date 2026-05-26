'use client';

/**
 * Faceted left-rail filter system, ported from
 * `ui_design_2/app/filter-rail.jsx`. Shared across Companies, Funding, M&A,
 * Investors, Programs, Events.
 *
 * Each consuming page declares its own `facets` array — this component owns
 * the rendering, collapse state, active-chip strip, and search box.
 *
 * Three facet kinds:
 *   - `bool`   single-toggle row (Verified, Raising, …)
 *   - `multi`  multi-select option list (with optional counts)
 *   - `range`  dual-handle numeric range
 *
 * State shape:
 *   {
 *     search?: string,
 *     [facetKey]: boolean | string[] | [number, number] | null
 *   }
 *
 * The page wires the resulting state into its SWR query so the backend
 * filters — no client-side filtering happens here.
 */

import { useState, type ReactNode } from 'react';
import { Check, ChevronRight, Search, X, List, Grid3x3 } from 'lucide-react';

// ─── Facet types ──────────────────────────────────────────────────────────

export interface FacetOption {
	value: string;
	label: string;
	count?: number;
}

export type FacetKind = 'bool' | 'multi' | 'range';

export interface BoolFacet {
	key: string;
	label: string;
	kind: 'bool';
}

export interface MultiFacet {
	key: string;
	label: string;
	kind: 'multi';
	options: () => FacetOption[];
	maxHeight?: number;
}

export interface RangeFacet {
	key: string;
	label: string;
	kind: 'range';
	min: number;
	max: number;
	step?: number;
	prefix?: string;
	suffix?: string;
}

export type Facet = BoolFacet | MultiFacet | RangeFacet;

export type FacetValue = boolean | string[] | [number, number] | null;

// `search` is a separate top-level string field. Other keys are `FacetValue`,
// but TS's index-signature rule forces a union here. Cast through `facetVal()`
// when reading.
export interface FilterState {
	search?: string;
	[key: string]: FacetValue | string | undefined;
}

function facetVal(state: FilterState, key: string): FacetValue {
	const v = state[key];
	if (v === undefined) return null;
	if (typeof v === 'string') return null;
	return v;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function isFacetActive(facet: Facet, val: FacetValue): boolean {
	if (val == null) return false;
	if (facet.kind === 'bool') return val === true;
	if (facet.kind === 'multi') return Array.isArray(val) && (val as string[]).length > 0;
	if (facet.kind === 'range') {
		const r = val as [number, number];
		return Array.isArray(r) && r.length === 2 && (r[0] !== facet.min || r[1] !== facet.max);
	}
	return false;
}

function facetActiveCount(facet: Facet, val: FacetValue): number {
	if (!isFacetActive(facet, val)) return 0;
	if (facet.kind === 'multi') return (val as string[]).length;
	return 1;
}

export function clearFacetValue(facet: Facet): FacetValue {
	return facet.kind === 'bool' ? false : facet.kind === 'multi' ? [] : null;
}

function totalActiveFilters(facets: Facet[], state: FilterState): number {
	return facets.reduce((sum, f) => sum + facetActiveCount(f, facetVal(state, f.key)), 0);
}

export function emptyFilterState(facets: Facet[], extras: Partial<FilterState> = {}): FilterState {
	const out: FilterState = { ...extras };
	facets.forEach((f) => { out[f.key] = clearFacetValue(f); });
	return out;
}

// ─── Inner controls ───────────────────────────────────────────────────────

function FRMultiSelect({
	options, value, onChange, maxHeight = 180,
}: {
	options: FacetOption[];
	value: string[];
	onChange: (v: string[]) => void;
	maxHeight?: number;
}) {
	const [q, setQ] = useState('');
	const filtered = options.filter((o) => !q || o.label.toLowerCase().includes(q.toLowerCase()));
	const showSearch = options.length > 8;
	return (
		<div className="flt-multi">
			{showSearch && (
				<input
					className="flt-multi-search"
					placeholder="Search…"
					value={q}
					onChange={(e) => setQ(e.target.value)}
				/>
			)}
			<div className="flt-multi-list" style={{ maxHeight }}>
				{filtered.map((o) => {
					const on = value.includes(o.value);
					return (
						<button
							key={o.value}
							className={`flt-multi-row ${on ? 'on' : ''}`}
							onClick={() => onChange(on ? value.filter((v) => v !== o.value) : [...value, o.value])}
						>
							<span className={`flt-check ${on ? 'on' : ''}`}>{on && <Check size={10} />}</span>
							<span className="flt-multi-label">{o.label}</span>
							{o.count != null && <span className="flt-multi-count">{o.count}</span>}
						</button>
					);
				})}
				{filtered.length === 0 && <div className="flt-empty">No matches</div>}
			</div>
		</div>
	);
}

function FRRangeControl({
	facet, value, onChange,
}: {
	facet: RangeFacet;
	value: [number, number] | null;
	onChange: (v: [number, number]) => void;
}) {
	const step = facet.step ?? 1;
	const [lo, hi] = value || [facet.min, facet.max];
	const fmt = (v: number) => `${facet.prefix || ''}${v}${facet.suffix || ''}`;
	return (
		<div className="flt-range">
			<div className="flt-range-vals">
				<span>{fmt(lo)}</span>
				<span className="flt-range-dash">–</span>
				<span>{fmt(hi)}</span>
			</div>
			<div className="flt-range-inputs">
				<input
					type="range"
					min={facet.min}
					max={facet.max}
					step={step}
					value={lo}
					onChange={(e) => onChange([Math.min(+e.target.value, hi - step), hi])}
				/>
				<input
					type="range"
					min={facet.min}
					max={facet.max}
					step={step}
					value={hi}
					onChange={(e) => onChange([lo, Math.max(+e.target.value, lo + step)])}
				/>
			</div>
			<div className="flt-range-labels">
				<span>{fmt(facet.min)}</span>
				<span>{fmt(facet.max)}</span>
			</div>
		</div>
	);
}

function FRBoolRow({
	facet, value, onChange,
}: {
	facet: BoolFacet;
	value: boolean;
	onChange: (v: boolean) => void;
}) {
	return (
		<button className={`flt-bool-row ${value ? 'on' : ''}`} onClick={() => onChange(!value)}>
			<span className={`flt-check ${value ? 'on' : ''}`}>{value && <Check size={10} />}</span>
			<span className="flt-bool-label">{facet.label}</span>
		</button>
	);
}

// ─── Rail group (collapsible) ─────────────────────────────────────────────

function FRGroup({
	facet, state, setState, defaultOpen,
}: {
	facet: Facet;
	state: FilterState;
	setState: (s: FilterState) => void;
	defaultOpen: boolean;
}) {
	const val = facetVal(state, facet.key);
	const [open, setOpen] = useState(defaultOpen ?? isFacetActive(facet, val));
	const count = facetActiveCount(facet, val);
	const onChange = (v: FacetValue) => setState({ ...state, [facet.key]: v });
	const onClear = (e: React.MouseEvent) => {
		e.stopPropagation();
		onChange(clearFacetValue(facet));
	};

	return (
		<div className={`flt-group ${open ? 'open' : ''}`}>
			<button className="flt-group-h" onClick={() => setOpen((o) => !o)}>
				<span className="flt-group-title">{facet.label}</span>
				<span className="flt-group-meta">
					{count > 0 && (
						<button className="flt-group-count" onClick={onClear} title="Clear">
							{count}
							<X size={8} />
						</button>
					)}
					<ChevronRight size={10} className="flt-group-chev" />
				</span>
			</button>
			{open && (
				<div className="flt-group-body">
					{facet.kind === 'bool' && (
						<FRBoolRow
							facet={facet}
							value={(val as boolean) ?? false}
							onChange={(v) => onChange(v)}
						/>
					)}
					{facet.kind === 'multi' && (
						<FRMultiSelect
							options={facet.options()}
							value={(val as string[]) ?? []}
							onChange={(v) => onChange(v)}
							maxHeight={facet.maxHeight}
						/>
					)}
					{facet.kind === 'range' && (
						<FRRangeControl
							facet={facet}
							value={val as [number, number] | null}
							onChange={(v) => onChange(v)}
						/>
					)}
				</div>
			)}
		</div>
	);
}

function FRStatusBlock({
	facets, state, setState,
}: {
	facets: BoolFacet[];
	state: FilterState;
	setState: (s: FilterState) => void;
}) {
	return (
		<div className="flt-status">
			{facets.map((f) => (
				<FRBoolRow
					key={f.key}
					facet={f}
					value={(facetVal(state, f.key) as boolean) ?? false}
					onChange={(v) => setState({ ...state, [f.key]: v })}
				/>
			))}
		</div>
	);
}

// ─── Main FilterRail ──────────────────────────────────────────────────────

export function FilterRail({
	facets, state, setState, defaultOpen = {}, title = 'Filters',
}: {
	facets: Facet[];
	state: FilterState;
	setState: (s: FilterState) => void;
	defaultOpen?: Record<string, boolean>;
	title?: string;
}) {
	const boolFacets = facets.filter((f): f is BoolFacet => f.kind === 'bool');
	const otherFacets = facets.filter((f) => f.kind !== 'bool');
	const activeTotal = totalActiveFilters(facets, state);

	const resetAll = () => setState(emptyFilterState(facets, { search: state.search ?? '' }));

	return (
		<aside className="flt-rail">
			<div className="flt-rail-head">
				<span className="flt-rail-title">
					{title}
					{activeTotal > 0 && <span className="flt-rail-active">{activeTotal} active</span>}
				</span>
				<button className="flt-rail-reset" onClick={resetAll} disabled={activeTotal === 0}>
					Reset
				</button>
			</div>

			{boolFacets.length > 0 && (
				<div className="flt-group open">
					<div className="flt-group-h flt-group-h-static">
						<span className="flt-group-title">Status</span>
					</div>
					<div className="flt-group-body">
						<FRStatusBlock facets={boolFacets} state={state} setState={setState} />
					</div>
				</div>
			)}

			{otherFacets.map((f) => (
				<FRGroup
					key={f.key}
					facet={f}
					state={state}
					setState={setState}
					defaultOpen={defaultOpen[f.key] ?? isFacetActive(f, facetVal(state, f.key))}
				/>
			))}
		</aside>
	);
}

// ─── ViewToggle + ActiveFiltersBar ────────────────────────────────────────

export function ViewToggle({
	view, setView,
}: {
	view: 'table' | 'grid';
	setView: (v: 'table' | 'grid') => void;
}) {
	return (
		<div className="flt-view-toggle" role="group" aria-label="View">
			<button className={`flt-view-btn ${view === 'table' ? 'on' : ''}`} onClick={() => setView('table')} title="Table view">
				<List size={14} />
			</button>
			<button className={`flt-view-btn ${view === 'grid' ? 'on' : ''}`} onClick={() => setView('grid')} title="Tiled view">
				<Grid3x3 size={14} />
			</button>
		</div>
	);
}

export function ActiveFiltersBar({
	facets, state, setState, placeholder = 'Search…', total, shown, viewToggle,
}: {
	facets: Facet[];
	state: FilterState;
	setState: (s: FilterState) => void;
	placeholder?: string;
	total?: number;
	shown?: number;
	viewToggle?: ReactNode;
}) {
	const chips: Array<{ key: string; label: string; value?: string; facet: Facet }> = [];
	facets.forEach((f) => {
		const v = facetVal(state, f.key);
		if (!isFacetActive(f, v)) return;
		if (f.kind === 'bool') {
			chips.push({ key: f.key, label: f.label, facet: f });
			return;
		} else if (f.kind === 'multi') {
			const opts = f.options();
			const labels = (v as string[]).map((val) => opts.find((o) => o.value === val)?.label || val);
			chips.push({
				key: f.key,
				label: f.label,
				value: labels.length > 2 ? `${labels.length} selected` : labels.join(', '),
				facet: f,
			});
		} else if (f.kind === 'range') {
			const r = v as [number, number];
			const fmt = (x: number) => `${f.prefix || ''}${x}${f.suffix || ''}`;
			chips.push({ key: f.key, label: f.label, value: `${fmt(r[0])} – ${fmt(r[1])}`, facet: f });
		}
	});

	return (
		<div className="flt-toolbar">
			<div className="flt-search">
				<Search size={13} className="flt-search-icon" />
				<input
					className="flt-search-input"
					placeholder={placeholder}
					value={state.search ?? ''}
					onChange={(e) => setState({ ...state, search: e.target.value })}
				/>
				{state.search && (
					<button className="flt-search-clear" onClick={() => setState({ ...state, search: '' })}>
						<X size={10} />
					</button>
				)}
			</div>

			{chips.length > 0 && (
				<div className="flt-active-chips">
					{chips.map((ch) => (
						<span key={ch.key} className="flt-active-chip">
							<span className="flt-active-chip-k">{ch.label}</span>
							{ch.value && <span className="flt-active-chip-v">{ch.value}</span>}
							<button
								className="flt-active-chip-x"
								onClick={() => setState({ ...state, [ch.key]: clearFacetValue(ch.facet) })}
								title={`Clear ${ch.label}`}
							>
								<X size={9} />
							</button>
						</span>
					))}
				</div>
			)}

			<div className="flt-toolbar-right">
				{total != null && (
					<span className="flt-result-meta">
						<b>{shown ?? total}</b> of {total}
					</span>
				)}
				{viewToggle}
			</div>
		</div>
	);
}
