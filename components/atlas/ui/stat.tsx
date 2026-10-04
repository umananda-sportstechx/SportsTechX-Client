'use client';

import type { ReactNode } from 'react';

/** Stat tile and thin progress bar. */

export function Stat({ label, value }: { label: string; value: ReactNode }) {
	return <div className="atlas-stat"><div className="atlas-stat__label">{label}</div><div className="atlas-stat__value">{value}</div></div>;
}

export function Progress({ pct }: { pct: number }) {
	return <div className="atlas-progress"><div className="atlas-progress__fill" style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} /></div>;
}
