'use client';

/**
 * Small presentational charts for the persona workspace, ported from the
 * `Donut` / `MiniBars` / `genSpark` helpers in ui_design/app/copilot.jsx +
 * atoms.jsx. Pure SVG, no deps.
 */

/** A smooth trending sparkline series from `start` → `end` (deterministic). */
export function genSpark(start: number, end: number, n = 14): number[] {
	const out: number[] = [];
	for (let i = 0; i < n; i++) {
		const t = i / (n - 1);
		// ease-in-out + a small deterministic ripple so it reads like real data.
		const eased = start + (end - start) * (t * t * (3 - 2 * t));
		const ripple = Math.sin(i * 1.7) * (Math.abs(end - start) * 0.04);
		out.push(Math.max(0, eased + ripple));
	}
	return out;
}

/** Donut score ring (e.g. deck evaluator 78/100). Accent arc over a track. */
export function ScoreRing({
	score, size = 116, label = '/100', color,
}: {
	score: number;
	size?: number;
	label?: string;
	color?: string;
}) {
	const r = size / 2 - 9;
	const c = 2 * Math.PI * r;
	const pct = Math.max(0, Math.min(100, score)) / 100;
	const stroke = color ?? 'var(--accent)';
	return (
		<div className="cp-score-ring" style={{ width: size, height: size }}>
			<svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
				<circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--bg-3)" strokeWidth={9} />
				<circle
					cx={size / 2} cy={size / 2} r={r} fill="none"
					stroke={stroke} strokeWidth={9} strokeLinecap="round"
					strokeDasharray={`${c * pct} ${c}`}
					transform={`rotate(-90 ${size / 2} ${size / 2})`}
				/>
			</svg>
			<div className="cp-score-mid">
				<b>{score}</b>
				<span>{label}</span>
			</div>
		</div>
	);
}

/** Simple vertical bar chart with labels (quarterly momentum etc.). */
export function MiniBars({
	values, labels, color = 'var(--accent)', height = 110,
}: {
	values: number[];
	labels?: string[];
	color?: string;
	height?: number;
}) {
	const max = Math.max(1, ...values);
	return (
		<div className="cp-chart-wrap">
			<div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height }}>
				{values.map((v, i) => (
					<div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' }}>
						<div style={{ width: '100%', height: `${(v / max) * 100}%`, background: color, opacity: i % 2 === 0 ? 1 : 0.75, minHeight: 2 }} />
						{labels && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fg-muted)' }}>{labels[i]}</span>}
					</div>
				))}
			</div>
		</div>
	);
}
