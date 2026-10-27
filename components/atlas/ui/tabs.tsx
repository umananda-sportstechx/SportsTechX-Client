'use client';

import { useLayoutEffect, useRef } from 'react';
import { cx } from './cx';

/**
 * Keeps the active tab visible in a strip wider than the screen. On a phone the
 * strip scrolls sideways, and a tab past the right edge (Market → Programs,
 * Investors) was the page you were on but out of sight. Centres it by scrolling
 * the strip only — never the page, which `scrollIntoView` would also move.
 */
export function useActiveTabInView<T extends HTMLElement>(active: unknown) {
	const ref = useRef<T>(null);
	useLayoutEffect(() => {
		const strip = ref.current;
		const tab = strip?.querySelector<HTMLElement>('.active');
		if (!strip || !tab || strip.scrollWidth <= strip.clientWidth) return;
		const s = strip.getBoundingClientRect(), t = tab.getBoundingClientRect();
		if (t.left < s.left || t.right > s.right) strip.scrollLeft += t.left - s.left - (s.width - t.width) / 2;
	}, [active]);
	return ref;
}

/** Tabs — underlined page tabs (Figma "Tab Bar"). Seg — pill segmented switch. */

export function Tabs<T extends string>({ tabs, value, onChange }: {
	tabs: { key: T; label: string }[]; value: T; onChange: (k: T) => void;
}) {
	const ref = useActiveTabInView<HTMLDivElement>(value);
	return (
		<div ref={ref} className="atlas-tabs">
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

/**
 * Filter pills — the mockup's `pill(active)`: separate 29px outline pills, the
 * chosen one filled black. For a single-choice filter over a feed (signal type,
 * deal stage) where a joined segmented switch would be too wide to wrap.
 */
export function PillTabs<T extends string>({ options, value, onChange, ariaLabel }: {
	options: { key: T; label: string }[]; value: T; onChange: (k: T) => void; ariaLabel?: string;
}) {
	return (
		<div className="atlas-pilltabs" role="radiogroup" aria-label={ariaLabel}>
			{options.map((o) => (
				<button
					key={o.key}
					type="button"
					role="radio"
					aria-checked={o.key === value}
					className={cx('atlas-pilltab', o.key === value && 'on')}
					onClick={() => onChange(o.key)}
				>
					{o.label}
				</button>
			))}
		</div>
	);
}
