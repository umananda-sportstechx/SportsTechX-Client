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
import Link from 'next/link';
import { Check, ChevronRight, Search, X, List, Grid3x3 } from 'lucide-react';
import { useFeatureAccessContext, type FeatureAccessResult } from '@/contexts/feature-access-context';

// ─── Facet types ──────────────────────────────────────────────────────────

export interface FacetOption {
	value: string;
	label: string;
	count?: number;
}

export type FacetKind = 'bool' | 'multi' | 'range' | 'quarter' | 'tri' | 'amount';

/** Inline quarter picker options. */
export const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'] as const;

/** Tri-toggle value (e.g. Is-SportsTech: Any / Yes / No). */
export type TriValue = 'any' | 'yes' | 'no';

/**
 * Amount-block value: a numeric range plus an "undisclosed" switch. Used for
 * round/deal value facets. `undisclosed` carries the switch position; its
 * default lives on the facet (`undisclosedDefault`).
 */
export interface AmountValue {
	min: number;
	max: number;
	undisclosed: boolean;
}

/**
 * Optional entitlement gate. When set, the facet is checked against the
 * server-driven feature matrix via `useFeatureAccess(gate)`:
 *   - entitled (right tier / per-user grant / admin) → the real control renders
 *     and works exactly like an ungated facet;
 *   - not entitled → a lock teaser renders in its place with a working
 *     "Upgrade" link to /subscriptions (the required tier comes from the matrix,
 *     NOT a hardcoded label).
 * `gate` is a feature slug (e.g. `advanced_filters`).
 */
export interface BoolFacet {
	key: string;
	label: string;
	kind: 'bool';
	section?: string;
	gate?: string;
}

export interface MultiFacet {
	key: string;
	label: string;
	kind: 'multi';
	options: () => FacetOption[];
	maxHeight?: number;
	section?: string;
	gate?: string;
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
	section?: string;
	gate?: string;
}

/** Inline Q1–Q4 multi-pick. Value is a `string[]` of selected quarter labels. */
export interface QuarterFacet {
	key: string;
	label: string;
	kind: 'quarter';
	section?: string;
	gate?: string;
}

/** Any / Yes / No tri-toggle. Value is a `TriValue`. */
export interface TriFacet {
	key: string;
	label: string;
	kind: 'tri';
	/** Label for the affirmative option (default "Yes"). */
	yesLabel?: string;
	/** Label for the negative option (default "No"). */
	noLabel?: string;
	section?: string;
	gate?: string;
}

/** Numeric range + "undisclosed" switch. Value is an `AmountValue`. */
export interface AmountFacet {
	key: string;
	label: string;
	kind: 'amount';
	min: number;
	max: number;
	step?: number;
	/** Optional fixed scale labels under the slider (else min/max are formatted). */
	scale?: string[];
	/** Switch copy, e.g. "Exclude undisclosed rounds" / "Include undisclosed deals". */
	undisclosedLabel?: string;
	undisclosedSubtext?: string;
	/** Default switch position (default `true`). */
	undisclosedDefault?: boolean;
	section?: string;
	gate?: string;
}

export type Facet = BoolFacet | MultiFacet | RangeFacet | QuarterFacet | TriFacet | AmountFacet;

export type FacetValue = boolean | string[] | [number, number] | TriValue | AmountValue | null;

// `search` is a separate top-level string field. Other keys are `FacetValue`,
// but TS's index-signature rule forces a union here. Cast through `facetVal()`
// when reading.
export interface FilterState {
	search?: string;
	[key: string]: FacetValue | string | undefined;
}

// Read a facet's value. `search` is the only top-level string key and is never
// read through here, so a string value belongs to a `tri` facet — pass it on.
function facetVal(state: FilterState, key: string): FacetValue {
	const v = state[key];
	if (v === undefined) return null;
	return v as FacetValue;
}

function amountDefault(facet: AmountFacet): AmountValue {
	return { min: facet.min, max: facet.max, undisclosed: facet.undisclosedDefault ?? true };
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function isFacetActive(facet: Facet, val: FacetValue): boolean {
	if (val == null) return false;
	if (facet.kind === 'bool') return val === true;
	if (facet.kind === 'multi' || facet.kind === 'quarter') return Array.isArray(val) && (val as string[]).length > 0;
	if (facet.kind === 'range') {
		const r = val as [number, number];
		return Array.isArray(r) && r.length === 2 && (r[0] !== facet.min || r[1] !== facet.max);
	}
	if (facet.kind === 'tri') return val === 'yes' || val === 'no';
	if (facet.kind === 'amount') {
		const a = val as AmountValue;
		const def = amountDefault(facet);
		return a.min !== def.min || a.max !== def.max || a.undisclosed !== def.undisclosed;
	}
	return false;
}

function facetActiveCount(facet: Facet, val: FacetValue): number {
	if (!isFacetActive(facet, val)) return 0;
	if (facet.kind === 'multi' || facet.kind === 'quarter') return (val as string[]).length;
	return 1;
}

export function clearFacetValue(facet: Facet): FacetValue {
	switch (facet.kind) {
		case 'bool': return false;
		case 'multi':
		case 'quarter': return [];
		case 'tri': return 'any';
		case 'amount': return amountDefault(facet);
		default: return null;
	}
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
	options, value, onChange,
}: {
	options: FacetOption[];
	value: string[];
	onChange: (v: string[]) => void;
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
			{/* No inner max-height/scroll — the option list flows within the single
			    rail scroll so users aren't fighting three nested scrollbars. Long
			    lists stay manageable via the search box above. */}
			<div className="flt-multi-list">
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

// ─── Inline quarter picker (Q1–Q4) ────────────────────────────────────────

function FRQuarter({
	value, onChange,
}: {
	value: string[];
	onChange: (v: string[]) => void;
}) {
	return (
		<div className="ff-qtr">
			{QUARTERS.map((q) => {
				const on = value.includes(q);
				return (
					<button
						key={q}
						className={`ff-qtr-row ${on ? 'on' : ''}`}
						onClick={() => onChange(on ? value.filter((v) => v !== q) : [...value, q])}
					>
						<span className={`flt-check ${on ? 'on' : ''}`}>{on && <Check size={10} />}</span>
						<span className="ff-qtr-label">{q}</span>
					</button>
				);
			})}
		</div>
	);
}

// ─── Tri-toggle (Any / Yes / No) ───────────────────────────────────────────

function FRTri({
	facet, value, onChange,
}: {
	facet: TriFacet;
	value: TriValue;
	onChange: (v: TriValue) => void;
}) {
	const opts: Array<[TriValue, string]> = [
		['any', 'Any'],
		['yes', facet.yesLabel ?? 'Yes'],
		['no', facet.noLabel ?? 'No'],
	];
	return (
		<div className="mf-tri" role="group" aria-label={facet.label}>
			{opts.map(([v, label]) => (
				<button
					key={v}
					type="button"
					className={`mf-tri-btn ${value === v ? 'on' : ''}`}
					aria-pressed={value === v}
					onClick={() => onChange(v)}
				>
					{label}
				</button>
			))}
		</div>
	);
}

// ─── Amount block (min/max + dual slider + undisclosed switch) ─────────────

function fmtAmountM(v: number): string {
	return v >= 1000 ? `$${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}B` : `$${v}M`;
}

function FRAmount({
	facet, value, onChange,
}: {
	facet: AmountFacet;
	value: AmountValue;
	onChange: (v: AmountValue) => void;
}) {
	const { min, max } = facet;
	const step = facet.step ?? 25;
	const lo = value.min;
	const hi = value.max;
	const pctLo = ((lo - min) / (max - min)) * 100;
	const pctHi = ((hi - min) / (max - min)) * 100;
	const set = (patch: Partial<AmountValue>) => onChange({ ...value, ...patch });
	return (
		<div className="ff-amt mf-value">
			<div className="ff-amt-inputs">
				<div className="ff-amt-input">
					<span className="ff-amt-k">MIN</span>
					<span className="ff-amt-prefix">$</span>
					<input
						value={lo}
						inputMode="numeric"
						onChange={(e) => set({ min: Math.min(Math.max(min, +e.target.value || min), hi) })}
					/>
				</div>
				<span className="ff-amt-dash">–</span>
				<div className="ff-amt-input">
					<span className="ff-amt-k">MAX</span>
					<span className="ff-amt-prefix">$</span>
					<input
						value={hi}
						inputMode="numeric"
						onChange={(e) => set({ max: Math.max(Math.min(max, +e.target.value || max), lo) })}
					/>
				</div>
			</div>

			<div className="mf-slider">
				<div className="mf-slider-track">
					<div className="mf-slider-fill" style={{ left: `${pctLo}%`, right: `${100 - pctHi}%` }} />
				</div>
				<input type="range" min={min} max={max} step={step} value={lo} onChange={(e) => set({ min: Math.min(+e.target.value, hi) })} />
				<input type="range" min={min} max={max} step={step} value={hi} onChange={(e) => set({ max: Math.max(+e.target.value, lo) })} />
			</div>

			<div className="ff-amt-scale">
				{facet.scale
					? facet.scale.map((s, i) => <span key={i}>{s}</span>)
					: (<><span>{fmtAmountM(lo)}</span><span>{fmtAmountM(hi)}{hi === max ? '+' : ''}</span></>)}
			</div>

			<button
				type="button"
				className={`ff-amt-toggle ${value.undisclosed ? 'on' : ''}`}
				onClick={() => set({ undisclosed: !value.undisclosed })}
			>
				<span className={`ff-switch ${value.undisclosed ? 'on' : ''}`}>
					<span className="ff-switch-thumb" />
				</span>
				<span className="ff-amt-toggle-text">
					<span className="ff-amt-toggle-l">{facet.undisclosedLabel ?? 'Include undisclosed'}</span>
					{facet.undisclosedSubtext && <span className="ff-amt-toggle-s">{facet.undisclosedSubtext}</span>}
				</span>
			</button>
		</div>
	);
}

// ─── Tier-lock badge (PRO / GROWTH) ───────────────────────────────────────

function TierLock({ tier }: { tier: 'GROWTH' | 'PRO' }) {
	return (
		<span className={`flt-tier flt-tier-${tier}`}>
			<svg width="8" height="9" viewBox="0 0 8 9" fill="none" aria-hidden="true">
				<path d="M2 4V2.5a2 2 0 1 1 4 0V4" stroke="currentColor" strokeWidth="1.1" fill="none" />
				<rect x="1" y="4" width="6" height="4.5" rx="0.5" fill="currentColor" />
			</svg>
			{tier}
		</span>
	);
}

/**
 * Lock teaser for a gated facet the current user isn't entitled to. The header
 * is a real link to /subscriptions (unlike the old purely-visual teaser), and
 * the tier badge reflects the minimum tier from the feature matrix.
 */
function LockedGroup({ label, requiredTier }: { label: string; requiredTier: FeatureAccessResult['requiredTier'] }) {
	const tier: 'GROWTH' | 'PRO' = requiredTier === 'pro' ? 'PRO' : 'GROWTH';
	return (
		<div className="flt-group locked">
			<Link href="/subscriptions" className="flt-group-h" title={`Unlock with ${tier === 'PRO' ? 'Pro' : 'Growth'}`}>
				<span className="flt-group-title">{label}</span>
				<span className="flt-group-meta">
					<TierLock tier={tier} />
				</span>
			</Link>
		</div>
	);
}

// ─── Rail group (collapsible) ─────────────────────────────────────────────

function FRGroup({
	facet, state, setState, defaultOpen, access,
}: {
	facet: Facet;
	state: FilterState;
	setState: (s: FilterState) => void;
	defaultOpen: boolean;
	/** Entitlement result for `facet.gate`, or null when the facet is ungated. */
	access: FeatureAccessResult | null;
}) {
	// Gated facet: while entitlement is unknown (matrix loading or failed to
	// load) render nothing — showing a lock teaser then flipping it once the
	// matrix resolves caused a brief wrong-lock flash for entitled users.
	if (facet.gate && (access?.isLoading || access?.error)) return null;
	// Confirmed locked → lock teaser instead of the control.
	if (facet.gate && access?.isLocked) {
		return <LockedGroup label={facet.label} requiredTier={access.requiredTier} />;
	}

	const val = facetVal(state, facet.key);
	const [open, setOpen] = useState(defaultOpen ?? isFacetActive(facet, val));
	const count = facetActiveCount(facet, val);
	const onChange = (v: FacetValue) => setState({ ...state, [facet.key]: v });
	const onClear = (e: React.MouseEvent) => {
		e.stopPropagation();
		onChange(clearFacetValue(facet));
	};

	const toggle = () => setOpen((o) => !o);
	return (
		<div className={`flt-group ${open ? 'open' : ''}`}>
			{/* Header is a div, not a button — it contains a nested <button> for
			    "clear N", and HTML forbids nesting interactive elements. */}
			<div
				className="flt-group-h"
				role="button"
				tabIndex={0}
				aria-expanded={open}
				onClick={toggle}
				onKeyDown={(e) => {
					if (e.key === 'Enter' || e.key === ' ') {
						e.preventDefault();
						toggle();
					}
				}}
			>
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
			</div>
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
						/>
					)}
					{facet.kind === 'range' && (
						<FRRangeControl
							facet={facet}
							value={val as [number, number] | null}
							onChange={(v) => onChange(v)}
						/>
					)}
					{facet.kind === 'quarter' && (
						<FRQuarter
							value={(val as string[]) ?? []}
							onChange={(v) => onChange(v)}
						/>
					)}
					{facet.kind === 'tri' && (
						<FRTri
							facet={facet}
							value={(val as TriValue) ?? 'any'}
							onChange={(v) => onChange(v)}
						/>
					)}
					{facet.kind === 'amount' && (
						<FRAmount
							facet={facet}
							value={(val as AmountValue) ?? amountDefault(facet)}
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
	facets, state, setState, defaultOpen = {}, title = 'Filters', topSlot,
}: {
	facets: Facet[];
	state: FilterState;
	setState: (s: FilterState) => void;
	defaultOpen?: Record<string, boolean>;
	title?: string;
	/** Optional content rendered directly under the rail head (e.g. a mode
	 *  toggle on the Funding rail). */
	topSlot?: ReactNode;
}) {
	// `checkAccess` is a plain function (not a hook), safe to call per gated
	// facet inside the render loop. Drives the per-facet lock teaser.
	const { checkAccess } = useFeatureAccessContext();
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

			{topSlot}

			{boolFacets.length > 0 && (
				<div className="flt-status flt-status-flat">
					<FRStatusBlock facets={boolFacets} state={state} setState={setState} />
				</div>
			)}

			{/* Group remaining facets by `section`. Facets without one render flat. */}
			{(() => {
				const out: ReactNode[] = [];
				let currentSection: string | undefined;
				for (const f of otherFacets) {
					if (f.section !== currentSection) {
						currentSection = f.section;
						if (currentSection) {
							out.push(
								<div key={`sec-${currentSection}`} className="flt-section-h">
									{currentSection}
								</div>,
							);
						}
					}
					out.push(
						<FRGroup
							key={f.key}
							facet={f}
							state={state}
							setState={setState}
							defaultOpen={defaultOpen[f.key] ?? isFacetActive(f, facetVal(state, f.key))}
							access={f.gate ? checkAccess(f.gate) : null}
						/>,
					);
				}
				return out;
			})()}
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
		} else if (f.kind === 'quarter') {
			chips.push({ key: f.key, label: f.label, value: (v as string[]).join(', '), facet: f });
		} else if (f.kind === 'tri') {
			chips.push({ key: f.key, label: f.label, value: v === 'yes' ? (f.yesLabel ?? 'Yes') : (f.noLabel ?? 'No'), facet: f });
		} else if (f.kind === 'amount') {
			const a = v as AmountValue;
			chips.push({ key: f.key, label: f.label, value: `${fmtAmountM(a.min)} – ${fmtAmountM(a.max)}${a.max >= f.max ? '+' : ''}`, facet: f });
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
