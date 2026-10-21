'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import useSWR from 'swr';
import { Input, cx } from '@/components/atlas';
import { useDebouncedValue } from '@/hooks/use-debounced-value';

/**
 * City field with a debounced, Atlas-styled autocomplete.
 *
 * Suggestions come from `GET /api/locations/search?q=` — the ranked location
 * typeahead (reference.repository.searchLocations): real places from the
 * `locations` table, ordered by how many catalog records sit there (major
 * cities first), de-duplicated on (city, state, country). Each hit carries its
 * country, shown beside the city so same-named places are distinguishable. The
 * query is debounced (250ms, min 2 chars) so it fires on a pause, not a keystroke.
 *
 * It stays free text — typing a city that isn't in the data is allowed. The
 * panel is portalled to <body> (fixed, flips up when cramped) so it is never
 * clipped by the setup modal's overflow, matching the Country dropdown's look.
 */
interface LocHit { city: string | null; state: string | null; country: string | null }

export function CityInput({ value, onChange, id, disabled, className, placeholder = 'City', geo }: {
	value: string;
	onChange: (value: string) => void;
	id?: string;
	disabled?: boolean;
	className?: string;
	placeholder?: string;
	/** Scope the suggestions to a chosen country / region / continent (e.g. the
	 *  sibling country field) so picking "India" only offers Indian cities. */
	geo?: string;
}) {
	const [open, setOpen] = useState(false);
	const [active, setActive] = useState(0);
	const [pos, setPos] = useState<{ left: number; width: number; top?: number; bottom?: number; maxH: number } | null>(null);
	const wrapRef = useRef<HTMLDivElement>(null);
	const panelRef = useRef<HTMLDivElement>(null);

	const debounced = useDebouncedValue(value.trim(), 250);
	const g = geo?.trim() || undefined;
	const { data } = useSWR<LocHit[]>(debounced.length >= 2 ? ['/api/locations/search', { q: debounced, ...(g ? { geo: g } : {}) }] : null);

	const matches = useMemo(() => {
		const seen = new Set<string>(), out: { city: string; country: string | null }[] = [];
		for (const r of data ?? []) {
			if (!r.city) continue;
			const k = `${r.city.toLowerCase()}|${(r.country ?? '').toLowerCase()}`;
			if (seen.has(k)) continue;
			seen.add(k);
			out.push({ city: r.city, country: r.country });
			if (out.length >= 8) break;
		}
		return out;
	}, [data]);

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
		else if (e.key === 'Enter') { const m = matches[active]; if (m) { e.preventDefault(); pick(m.city); } }
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
							{matches.map((m, i) => (
								<button
									key={`${m.city}|${m.country ?? ''}`}
									type="button"
									role="option"
									aria-selected={i === active}
									className={cx('atlas-combo-opt', i === active && 'is-active')}
									onMouseEnter={() => setActive(i)}
									// mousedown, not click: fire before the input blurs and closes the panel.
									onMouseDown={(e) => { e.preventDefault(); pick(m.city); }}
								>
									<span>{m.city}</span>
									{m.country && <span style={{ marginLeft: 'auto', color: 'var(--a-muted)', fontSize: 12 }}>{m.country}</span>}
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
