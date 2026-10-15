'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Input, cx } from '@/components/atlas';
import { useLocationFacetOptions } from '@/hooks/use-catalog-options';

/**
 * City field with a proper Atlas-styled autocomplete — a free-text input (so a
 * city not in our data can still be typed) with a portalled suggestion panel
 * that reuses the combobox's look, so it matches the Country dropdown beside it.
 *
 * The panel is portalled to <body> with fixed positioning (and flips above when
 * there's no room below), so it is never clipped by the setup modal's overflow —
 * the native `<datalist>` this replaces rendered as a clunky grey OS control.
 *
 * Suggestions come from `GET /api/locations/facets` (the cities already in our
 * data). They are NOT yet country-scoped: that list has no country mapping, so
 * narrowing to the chosen country needs a country→cities dataset (a data task).
 */
export function CityInput({ value, onChange, id, disabled, className, placeholder = 'City' }: {
	value: string;
	onChange: (value: string) => void;
	id?: string;
	disabled?: boolean;
	className?: string;
	placeholder?: string;
}) {
	const loc = useLocationFacetOptions();
	const [open, setOpen] = useState(false);
	const [active, setActive] = useState(0);
	const [pos, setPos] = useState<{ left: number; width: number; top?: number; bottom?: number; maxH: number } | null>(null);
	const wrapRef = useRef<HTMLDivElement>(null);
	const panelRef = useRef<HTMLDivElement>(null);

	const q = value.trim().toLowerCase();
	// Up to 8 suggestions, prefix matches before substring matches. Capped so a
	// flat list of thousands of cities never renders in full.
	const matches = useMemo(() => {
		if (!q) return [] as string[];
		const starts: string[] = [], contains: string[] = [];
		for (const [c] of loc.city) {
			const lc = c.toLowerCase();
			if (lc === q) continue;
			if (lc.startsWith(q)) starts.push(c);
			else if (contains.length < 8 && lc.includes(q)) contains.push(c);
			if (starts.length >= 8) break;
		}
		return [...starts, ...contains].slice(0, 8);
	}, [q, loc.city]);

	const showPanel = open && !disabled && matches.length > 0;

	const place = () => {
		const r = wrapRef.current?.getBoundingClientRect();
		if (!r) return;
		const gap = 4, margin = 8, want = 260;
		const below = window.innerHeight - r.bottom - margin;
		const above = r.top - margin;
		if (below >= Math.min(want, 160) || below >= above) {
			setPos({ left: r.left, width: r.width, top: r.bottom + gap, maxH: Math.min(want, below) });
		} else {
			setPos({ left: r.left, width: r.width, bottom: window.innerHeight - r.top + gap, maxH: Math.min(want, above) });
		}
	};
	useLayoutEffect(() => { if (showPanel) place(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [showPanel, matches.length]);
	useEffect(() => {
		if (!showPanel) return;
		const h = () => place();
		window.addEventListener('scroll', h, true);
		window.addEventListener('resize', h);
		const away = (e: MouseEvent) => {
			const t = e.target as Node;
			if (!wrapRef.current?.contains(t) && !panelRef.current?.contains(t)) setOpen(false);
		};
		document.addEventListener('mousedown', away);
		return () => {
			window.removeEventListener('scroll', h, true);
			window.removeEventListener('resize', h);
			document.removeEventListener('mousedown', away);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [showPanel]);

	const pick = (c: string) => { onChange(c); setOpen(false); };
	const onKey = (e: React.KeyboardEvent) => {
		if (!showPanel) return;
		if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(matches.length - 1, i + 1)); }
		else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(0, i - 1)); }
		else if (e.key === 'Enter') { const c = matches[active]; if (c) { e.preventDefault(); pick(c); } }
		else if (e.key === 'Escape') { setOpen(false); }
	};

	return (
		<div ref={wrapRef} style={{ position: 'relative' }}>
			<Input
				id={id}
				className={className}
				value={value}
				disabled={disabled}
				placeholder={placeholder}
				autoComplete="off"
				onChange={(e) => { onChange(e.target.value); setActive(0); setOpen(true); }}
				onFocus={() => setOpen(true)}
				onKeyDown={onKey}
			/>
			{showPanel && pos && createPortal(
				<div className="atlas">
					<div
						ref={panelRef}
						className="atlas-combo-panel"
						style={{ top: pos.top, bottom: pos.bottom, left: pos.left, width: pos.width, maxHeight: pos.maxH }}
						role="listbox"
					>
						<div className="atlas-combo-list">
							{matches.map((c, i) => (
								<button
									key={c}
									type="button"
									role="option"
									aria-selected={i === active}
									className={cx('atlas-combo-opt', i === active && 'is-active')}
									onMouseEnter={() => setActive(i)}
									// mousedown, not click: fire before the input blurs and closes the panel.
									onMouseDown={(e) => { e.preventDefault(); pick(c); }}
								>
									<span>{c}</span>
								</button>
							))}
						</div>
					</div>
				</div>,
				document.body,
			)}
		</div>
	);
}
