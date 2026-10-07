'use client';

import type { CSSProperties, ReactNode } from 'react';
import { cx } from './cx';

/** Card — the standard surface (13px radius, hairline border); optional blue/pink Figma glow. */

export function Card({ children, variant, glow, focus, className, style }: {
	children: ReactNode; variant?: 'cream'; glow?: 'blue' | 'pink'; focus?: boolean; className?: string; style?: CSSProperties;
}) {
	return (
		<div className={cx('atlas-card', variant === 'cream' && 'atlas-card--cream', glow === 'blue' && 'atlas-card--glow', glow === 'pink' && 'atlas-card--glow-pink', focus && 'atlas-card--focus', className)} style={style}>
			{children}
		</div>
	);
}
