'use client';

import { cx } from './cx';

/** Tabs — underlined page tabs (Figma "Tab Bar"). Seg — pill segmented switch. */

export function Tabs<T extends string>({ tabs, value, onChange }: {
	tabs: { key: T; label: string }[]; value: T; onChange: (k: T) => void;
}) {
	return (
		<div className="atlas-tabs">
			{tabs.map((t) => (
				<button key={t.key} className={cx('atlas-tab', t.key === value && 'active')} onClick={() => onChange(t.key)}>{t.label}</button>
			))}
		</div>
	);
}

/** Segmented switch — Figma "Select UX bar" (FUNDING | M&A | TOTAL). */
export function Seg<T extends string>({ options, value, onChange, ariaLabel }: {
	options: { key: T; label: string }[]; value: T; onChange: (k: T) => void; ariaLabel?: string;
}) {
	return (
		<div className="atlas-seg" role="group" aria-label={ariaLabel}>
			{options.map((o) => (
				<button key={o.key} type="button" className={cx('atlas-seg__btn', o.key === value && 'active')} aria-pressed={o.key === value} onClick={() => onChange(o.key)}>{o.label}</button>
			))}
		</div>
	);
}
