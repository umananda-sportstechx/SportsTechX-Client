'use client';

import useSWR from 'swr';
import { Filter } from 'lucide-react';
import { qk } from '@/lib/query-keys';
import { Page, Stat, SectionHead, Donut, WorldMap, Empty } from '@/components/ui/atoms';

interface QuarterlyPoint {
	year: number;
	quarter: number;
	quarter_label: string;
	total_amount: number;
	deal_count: number;
}

interface SectorHeatPoint {
	sector_id: string;
	sector_slug: string;
	sector_name: string;
	deal_count: number;
	total_amount: number;
}

interface WorldFlowPoint {
	country: string;
	deal_count: number;
	total_amount: number;
}

interface DashboardStats {
	total_funding: number;
	total_deals: number;
	total_acquisitions: number;
}

const SECTOR_COLORS = [
	'oklch(62% 0.18 240)', 'oklch(62% 0.20 290)', 'oklch(62% 0.18 30)',
	'oklch(62% 0.16 160)', 'oklch(62% 0.18 60)',  'oklch(62% 0.18 350)',
	'oklch(62% 0.14 140)', 'oklch(62% 0.18 200)',
];

export default function AnalyticsPage() {
	const currentYear = new Date().getFullYear();

	const { data: stats12m } = useSWR<DashboardStats>(qk.analytics.dashboard('12m'), { dedupingInterval: 10 * 60_000 });
	const { data: quarters } = useSWR<QuarterlyPoint[]>(
		qk.analytics.quarterly({ from: currentYear - 1, to: currentYear }),
		{ dedupingInterval: 10 * 60_000 },
	);
	const { data: sectorHeat } = useSWR<SectorHeatPoint[]>(qk.analytics.sectorHeat('ytd', 5), {
		dedupingInterval: 10 * 60_000,
	});
	const { data: worldFlow } = useSWR<WorldFlowPoint[]>(qk.analytics.worldFlow('ytd', 30), {
		dedupingInterval: 10 * 60_000,
	});

	const sectorMix = composeSectorMix(sectorHeat ?? []);

	return (
		<Page>
			<div style={{ marginBottom: 'var(--space-5)' }}>
				<div
					style={{
						fontFamily: 'var(--font-mono)',
						fontSize: 11,
						color: 'var(--fg-muted)',
						textTransform: 'uppercase',
						letterSpacing: '0.1em',
						marginBottom: 6,
					}}
				>
					Insight · live dashboards
				</div>
				<h1
					style={{
						fontFamily: 'var(--font-display)',
						fontSize: 38,
						fontWeight: 800,
						letterSpacing: '-0.02em',
						lineHeight: 1,
						margin: '0 0 6px',
					}}
				>
					Analytics
				</h1>
				<p style={{ fontSize: 14, color: 'var(--fg-2)', maxWidth: 720, margin: 0 }}>
					Aggregated views across the entire sports-tech ecosystem — capital, deal velocity, sub-sector heat.
				</p>
			</div>

			<div className="grid-4" style={{ marginBottom: 'var(--space-5)' }}>
				{kpiStrip(stats12m).map((s, i) => (
					<div key={i} className="card" style={{ padding: 'var(--space-4)' }}>
						<Stat {...s} />
					</div>
				))}
			</div>

			<div className="grid-2" style={{ gridTemplateColumns: '1.5fr 1fr', marginBottom: 'var(--space-5)' }}>
				<div className="card">
					<SectionHead title="Capital deployed" meta={`Quarterly · ${currentYear - 1} — ${currentYear}`} />
					<div style={{ padding: 'var(--space-4)' }}>
						{!quarters || quarters.length === 0
							? <Empty msg="Not enough data" />
							: <QuarterlyChart quarters={quarters} />}
					</div>
				</div>
				<div className="card">
					<SectionHead title="Sector mix · YTD" />
					<div style={{ padding: 'var(--space-4)', display: 'flex', gap: 24, alignItems: 'center' }}>
						{sectorMix.legend.length === 0
							? <Empty msg="No sector data" />
							: <>
								<Donut size={140} thickness={20} segments={sectorMix.donut} />
								<div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12, flex: 1 }}>
									{sectorMix.legend.map((s) => (
										<div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
											<span style={{ width: 10, height: 10, background: s.color, flexShrink: 0 }} />
											<span style={{ flex: 1 }}>{s.name}</span>
											<span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{s.percent}%</span>
										</div>
									))}
								</div>
							</>}
					</div>
				</div>
			</div>

			<div className="card">
				<SectionHead
					title="Geographic flow"
					meta={`${currentYear} YTD`}
					action={<button className="btn ghost"><Filter size={12} /> Region</button>}
				/>
				<div style={{ padding: 'var(--space-4)' }}>
					{!worldFlow || worldFlow.length === 0
						? <Empty msg="No geographic data" />
						: <WorldMap height={360} dots={worldFlowToDots(worldFlow)} />}
				</div>
			</div>
		</Page>
	);
}

function kpiStrip(s: DashboardStats | undefined) {
	const cap = splitDollars(s?.total_funding ?? 0);
	const deals = (s?.total_deals ?? 0).toLocaleString();
	const ma = (s?.total_acquisitions ?? 0).toLocaleString();
	const avg = s && s.total_deals > 0 ? splitDollars(s.total_funding / s.total_deals) : { value: '—', unit: '' };
	return [
		{ label: 'Capital · 12mo', value: cap.value,  unit: cap.unit,                                                        deltaDir: 'pos' as const },
		{ label: 'Deals · 12mo',   value: deals,                                                                              deltaDir: 'pos' as const },
		{ label: 'M&A · 12mo',     value: ma,                                                                                 deltaDir: 'pos' as const },
		{ label: 'Avg. round',     value: avg.value,  unit: avg.unit,                                                         deltaDir: 'pos' as const },
	];
}

function composeSectorMix(rows: SectorHeatPoint[]): {
	donut: Array<{ v: number; color: string }>;
	legend: Array<{ name: string; percent: number; color: string }>;
} {
	const total = rows.reduce((s, r) => s + r.total_amount, 0);
	if (total === 0) return { donut: [], legend: [] };
	const top = rows.slice(0, 4);
	const restSum = rows.slice(4).reduce((s, r) => s + r.total_amount, 0);
	const sections = [
		...top.map((r) => ({ name: r.sector_name, amount: r.total_amount })),
		...(restSum > 0 ? [{ name: 'Other', amount: restSum }] : []),
	];
	return {
		donut: sections.map((s, i) => ({
			v: Math.round((s.amount / total) * 100),
			color: SECTOR_COLORS[i % SECTOR_COLORS.length]!,
		})),
		legend: sections.map((s, i) => ({
			name: s.name,
			percent: Math.round((s.amount / total) * 100),
			color: SECTOR_COLORS[i % SECTOR_COLORS.length]!,
		})),
	};
}

/**
 * Project country totals onto the world map's pixel grid. Coordinates are
 * approximate (the WorldMap atom uses a 1000×500 SVG); only the top-30 by
 * volume are rendered. Country → (x,y) map is intentionally coarse — the
 * dashboard isn't a GIS surface, it's a "where's the activity" hint.
 */
const COUNTRY_COORDS: Record<string, { x: number; y: number }> = {
	'United States': { x: 240, y: 180 }, USA: { x: 240, y: 180 },
	Canada: { x: 230, y: 165 },
	'United Kingdom': { x: 500, y: 145 }, UK: { x: 500, y: 145 },
	Germany: { x: 530, y: 155 }, France: { x: 510, y: 165 }, Italy: { x: 525, y: 180 },
	Spain: { x: 510, y: 200 }, Netherlands: { x: 525, y: 130 }, Sweden: { x: 540, y: 110 },
	Switzerland: { x: 535, y: 170 }, Belgium: { x: 525, y: 145 }, Austria: { x: 545, y: 165 },
	Poland: { x: 555, y: 145 }, Portugal: { x: 490, y: 210 },
	India: { x: 720, y: 245 }, China: { x: 820, y: 200 }, Japan: { x: 870, y: 195 },
	Singapore: { x: 820, y: 320 }, Australia: { x: 870, y: 380 },
	Brazil: { x: 320, y: 350 }, Mexico: { x: 200, y: 240 },
};

function worldFlowToDots(rows: WorldFlowPoint[]): Array<{ x: number; y: number; r: number }> {
	const maxDeals = Math.max(1, ...rows.map((r) => r.deal_count));
	return rows
		.map((r) => {
			const coords = COUNTRY_COORDS[r.country];
			if (!coords) return null;
			return {
				x: coords.x,
				y: coords.y,
				r: Math.max(2, Math.round((r.deal_count / maxDeals) * 10)),
			};
		})
		.filter((d): d is { x: number; y: number; r: number } => d !== null);
}

function QuarterlyChart({ quarters }: { quarters: QuarterlyPoint[] }) {
	const maxAmt = Math.max(1, ...quarters.map((q) => q.total_amount));
	const W = 900, H = 240, PAD = 36;
	const bw = (W - PAD * 2) / quarters.length - 12;
	return (
		<svg width="100%" viewBox={`0 0 ${W} ${H + 40}`} style={{ display: 'block' }}>
			{[0, 0.25, 0.5, 0.75, 1].map((t) => (
				<g key={t}>
					<line
						x1={PAD}
						x2={W - PAD}
						y1={PAD + (H - PAD * 2) * (1 - t)}
						y2={PAD + (H - PAD * 2) * (1 - t)}
						stroke="var(--border)"
						strokeDasharray="2 4"
					/>
					<text x={6} y={PAD + (H - PAD * 2) * (1 - t) + 3} fontSize="10" fontFamily="var(--font-mono)" fill="var(--fg-muted)">
						${((maxAmt * t) / 1_000_000_000).toFixed(1)}B
					</text>
				</g>
			))}
			{quarters.map((q, i) => {
				const bh = ((H - PAD * 2) * q.total_amount) / maxAmt;
				const y = H - PAD - bh;
				const x = PAD + (W - PAD * 2) * (i / quarters.length) + 6;
				return (
					<g key={q.quarter_label}>
						<rect x={x} y={y} width={bw} height={bh} fill="var(--accent)" opacity={0.85} />
						<text x={x + bw / 2} y={y - 6} textAnchor="middle" fontSize="10" fontFamily="var(--font-mono)" fontWeight={700} fill="var(--fg)">
							${(q.total_amount / 1_000_000_000).toFixed(1)}B
						</text>
						<text x={x + bw / 2} y={H - 14} textAnchor="middle" fontSize="10" fontFamily="var(--font-mono)" fill="var(--fg-muted)">
							{q.quarter_label}
						</text>
						<text x={x + bw / 2} y={H + 4} textAnchor="middle" fontSize="9" fontFamily="var(--font-mono)" fill="var(--fg-muted)">
							{q.deal_count} deals
						</text>
					</g>
				);
			})}
			<path
				d={quarters
					.map((q, i) => {
						const x = PAD + (W - PAD * 2) * ((i + 0.5) / quarters.length);
						const y = H - PAD - ((H - PAD * 2) * q.total_amount) / maxAmt;
						return `${i === 0 ? 'M' : 'L'}${x},${y}`;
					})
					.join(' ')}
				stroke="var(--accent-2)"
				strokeWidth={2}
				fill="none"
			/>
		</svg>
	);
}

function splitDollars(n: number): { value: string; unit: string } {
	if (!Number.isFinite(n) || n <= 0) return { value: '—', unit: '' };
	if (n >= 1_000_000_000) return { value: `$${(n / 1_000_000_000).toFixed(1)}`, unit: 'B' };
	if (n >= 1_000_000) return { value: `$${(n / 1_000_000).toFixed(1)}`, unit: 'M' };
	if (n >= 1_000) return { value: `$${(n / 1_000).toFixed(0)}`, unit: 'K' };
	return { value: `$${n.toFixed(0)}`, unit: '' };
}
