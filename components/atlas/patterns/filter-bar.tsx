'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Search, Plus, X, ChevronLeft, SlidersHorizontal, Lock } from 'lucide-react';
import { cx } from '../ui/cx';
import { useDismiss } from './use-dismiss';

/**
 * Figma "Toolbar" filter pattern: pill search · applied-filter pills · black
 * "+ ADD FILTER" menu (categories → options) · "× CLEAR FILTERS" · "SORT BY".
 * Purely presentational — every filter is still owned (state + setter) by the
 * page, which passes them in as `groups`. Nothing here changes what is filtered.
 */

export type FilterDef =
	| { kind: 'select'; key: string; label: string; value: string; options: [string, string][]; onChange: (v: string) => void }
	| { kind: 'toggle'; key: string; label: string; value: boolean; onChange: (v: boolean) => void };

export interface FilterGroup {
	label: string;
	filters: FilterDef[];
	/** When set, the group is shown as locked with this note instead of its filters. */
	locked?: ReactNode;
}

type MenuState = null | { at: 'add' | 'sort' | string; view: 'root' | string };

/** Show an in-menu search when an option list is longer than this. */
const SEARCHABLE_OPTIONS = 10;

export function FilterBar({ search, groups, sort, canClear, onClear, count }: {
	search: { value: string; onChange: (v: string) => void; placeholder: string };
	groups: FilterGroup[];
	sort?: { value: string; options: [string, string][]; onChange: (v: string) => void };
	canClear?: boolean;
	onClear?: () => void;
	count?: ReactNode;
}) {
	const [menu, setMenu] = useState<MenuState>(null);
	const rootRef = useRef<HTMLDivElement>(null);

	const closeMenu = useCallback(() => setMenu(null), []);
	useDismiss(rootRef, !!menu, closeMenu);

	const allFilters = useMemo(() => groups.filter((g) => !g.locked).flatMap((g) => g.filters), [groups]);
	const applied = allFilters.filter((f) => (f.kind === 'select' ? !!f.value : f.value));
	const byKey = (k: string) => allFilters.find((f) => f.key === k);
	const toggleMenu = (at: string, view = 'root') => setMenu((m) => (m && m.at === at ? null : { at, view }));

	return (
		<div className="atlas-fbar" ref={rootRef}>
			<div className="atlas-fbar__search">
				<Search size={13} aria-hidden="true" />
				<input
					className="atlas-input atlas-input--search"
					placeholder={search.placeholder}
					value={search.value}
					onChange={(e) => search.onChange(e.target.value)}
					aria-label={search.placeholder}
				/>
			</div>

			{applied.map((f) => (
				<div className="atlas-fbar__anchor" key={f.key}>
					<span className="atlas-fbar__pill">
						{f.kind === 'select' ? (
							<button type="button" className="atlas-fbar__pill-main" aria-expanded={menu?.at === f.key} onClick={() => toggleMenu(f.key, f.key)}>
								{f.label}<span className="atlas-fbar__pill-val">{optionLabel(f)}</span>
							</button>
						) : (
							<span className="atlas-fbar__pill-main">{f.label}</span>
						)}
						<button type="button" className="atlas-fbar__pill-x" aria-label={`Remove ${f.label} filter`}
							onClick={() => { if (f.kind === 'select') f.onChange(''); else f.onChange(false); setMenu(null); }}>
							<X size={11} />
						</button>
					</span>
					{menu?.at === f.key && f.kind === 'select' && (
						<div className="atlas-menu" role="dialog" aria-label={f.label}>
							<OptionsView f={f} onDone={() => setMenu(null)} />
						</div>
					)}
				</div>
			))}

			<div className="atlas-fbar__anchor">
				<button type="button" className="atlas-btn atlas-btn--primary" aria-expanded={menu?.at === 'add'} onClick={() => toggleMenu('add')}>
					<Plus /> Add filter
				</button>
				{menu?.at === 'add' && (
					<div className={cx('atlas-menu', menu.view === 'root' && groups.length > 1 && 'atlas-menu--wide')} role="dialog" aria-label="Add filter">
						{menu.view === 'root' ? (
							<div className="atlas-menu__groups">
								{groups.map((g) => (
									<div className="atlas-menu__group" key={g.label}>
										{groups.length > 1 && <div className="atlas-menu__label">{g.label}</div>}
										{g.locked ? (
											<div className="atlas-menu__locked"><Lock size={11} /> {g.locked}</div>
										) : g.filters.map((f) => {
											const on = f.kind === 'select' ? !!f.value : f.value;
											return (
												<button key={f.key} type="button" className={cx('atlas-menu__item', on && 'on')}
													aria-pressed={f.kind === 'toggle' ? f.value : undefined}
													onClick={() => (f.kind === 'toggle' ? f.onChange(!f.value) : setMenu({ at: 'add', view: f.key }))}>
													<span className="atlas-menu__dot" aria-hidden="true" />{f.label}
												</button>
											);
										})}
									</div>
								))}
							</div>
						) : (() => {
							const f = byKey(menu.view);
							return f && f.kind === 'select'
								? <OptionsView f={f} onBack={() => setMenu({ at: 'add', view: 'root' })} onDone={() => setMenu(null)} />
								: null;
						})()}
					</div>
				)}
			</div>

			{canClear && onClear && (
				<button type="button" className="atlas-fbar__clear" onClick={() => { onClear(); setMenu(null); }}>
					<X size={11} /> Clear filters
				</button>
			)}

			<div className="atlas-fbar__right">
				{count && <span className="atlas-fbar__count">{count}</span>}
				{sort && (
					<div className="atlas-fbar__anchor">
						<button type="button" className="atlas-btn atlas-btn--outline" aria-expanded={menu?.at === 'sort'} onClick={() => toggleMenu('sort')}>
							<SlidersHorizontal /> Sort by
						</button>
						{menu?.at === 'sort' && (
							<div className="atlas-menu atlas-menu--end" role="dialog" aria-label="Sort by">
								<div className="atlas-menu__list">
									{sort.options.map(([v, l]) => (
										<button key={v} type="button" className={cx('atlas-menu__item', v === sort.value && 'on')} aria-pressed={v === sort.value}
											onClick={() => { sort.onChange(v); setMenu(null); }}>
											<span className="atlas-menu__dot" aria-hidden="true" />{l}
										</button>
									))}
								</div>
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	);
}

/** One select filter's option list (with an optional in-menu search for long lists). */
function OptionsView({ f, onBack, onDone }: { f: Extract<FilterDef, { kind: 'select' }>; onBack?: () => void; onDone: () => void }) {
	const [q, setQ] = useState('');
	const term = q.trim().toLowerCase();
	const opts = term ? f.options.filter(([, l]) => l.toLowerCase().includes(term)) : f.options;
	const pick = (v: string) => { f.onChange(v); onDone(); };
	return (
		<>
			<div className="atlas-menu__head">
				{onBack && <button type="button" className="atlas-menu__back" aria-label="Back to filters" onClick={onBack}><ChevronLeft size={13} /></button>}
				<span>{f.label}</span>
			</div>
			{f.options.length > SEARCHABLE_OPTIONS && (
				<input className="atlas-menu__search" placeholder={`Search ${f.label.toLowerCase()}…`} value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
			)}
			<div className="atlas-menu__list atlas-menu__list--scroll">
				{f.value && !term && (
					<button type="button" className="atlas-menu__item" onClick={() => pick('')}>
						<span className="atlas-menu__dot" aria-hidden="true" />Any
					</button>
				)}
				{opts.length === 0 && <div className="atlas-menu__empty">{f.options.length === 0 ? 'No options' : 'No matches'}</div>}
				{opts.map(([v, l]) => (
					<button key={v} type="button" className={cx('atlas-menu__item', v === f.value && 'on')} aria-pressed={v === f.value} onClick={() => pick(v)}>
						<span className="atlas-menu__dot" aria-hidden="true" />{l}
					</button>
				))}
			</div>
		</>
	);
}

function optionLabel(f: Extract<FilterDef, { kind: 'select' }>): string {
	return f.options.find(([v]) => v === f.value)?.[1] ?? f.value;
}
