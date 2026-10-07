'use client';

import { useState } from 'react';

/**
 * HBarDrilldown — hierarchical horizontal progress rows (up to 3 levels), ported from
 * `ui_design_3/app/analytics-charts.jsx`. Rows without `children` render as a
 * flat single-level bar (no caret) — which is what the client's flat
 * sector-heat data produces. Deeper levels render only when a row actually
 * carries `children`, so this is safe to feed with either flat or nested data.
 */

export interface HBarRow {
	id: string;
	label: string;
	value: number;
	formatted?: string;
	color?: string;
	children?: HBarRow[];
}

export function HBarDrilldown({
	rows, total, defaultOpen,
}: {
	rows: HBarRow[];
	total?: number;
	defaultOpen?: Record<string, boolean>;
}) {
	const [openMap, setOpenMap] = useState<Record<string, boolean>>(defaultOpen ?? {});
	const grandTotal = (total ?? rows.reduce((s, r) => s + r.value, 0)) || 1;

	const toggle = (id: string) => setOpenMap((o) => ({ ...o, [id]: !o[id] }));

	return (
		<div>
			{rows.map((r) => (
				<HBarTop
					key={r.id}
					row={r}
					total={grandTotal}
					open={!!openMap[r.id]}
					onToggle={() => toggle(r.id)}
					openMap={openMap}
					setOpenMap={setOpenMap}
				/>
			))}
		</div>
	);
}

function HBarTop({
	row, total, open, onToggle, openMap, setOpenMap,
}: {
	row: HBarRow;
	total: number;
	open: boolean;
	onToggle: () => void;
	openMap: Record<string, boolean>;
	setOpenMap: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}) {
	const pct = total > 0 ? (row.value / total) * 100 : 0;
	const hasChildren = !!(row.children && row.children.length);
	return (
		<div
			className={`hb-row ${hasChildren ? 'has-children' : 'no-children'} ${open ? 'open' : ''}`}
			style={{ '--bar-color': row.color } as React.CSSProperties}
			onClick={() => hasChildren && onToggle()}
		>
			<div className="hb-head">
				{hasChildren ? (
					<span className="hb-caret">
						<svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 3.5l3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
					</span>
				) : <span className="hb-spacer" />}
				<span className="hb-label">{row.label}</span>
				<span className="hb-pct">{pct.toFixed(1)}%</span>
				<span className="hb-val">{row.formatted ?? `$${row.value}`}</span>
			</div>
			<div className="hb-bar"><div className="hb-bar-fill" style={{ width: `${pct}%` }} /></div>
			{open && hasChildren && (
				<div className="hb-children" onClick={(e) => e.stopPropagation()}>
					{row.children!.map((c) => (
						<HBarChild
							key={c.id}
							row={c}
							total={total}
							barColor={row.color}
							open={!!openMap[c.id]}
							onToggle={() => setOpenMap((o) => ({ ...o, [c.id]: !o[c.id] }))}
						/>
					))}
				</div>
			)}
		</div>
	);
}

function HBarChild({
	row, total, barColor, open, onToggle,
}: {
	row: HBarRow;
	total: number;
	barColor?: string;
	open: boolean;
	onToggle: () => void;
}) {
	const pct = total > 0 ? (row.value / total) * 100 : 0;
	const hasChildren = !!(row.children && row.children.length);
	return (
		<div
			className={`hb-child ${hasChildren ? 'has-children' : ''} ${open ? 'open' : ''}`}
			style={{ '--bar-color': barColor } as React.CSSProperties}
			onClick={() => hasChildren && onToggle()}
		>
			<div className="hb-head">
				{hasChildren ? (
					<span className="hb-caret">
						<svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 3.5l3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
					</span>
				) : <span className="hb-spacer" />}
				<span className="hb-label">{row.label}</span>
				<span className="hb-pct">{pct.toFixed(1)}%</span>
				<span className="hb-val">{row.formatted ?? `$${row.value}`}</span>
			</div>
			<div className="hb-bar"><div className="hb-bar-fill" style={{ width: `${pct}%` }} /></div>
			{open && hasChildren && (
				<div className="hb-grandchildren" onClick={(e) => e.stopPropagation()}>
					{row.children!.map((g) => {
						const gpct = total > 0 ? (g.value / total) * 100 : 0;
						return (
							<div key={g.id} className="hb-grandchild">
								<div className="hb-head">
									<span className="hb-spacer" />
									<span className="hb-label">{g.label}</span>
									<span className="hb-pct">{gpct.toFixed(1)}%</span>
									<span className="hb-val" style={{ color: 'var(--fg-2)' }}>{g.formatted ?? `$${g.value}`}</span>
								</div>
								<div className="hb-bar">
									<div className="hb-bar-fill" style={{ width: `${gpct}%` }} />
								</div>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}
