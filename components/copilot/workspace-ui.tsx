'use client';

import type { ReactNode } from 'react';

/**
 * Shared chrome for the persona "Copilot" workspace screens (founder
 * Fundraising Copilot + investor Dealflow Copilot). Ported from
 * ui_design/app/copilot.jsx (WorkspaceHeader) + the `cp-*` styles in
 * app/copilot.css.
 */

export function WorkspaceHeader({
	eyebrow, title, sub, action,
}: {
	eyebrow: string;
	title: string;
	sub: string;
	action?: ReactNode;
}) {
	return (
		<div className="cp-head">
			<div>
				<div className="cp-eyebrow"><span className="cp-eyebrow-dot" />{eyebrow}</div>
				<h1 className="cp-title">{title}</h1>
				<p className="cp-sub">{sub}</p>
			</div>
			{action && <div className="cp-head-right">{action}</div>}
		</div>
	);
}

/** Thin progress bar used by matches, benchmarks and diligence sections. */
export function FitBar({ pct, color }: { pct: number; color?: string }) {
	const w = Math.max(0, Math.min(100, pct));
	return (
		<div className="fit-bar">
			<div className="fit-bar-fill" style={{ width: `${w}%`, background: color }} />
		</div>
	);
}
