'use client';

import { useCallback, useRef, useState } from 'react';
import { ChevronDown, Plus, Search } from 'lucide-react';
import { cx } from '../ui/cx';
import { useDismiss } from './use-dismiss';

export interface SwitcherList { id: string; name: string; /** Small right-aligned note, e.g. a count. */ meta?: string }

/**
 * ListSwitcher — pill button showing the current list; opens the black menu
 * with a search box, the user's lists (dot = current) and a "+ New …" action.
 * Used for watchlists. `onCreate` omitted + `createPlaceholder` → the create row
 * shows a "Not connected" pill and is disabled (no backend yet).
 */
export function ListSwitcher({ lists, value, onChange, noun = 'list', onCreate, createPlaceholder }: {
	lists: SwitcherList[];
	value: string;
	onChange: (id: string) => void;
	/** Singular noun for labels: "Search watchlists…", "+ New watchlist". */
	noun?: string;
	onCreate?: () => void;
	createPlaceholder?: boolean;
}) {
	const [open, setOpen] = useState(false);
	const [q, setQ] = useState('');
	const ref = useRef<HTMLDivElement>(null);
	const close = useCallback(() => { setOpen(false); setQ(''); }, []);
	useDismiss(ref, open, close);

	const current = lists.find((l) => l.id === value);
	const term = q.trim().toLowerCase();
	const shown = term ? lists.filter((l) => l.name.toLowerCase().includes(term)) : lists;

	return (
		<div className="atlas-fbar__anchor" ref={ref}>
			<button type="button" className="atlas-btn atlas-btn--outline atlas-switcher__btn" aria-haspopup="dialog" aria-expanded={open} onClick={() => (open ? close() : setOpen(true))}>
				<ChevronDown /> <span className="atlas-switcher__current">{current?.name ?? `Select ${noun}`}</span>
			</button>
			{open && (
				<div className="atlas-menu atlas-switcher__menu" role="dialog" aria-label={`Switch ${noun}`}>
					<div className="atlas-menu__head"><span>Your {noun}s</span></div>
					<div className="atlas-switcher__search">
						<Search size={11} aria-hidden="true" />
						<input className="atlas-menu__search" placeholder={`Search ${noun}s…`} value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
					</div>
					<div className="atlas-menu__list atlas-menu__list--scroll">
						{shown.length === 0 && <div className="atlas-menu__empty">No {noun}s match</div>}
						{shown.map((l) => (
							<button key={l.id} type="button" className={cx('atlas-menu__item', l.id === value && 'on')} aria-pressed={l.id === value} onClick={() => { onChange(l.id); close(); }}>
								<span className="atlas-menu__dot" aria-hidden="true" />
								<span className="atlas-switcher__name">{l.name}</span>
								{l.meta && <span className="atlas-switcher__meta">{l.meta}</span>}
							</button>
						))}
					</div>
					<div className="atlas-switcher__foot">
						<button type="button" className="atlas-menu__item" disabled={!onCreate} aria-disabled={!onCreate} onClick={() => { onCreate?.(); close(); }}>
							<Plus size={11} aria-hidden="true" /> New {noun}
							{createPlaceholder && <span className="atlas-switcher__soon">Not connected</span>}
						</button>
					</div>
				</div>
			)}
		</div>
	);
}
