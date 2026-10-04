'use client';

import { useRef, useState } from 'react';
import type { PieSegment } from './types';

/**
 * PieDonut — pie / donut (with optional centre figure) / horizontal bar list,
 * with hover tooltips. PieLegend — the key/value list shown beside it.
 * Self-rendering SVG; styled by styles/charts.css.
 */

interface PieDonutProps {
	segments: PieSegment[];
	size?: number;
	mode?: 'pie' | 'donut' | 'bar';
	showLabelOnLargest?: boolean;
	/** Donut only: big figure + caption rendered in the hole. */
	centerValue?: string;
	centerLabel?: string;
}

export function PieDonut({
	segments, size = 220, mode = 'pie', showLabelOnLargest = true, centerValue, centerLabel,
}: PieDonutProps) {
	const [hover, setHover] = useState<number | null>(null);
	const [pos, setPos] = useState({ x: 0, y: 0 });
	const wrapRef = useRef<HTMLDivElement | null>(null);

	const total = segments.reduce((s, x) => s + x.v, 0) || 1;

	// BAR mode — horizontal rows with progress bars. Styled via `pd-bar-*`
	// classes; the fill colour arrives as `--c` so the theme can gradient it.
	if (mode === 'bar') {
		return (
			<div className="pd-bars">
				{segments.map((s, i) => {
					const pct = (s.v / total) * 100;
					return (
						<div
							key={`${s.name}-${i}`}
							className="pd-bar-row"
							style={{ opacity: hover === null || hover === i ? 1 : 0.55 }}
							onMouseEnter={() => setHover(i)}
							onMouseLeave={() => setHover(null)}
						>
							<div className="pd-bar-head">
								<span className="pd-bar-name">{s.name}</span>
								<span className="pd-bar-pct">{pct.toFixed(1)}%</span>
								<span className="pd-bar-val">{s.label ?? `$${s.v.toLocaleString()}`}</span>
							</div>
							<div className="pd-bar-track">
								<div className="pd-bar-fill" style={{ width: `${pct}%`, '--c': s.color } as React.CSSProperties} />
							</div>
						</div>
					);
				})}
			</div>
		);
	}

	const r = size / 2;
	const cx = r;
	const cy = r;
	const innerR = mode === 'donut' ? r * 0.62 : 0;

	let acc = 0;
	const slices = segments
		.map((s, i) => {
			if (s.v === 0) return null;
			const start = (acc / total) * Math.PI * 2 - Math.PI / 2;
			acc += s.v;
			const end = (acc / total) * Math.PI * 2 - Math.PI / 2;
			const big = end - start > Math.PI ? 1 : 0;
			const sx = cx + Math.cos(start) * r;
			const sy = cy + Math.sin(start) * r;
			const ex = cx + Math.cos(end) * r;
			const ey = cy + Math.sin(end) * r;
			const path = mode === 'donut'
				? `M${sx},${sy} A${r},${r} 0 ${big} 1 ${ex},${ey} L${cx + Math.cos(end) * innerR},${cy + Math.sin(end) * innerR} A${innerR},${innerR} 0 ${big} 0 ${cx + Math.cos(start) * innerR},${cy + Math.sin(start) * innerR} Z`
				: `M${cx},${cy} L${sx},${sy} A${r},${r} 0 ${big} 1 ${ex},${ey} Z`;
			const mid = (start + end) / 2;
			return {
				...s,
				idx: i,
				path,
				midX: cx + Math.cos(mid) * (r * 0.65),
				midY: cy + Math.sin(mid) * (r * 0.65),
				pct: (s.v / total) * 100,
			};
		})
		.filter((s): s is NonNullable<typeof s> => s !== null);

	const largest = showLabelOnLargest && slices.length
		? slices.reduce((b, s) => (s.v > b.v ? s : b), slices[0])
		: null;

	const move = (e: React.MouseEvent) => {
		if (!wrapRef.current) return;
		const rect = wrapRef.current.getBoundingClientRect();
		setPos({ x: e.clientX - rect.left + 12, y: e.clientY - rect.top + 12 });
	};

	const hoveredSlice = hover !== null ? slices.find((s) => s.idx === hover) : null;

	return (
		<div
			className="pie-wrap"
			ref={wrapRef}
			onMouseLeave={() => setHover(null)}
			style={{ width: size, height: size, position: 'relative' }}
		>
			<svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} style={{ display: 'block' }}>
				{slices.map((s) => (
					<path
						key={s.idx}
						d={s.path}
						fill={s.color}
						opacity={hover === null || hover === s.idx ? 1 : 0.3}
						style={{ cursor: 'pointer', transition: 'opacity .15s' }}
						onMouseEnter={() => setHover(s.idx)}
						onMouseMove={move}
					/>
				))}
				{largest && largest.pct > 14 && (() => {
					const words = largest.name.split(' ');
					return (
						<text
							x={largest.midX}
							y={largest.midY}
							textAnchor="middle"
							fill="#fff"
							fontSize="12"
							fontWeight="700"
							pointerEvents="none"
							fontFamily="var(--font-display)"
						>
							{words.length > 1 ? (
								<>
									<tspan x={largest.midX} dy="-4">{words[0]}</tspan>
									<tspan x={largest.midX} dy="14">{words.slice(1).join(' ')}</tspan>
								</>
							) : (
								<tspan>{largest.name}</tspan>
							)}
						</text>
					);
				})()}
			</svg>
			{mode === 'donut' && centerValue && (
				<div className="pie-center" aria-hidden="true">
					<div className="pie-center-v">{centerValue}</div>
					{centerLabel && <div className="pie-center-l">{centerLabel}</div>}
				</div>
			)}
			{hoveredSlice && (
				<div className="pie-tip" style={{ left: pos.x, top: pos.y }}>
					<div className="pie-tip-l">{hoveredSlice.name}</div>
					<div className="pie-tip-v">
						{hoveredSlice.label ?? `$${hoveredSlice.v.toLocaleString()}`} · {hoveredSlice.pct.toFixed(1)}%
					</div>
				</div>
			)}
		</div>
	);
}

export function PieLegend({ segments }: { segments: PieSegment[] }) {
	const total = segments.reduce((s, x) => s + x.v, 0) || 1;
	return (
		<div className="an-legend">
			{segments.map((s, i) => (
				<div key={`${s.name}-${i}`} className="an-legend-row">
					<span className="an-legend-sw" style={{ background: s.color }} />
					<span className="an-legend-name">{s.name}</span>
					<span className="an-legend-val">{s.label ?? `${((s.v / total) * 100).toFixed(1)}%`}</span>
				</div>
			))}
		</div>
	);
}
