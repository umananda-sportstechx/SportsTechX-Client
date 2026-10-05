'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Plus, Search, X } from 'lucide-react';
import { cx } from '@/components/atlas';
import { PICK_LISTS } from './sample-data';

/**
 * Form controls for the investor thesis (Thesis settings + onboarding):
 * chip sets (single / multi select) and the full-list picker behind "+ Add".
 */

export function ChipSet({ options, value, onToggle, wide }: {
	options: string[];
	/** Selected option(s). */
	value: string | string[];
	onToggle: (option: string) => void;
	/** Full-width rows (sector lists). */
	wide?: boolean;
}) {
	const on = (o: string) => (Array.isArray(value) ? value.includes(o) : value === o);
	return (
		<div className={cx('scout-chips', wide && 'scout-chips--wide')}>
			{options.map((o) => (
				<button key={o} type="button" className={cx('scout-chip', on(o) && 'on')} aria-pressed={on(o)} onClick={() => onToggle(o)}>{o}</button>
			))}
		</div>
	);
}

/** Toggle `o` in a list. */
export const toggleIn = (list: string[], o: string) => (list.includes(o) ? list.filter((x) => x !== o) : [...list, o]);
/** Quick options plus anything already selected from the full list. */
export const withSelected = (quick: string[], selected: string[]) => [...quick, ...selected.filter((x) => !quick.includes(x))];

export function AddButton({ onClick }: { onClick: () => void }) {
	return <button type="button" className="scout-chip scout-chip--add" onClick={onClick}><Plus size={11} aria-hidden="true" /> Add</button>;
}

/** Modal with the full grouped list (regions or attributes), searchable, multi-select. */
export function PickerDialog({ title, sub, list, selected, blocked, blockedNote, onToggle, onClose }: {
	title: string; sub: string; list: keyof typeof PICK_LISTS;
	selected: string[];
	/** Options already chosen on the opposite list (include vs exclude). */
	blocked?: string[]; blockedNote?: string;
	onToggle: (option: string) => void;
	onClose: () => void;
}) {
	const [q, setQ] = useState('');
	const boxRef = useRef<HTMLDivElement>(null);
	const closeRef = useRef(onClose);
	useEffect(() => { closeRef.current = onClose; });
	useEffect(() => {
		const opener = document.activeElement as HTMLElement | null;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') { closeRef.current(); return; }
			if (e.key !== 'Tab' || !boxRef.current) return;
			// Keep Tab inside the dialog.
			const items = boxRef.current.querySelectorAll<HTMLElement>('button, input');
			const first = items[0], last = items[items.length - 1];
			if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
			else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
		};
		window.addEventListener('keydown', onKey);
		return () => { window.removeEventListener('keydown', onKey); opener?.focus(); };
	}, []);
	const term = q.trim().toLowerCase();
	const groups = PICK_LISTS[list].map(([name, items]) => [name, items.filter((o) => !term || o.toLowerCase().includes(term))] as const).filter(([, items]) => items.length);
	return (
		<div className="scout-modal" role="presentation" onClick={onClose}>
			<div ref={boxRef} className="scout-modal__box" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
				<div className="scout-modal__head">
					<div><div className="atlas-h2">{title}</div><p className="scout-muted">{sub}</p></div>
					<button type="button" className="scout-modal__close" aria-label="Close" onClick={onClose}><X size={16} /></button>
				</div>
				<label className="scout-modal__search"><Search size={13} aria-hidden="true" /><input autoFocus placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} /></label>
				<div className="scout-modal__body">
					{groups.length === 0 && <p className="scout-muted">No matches.</p>}
					{groups.map(([name, items]) => (
						<section key={name}>
							<div className="atlas-eyebrow scout-modal__group">{name}</div>
							<div className="scout-modal__grid">
								{items.map((o) => {
									const on = selected.includes(o);
									return (
										<button key={o} type="button" className={cx('scout-pick', on && 'on')} aria-pressed={on} onClick={() => onToggle(o)}>
											<span className="scout-pick__box" aria-hidden="true">{on && <Check size={11} />}</span>
											<span>{o}</span>
											{blocked?.includes(o) && <span className="scout-pick__note">{blockedNote}</span>}
										</button>
									);
								})}
							</div>
						</section>
					))}
				</div>
				<div className="scout-modal__foot"><span className="atlas-eyebrow">{selected.length} selected</span><button type="button" className="atlas-btn atlas-btn--primary" onClick={onClose}>Done</button></div>
			</div>
		</div>
	);
}
