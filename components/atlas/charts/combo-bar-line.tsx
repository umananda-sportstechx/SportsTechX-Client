'use client';

import { useId, useRef, useState } from 'react';
import type { ComboPoint } from './types';

/**
 * ComboBarLine — bars (amounts) with a line overlay (counts) over time, hover
 * tooltip and legend. Self-rendering SVG; styled by styles/charts.css.
 */

interface ComboBarLineProps {
	data: ComboPoint[];
	height?: number;
	valueFormatter?: (v: number) => string;
	lineFormatter?: (v: number) => string;
	/** Alternating bar fills. Defaults to the legacy mint pair. */
	barColors?: [string, string];
	/** Trend line + dot colour. Defaults to `var(--accent)`. */
	lineColor?: string;
	/** Legend label for the bars (default "Funding"). */
	barLabel?: string;
	/** Legend label for the line (default "Rounds"). */
	lineLabel?: string;
	/** Fill every bar with one vertical gradient (barColors[0] top → [1] bottom) instead of alternating. */
	barGradient?: boolean;
	/** Trend-line dot colour (defaults to lineColor). */
	dotColor?: string;
	/** Print each bar's value above it (default true). */
	showValues?: boolean;
	/** Dashed grid lines (default true); false draws hairlines. */
	gridDashed?: boolean;
}

export function ComboBarLine({
	data, height = 280, valueFormatter, lineFormatter,
	barColors = ['#79CABD', '#C0F4DE'], lineColor = 'var(--accent)',
	barLabel = 'Funding', lineLabel = 'Rounds',
	barGradient = false, dotColor, showValues = true, gridDashed = true,
}: ComboBarLineProps) {
	const gradId = `cbl-grad-${useId().replace(/:/g, '')}`;
	const dot = dotColor ?? lineColor;
	const [hover, setHover] = useState<number | null>(null);
	const wrapRef = useRef<HTMLDivElement | null>(null);
	const [pos, setPos] = useState({ x: 0, y: 0 });

	const W = 980;
	const H = height;
	const PAD_L = 36;
	const PAD_R = 36;
	const PAD_T = 36;
	const PAD_B = 44;
	const innerW = W - PAD_L - PAD_R;
	const innerH = H - PAD_T - PAD_B;

	const maxAmt = Math.max(1, ...data.map((d) => d.amt)) * 1.15;
	const maxDeals = Math.max(1, ...data.map((d) => d.deals)) * 1.15;

	const bw = Math.min(54, (innerW / Math.max(data.length, 1)) * 0.55);
	const xFor = (i: number) => PAD_L + (i + 0.5) * (innerW / Math.max(data.length, 1));
	const yBar = (v: number) => PAD_T + innerH - (v / maxAmt) * innerH;
	const yLine = (v: number) => PAD_T + innerH - (v / maxDeals) * innerH;

	const fmtAmt = valueFormatter ?? ((v: number) => `$${(v / 1_000_000_000).toFixed(1)}B`);
	const fmtLine = lineFormatter ?? ((v: number) => String(v));

	const onMove = (e: React.MouseEvent) => {
		if (!wrapRef.current) return;
		const rect = wrapRef.current.getBoundingClientRect();
		setPos({ x: e.clientX - rect.left + 12, y: e.clientY - rect.top + 12 });
	};

	return (
		<div className="cbl-wrap" ref={wrapRef}>
			<svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }} preserveAspectRatio="xMidYMid meet">
				{barGradient && (
					<defs>
						<linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
							<stop offset="0%" style={{ stopColor: barColors[0] }} />
							<stop offset="100%" style={{ stopColor: barColors[1] }} />
						</linearGradient>
					</defs>
				)}
				{/* Grid */}
				{[0, 0.25, 0.5, 0.75, 1].map((t) => (
					<g key={t}>
						<line
							x1={PAD_L}
							x2={W - PAD_R}
							y1={PAD_T + innerH * (1 - t)}
							y2={PAD_T + innerH * (1 - t)}
							stroke="var(--grid-line)"
							strokeDasharray={gridDashed ? '2 4' : undefined}
						/>
						<text
							x={6}
							y={PAD_T + innerH * (1 - t) + 3}
							fontSize="10"
							fontFamily="var(--font-mono)"
							fill="var(--fg-muted)"
						>
							{fmtAmt(maxAmt * t)}
						</text>
					</g>
				))}

				{/* Bars */}
				{data.map((d, i) => {
					const x = xFor(i) - bw / 2;
					const y = yBar(d.amt);
					const h = PAD_T + innerH - y;
					const fill = barGradient ? `url(#${gradId})` : i % 2 === 0 ? barColors[0] : barColors[1];
					return (
						<g key={i}>
							<rect
								x={x}
								y={y}
								width={bw}
								height={h}
								fill={fill}
								opacity={hover === null || hover === i ? 1 : 0.35}
								style={{ cursor: 'pointer', transition: 'opacity .15s' }}
								onMouseEnter={() => setHover(i)}
								onMouseMove={onMove}
								onMouseLeave={() => setHover(null)}
							/>
							{showValues && (
								<text
									x={xFor(i)}
									y={y - 8}
									textAnchor="middle"
									fontSize="11"
									fontWeight="700"
									fill="var(--fg)"
									fontFamily="var(--font-mono)"
									pointerEvents="none"
								>
									{fmtAmt(d.amt)}
								</text>
							)}
							<text
								x={xFor(i)}
								y={H - 14}
								textAnchor="middle"
								fontSize="10"
								fontFamily="var(--font-mono)"
								fill="var(--fg-muted)"
							>
								{d.year ?? d.label}
							</text>
						</g>
					);
				})}

				{/* Trend line */}
				<path
					d={data.map((d, i) => `${i === 0 ? 'M' : 'L'}${xFor(i)},${yLine(d.deals)}`).join(' ')}
					stroke={lineColor}
					strokeWidth="1.8"
					fill="none"
				/>
				{data.map((d, i) => (
					<circle
						key={i}
						cx={xFor(i)}
						cy={yLine(d.deals)}
						r="3"
						fill={dot}
						onMouseEnter={() => setHover(i)}
						onMouseMove={onMove}
						onMouseLeave={() => setHover(null)}
						style={{ cursor: 'pointer' }}
					/>
				))}
			</svg>
			<div className="cbl-legend">
				<span className="cbl-legend-item">
					<span className="cbl-legend-sw" style={{ background: barGradient ? `linear-gradient(${barColors[0]}, ${barColors[1]})` : barColors[0] }} />
					{barLabel}
				</span>
				<span className="cbl-legend-item">
					{dotColor
						? <span className="cbl-legend-sw" style={{ background: dotColor }} />
						: <svg width="14" height="6"><line x1="0" y1="3" x2="14" y2="3" stroke={lineColor} strokeWidth="2" /></svg>}
					{lineLabel}
				</span>
			</div>
			{hover !== null && data[hover] && (
				<div className="pie-tip" style={{ left: pos.x, top: pos.y }}>
					<div className="pie-tip-l">{data[hover].year ?? data[hover].label}</div>
					<div className="pie-tip-v">{fmtAmt(data[hover].amt)} · {fmtLine(data[hover].deals)} {lineLabel.toLowerCase()}</div>
				</div>
			)}
		</div>
	);
}
