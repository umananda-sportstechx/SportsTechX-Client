'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { cx } from './cx';

/**
 * Atlas date picker — a themed calendar, replacing the native `<input type=date>`
 * whose popup the browser styles (and ignores the Atlas tokens).
 *
 * Same controlled contract as the native input it replaces: `value` is a
 * `YYYY-MM-DD` string (or '') and `onChange` hands back the same. Portalled to
 * <body> with the combobox's flip-and-clamp positioning so it is never clipped
 * by a card or scroll container, and Escape is caught in the capture phase so it
 * closes the calendar without also closing a host modal.
 */
interface Props {
	value: string;
	onChange: (value: string) => void;
	id?: string;
	disabled?: boolean;
	placeholder?: string;
	/** Inclusive bounds, `YYYY-MM-DD`. */
	min?: string;
	max?: string;
	/** Trigger field class; defaults to the standard input box. */
	className?: string;
}

const pad = (n: number) => String(n).padStart(2, '0');
const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseISO = (s: string): Date | null => {
	const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
	if (!m) return null;
	const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
	return Number.isNaN(d.getTime()) ? null : d;
};
const fmtDisplay = (s: string) => {
	const d = parseISO(s);
	return d ? d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) : '';
};
const sameDay = (a: Date, b: Date) => toISO(a) === toISO(b);
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

export function DatePicker({ value, onChange, id, disabled, placeholder = 'Select a date', min, max, className }: Props) {
	const [open, setOpen] = useState(false);
	const [pos, setPos] = useState<{ left: number; width: number; top?: number; bottom?: number } | null>(null);
	const [view, setView] = useState<Date>(() => parseISO(value) ?? new Date());
	const [focus, setFocus] = useState<Date>(() => parseISO(value) ?? new Date());
	const triggerRef = useRef<HTMLButtonElement>(null);
	const panelRef = useRef<HTMLDivElement>(null);

	const selected = parseISO(value);
	const minD = parseISO(min ?? '');
	const maxD = parseISO(max ?? '');
	const PANEL_W = 268, PANEL_H = 316;

	const place = () => {
		const r = triggerRef.current?.getBoundingClientRect();
		if (!r) return;
		const gap = 4, margin = 8;
		const width = Math.max(r.width, PANEL_W);
		const left = Math.min(r.left, window.innerWidth - width - margin);
		const below = window.innerHeight - r.bottom - margin;
		if (below >= PANEL_H || below >= r.top) setPos({ left, width, top: r.bottom + gap });
		else setPos({ left, width, bottom: window.innerHeight - r.top + gap });
	};
	useLayoutEffect(() => {
		if (!open) return;
		place();
		const base = parseISO(value) ?? new Date();
		setView(base); setFocus(base);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open]);
	useEffect(() => {
		if (!open) return;
		const reflow = () => place();
		const away = (e: MouseEvent) => {
			const t = e.target as Node;
			if (!triggerRef.current?.contains(t) && !panelRef.current?.contains(t)) setOpen(false);
		};
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setOpen(false); triggerRef.current?.focus(); return; }
			const step = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' ? -7 : e.key === 'ArrowDown' ? 7 : 0;
			if (step) {
				e.preventDefault();
				setFocus((f) => { const n = addDays(f, step); setView(new Date(n.getFullYear(), n.getMonth(), 1)); return n; });
			} else if (e.key === 'Enter') { e.preventDefault(); pick(focus); }
		};
		window.addEventListener('scroll', reflow, true);
		window.addEventListener('resize', reflow);
		document.addEventListener('mousedown', away);
		document.addEventListener('keydown', onKey, true);
		return () => {
			window.removeEventListener('scroll', reflow, true);
			window.removeEventListener('resize', reflow);
			document.removeEventListener('mousedown', away);
			document.removeEventListener('keydown', onKey, true);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open, focus]);

	const outOfRange = (d: Date) => (!!minD && d < minD) || (!!maxD && d > maxD);
	const pick = (d: Date) => { if (outOfRange(d)) return; onChange(toISO(d)); setOpen(false); triggerRef.current?.focus(); };

	// Monday-first grid for the viewed month, padded with leading blanks.
	const cells = useMemo<(Date | null)[]>(() => {
		const first = new Date(view.getFullYear(), view.getMonth(), 1);
		const lead = (first.getDay() + 6) % 7;
		const days = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
		const out: (Date | null)[] = Array.from({ length: lead }, () => null);
		for (let d = 1; d <= days; d += 1) out.push(new Date(view.getFullYear(), view.getMonth(), d));
		return out;
	}, [view]);

	const today = new Date();
	return (
		<>
			<button
				type="button"
				ref={triggerRef}
				id={id}
				disabled={disabled}
				aria-haspopup="dialog"
				aria-expanded={open}
				className={cx(className ?? 'atlas-input', 'atlas-date', !value && 'atlas-date--placeholder', open && 'atlas-date--open')}
				onClick={() => !disabled && setOpen((o) => !o)}
				onKeyDown={(e) => { if (!open && (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown')) { e.preventDefault(); setOpen(true); } }}
			>
				<span className="atlas-date__label">{value ? fmtDisplay(value) : placeholder}</span>
				<Calendar size={15} className="atlas-date__ico" aria-hidden="true" />
			</button>
			{open && pos && createPortal(
				<div className="atlas">
					<div ref={panelRef} className="atlas-datepanel" style={{ top: pos.top, bottom: pos.bottom, left: pos.left, width: pos.width }} role="dialog" aria-label="Choose date">
						<div className="atlas-datepanel__head">
							<button type="button" className="atlas-datepanel__nav" aria-label="Previous month" onClick={() => setView((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}><ChevronLeft size={16} /></button>
							<span className="atlas-datepanel__month">{view.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</span>
							<button type="button" className="atlas-datepanel__nav" aria-label="Next month" onClick={() => setView((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}><ChevronRight size={16} /></button>
						</div>
						<div className="atlas-datepanel__dow">{['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d) => <span key={d}>{d}</span>)}</div>
						<div className="atlas-datepanel__grid">
							{cells.map((d, i) => d === null ? <span key={`b${i}`} /> : (
								<button
									key={toISO(d)}
									type="button"
									disabled={outOfRange(d)}
									className={cx('atlas-dateday',
										selected && sameDay(d, selected) && 'is-selected',
										sameDay(d, focus) && 'is-focus',
										sameDay(d, today) && 'is-today')}
									onMouseEnter={() => setFocus(d)}
									onClick={() => pick(d)}
								>{d.getDate()}</button>
							))}
						</div>
						{value && <button type="button" className="atlas-datepanel__clear" onClick={() => { onChange(''); setOpen(false); }}>Clear</button>}
					</div>
				</div>,
				document.body,
			)}
		</>
	);
}
