'use client';

import { cx } from '@/components/atlas/kit';

/** Deterministic navy/blue-family palette for donut + tree segments. Mid-tone
 *  blues read on both the light and dark Atlas card surfaces. */
export const MARKET_PALETTE = [
	'#1B4C78', '#7FA9D2', '#3E6E9E', '#A9C6E3',
	'#274B6B', '#5B8AB8', '#9FB9D0', '#123651',
];
export const paletteAt = (i: number) => MARKET_PALETTE[i % MARKET_PALETTE.length];

/** Compact USD ($1.2B / $340M / $12,000 / —). */
export function fmtUsd(n?: number | null): string {
	if (n == null) return '—';
	if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
	if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
	return n > 0 ? `$${Math.round(n).toLocaleString()}` : '—';
}
/** USD in billions for chart axes ($1.2B). */
export const fmtUsdB = (n: number) => (n >= 1e9 || n === 0 ? `$${(n / 1e9).toFixed(1)}B` : n >= 1e6 ? `$${(n / 1e6).toFixed(0)}M` : `$${Math.round(n).toLocaleString()}`);
export const fmtCount = (n?: number | null) => Number(n ?? 0).toLocaleString();

/** Small segmented toggle (series / range / sub-tabs). */
export function Seg<T extends string>({ options, value, onChange, pill }: {
	options: { value: T; label: string }[];
	value: T;
	onChange: (v: T) => void;
	pill?: boolean;
}) {
	return (
		<div className={cx('mkt-seg', pill && 'mkt-seg--pill')}>
			{options.map((o) => (
				<button key={o.value} type="button" className={cx('mkt-seg-btn', o.value === value && 'active')} onClick={() => onChange(o.value)}>
					{o.label}
				</button>
			))}
		</div>
	);
}
