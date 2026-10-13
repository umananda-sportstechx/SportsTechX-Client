'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Search } from 'lucide-react';
import { cx } from './cx';

/**
 * One custom dropdown for the whole app, replacing the native `<select>`.
 *
 * Native selects render the OS popup — a grey system list that ignores the
 * Atlas tokens and looks foreign in both the filter rails and the claim modal.
 * This is the Atlas-styled replacement: a trigger that wears the same field
 * class (`atlas-select` / `cm-select`, so every call site keeps its box) and a
 * portalled panel with type-to-filter and keyboard nav.
 *
 * The panel is portalled to `<body>` with fixed positioning so it is never
 * clipped by a scroll container or a modal's overflow — the one real failure
 * mode of an in-flow dropdown inside the claim modal.
 *
 * Value contract matches a controlled select: `value` + `onChange(value)`.
 * Grouped options (Regions / Countries) are supported for the location picker.
 */
export type ComboOption = [value: string, label: string];
export interface ComboGroup { label: string; options: ComboOption[] }

interface Props {
	value: string;
	onChange: (value: string) => void;
	options?: ComboOption[];
	groups?: ComboGroup[];
	placeholder?: string;
	disabled?: boolean;
	id?: string;
	/** Applied to the trigger so it keeps the call site's field style. */
	className?: string;
	/** Inline style for the trigger (e.g. a fixed width in a pill filter row). */
	style?: React.CSSProperties;
	ariaLabel?: string;
}

const flatten = (options?: ComboOption[], groups?: ComboGroup[]): ComboOption[] =>
	groups ? groups.flatMap((g) => g.options) : (options ?? []);

export function Combobox({ value, onChange, options, groups, placeholder = 'Select…', disabled, id, className, style, ariaLabel }: Props) {
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState('');
	const [active, setActive] = useState(0);
	const [pos, setPos] = useState<{ left: number; width: number; top?: number; bottom?: number; maxH: number } | null>(null);
	const triggerRef = useRef<HTMLButtonElement>(null);
	const panelRef = useRef<HTMLDivElement>(null);

	const all = useMemo(() => flatten(options, groups), [options, groups]);
	const selectedLabel = useMemo(() => all.find(([v]) => v === value)?.[1] ?? (value || ''), [all, value]);
	const bigList = all.length > 8;

	// Filter by label (case-insensitive substring), keeping the group shape so
	// the location picker still reads as Regions / Countries while narrowing.
	const q = query.trim().toLowerCase();
	const match = (o: ComboOption) => !q || o[1].toLowerCase().includes(q);
	const renderGroups = useMemo<{ label?: string; options: ComboOption[] }[]>(() => {
		if (groups) return groups.map((g) => ({ label: g.label, options: g.options.filter(match) })).filter((g) => g.options.length);
		return [{ options: (options ?? []).filter(match) }];
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [groups, options, q]);
	const visible = useMemo(() => renderGroups.flatMap((g) => g.options), [renderGroups]);

	// Open downward by default, but flip above the trigger when there isn't room
	// below (a country select low in the claim modal would otherwise run off the
	// bottom of the viewport). `position: fixed`, so this is viewport space.
	const place = () => {
		const r = triggerRef.current?.getBoundingClientRect();
		if (!r) return;
		const gap = 4, margin = 8, want = 320;
		const below = window.innerHeight - r.bottom - margin;
		const above = r.top - margin;
		// Match the trigger width — long labels (e.g. full sector paths) wrap
		// rather than widening the panel, so short dropdowns aren't oversized.
		const width = r.width;
		if (below >= Math.min(want, 180) || below >= above) {
			setPos({ left: r.left, width, top: r.bottom + gap, maxH: Math.min(want, below) });
		} else {
			setPos({ left: r.left, width, bottom: window.innerHeight - r.top + gap, maxH: Math.min(want, above) });
		}
	};
	useLayoutEffect(() => {
		if (!open) return;
		place();
		setQuery('');
		setActive(Math.max(0, visible.findIndex(([v]) => v === value)));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open]);
	useEffect(() => {
		if (!open) return;
		const h = () => place();
		window.addEventListener('scroll', h, true);
		window.addEventListener('resize', h);
		const away = (e: MouseEvent) => {
			const tgt = e.target as Node;
			if (!triggerRef.current?.contains(tgt) && !panelRef.current?.contains(tgt)) setOpen(false);
		};
		document.addEventListener('mousedown', away);
		return () => {
			window.removeEventListener('scroll', h, true);
			window.removeEventListener('resize', h);
			document.removeEventListener('mousedown', away);
		};
	}, [open]);

	const pick = (v: string) => { onChange(v); setOpen(false); triggerRef.current?.focus(); };

	// Keyboard while open is driven from a capture-phase document listener, not a
	// React handler on the panel: the panel is portalled to <body>, and Escape
	// must not also reach a host's window keydown (the claim modal closes on
	// Escape) — stopPropagation in the capture phase prevents that bubble. It
	// also works regardless of whether focus sits on the search input or trigger.
	useEffect(() => {
		if (!open) return;
		const onKeyCap = (e: KeyboardEvent) => {
			if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setOpen(false); triggerRef.current?.focus(); }
			else if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(visible.length - 1, i + 1)); }
			else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(0, i - 1)); }
			else if (e.key === 'Enter') { e.preventDefault(); const o = visible[active]; if (o) pick(o[0]); }
		};
		document.addEventListener('keydown', onKeyCap, true);
		return () => document.removeEventListener('keydown', onKeyCap, true);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open, visible, active]);

	// Keep the keyboard-highlighted option in view in a long (scrolled) list.
	useEffect(() => {
		if (!open) return;
		panelRef.current?.querySelector<HTMLElement>(`[data-ci="${active}"]`)?.scrollIntoView({ block: 'nearest' });
	}, [active, open]);

	// Trigger only needs to handle opening; once open the document listener drives.
	const onTriggerKey = (e: React.KeyboardEvent) => {
		if (disabled || open) return;
		if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); }
	};

	return (
		<>
			<button
				type="button"
				ref={triggerRef}
				id={id}
				style={style}
				disabled={disabled}
				aria-label={ariaLabel}
				aria-haspopup="listbox"
				aria-expanded={open}
				className={cx(className, 'atlas-combo', !selectedLabel && 'atlas-combo--placeholder', open && 'atlas-combo--open')}
				onClick={() => !disabled && setOpen((o) => !o)}
				onKeyDown={onTriggerKey}
			>
				<span className="atlas-combo__label">{selectedLabel || placeholder}</span>
				<ChevronDown size={15} className="atlas-combo__chev" aria-hidden="true" />
			</button>
			{open && pos && createPortal(
				<div className="atlas">
					<div
						ref={panelRef}
						className="atlas-combo-panel"
						style={{ top: pos.top, bottom: pos.bottom, left: pos.left, width: pos.width, maxHeight: pos.maxH }}
						role="listbox"
					>
						{bigList && (
							<div className="atlas-combo-search">
								<Search size={14} aria-hidden="true" />
								<input
									autoFocus
									value={query}
									placeholder="Type to filter…"
									onChange={(e) => { setQuery(e.target.value); setActive(0); }}
								/>
							</div>
						)}
						<div className="atlas-combo-list">
							{visible.length === 0 && <div className="atlas-combo-empty">No matches</div>}
							{renderGroups.map((g, gi) => (
								<div key={g.label ?? gi}>
									{g.label && <div className="atlas-combo-grouplabel">{g.label}</div>}
									{g.options.map(([v, l]) => {
										const idx = visible.findIndex(([vv]) => vv === v);
										return (
											<button
												key={v}
												type="button"
												role="option"
												data-ci={idx}
												aria-selected={v === value}
												className={cx('atlas-combo-opt', v === value && 'is-selected', idx === active && 'is-active')}
												onMouseEnter={() => setActive(idx)}
												onClick={() => pick(v)}
											>
												<span>{l}</span>
												{v === value && <Check size={14} aria-hidden="true" />}
											</button>
										);
									})}
								</div>
							))}
						</div>
					</div>
				</div>,
				document.body,
			)}
		</>
	);
}
