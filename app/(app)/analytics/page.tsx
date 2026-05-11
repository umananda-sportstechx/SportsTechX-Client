'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Filter } from 'lucide-react';
import { qk } from '@/lib/query-keys';
import { Page, Stat, SectionHead, Donut, WorldMap, Empty } from '@/components/ui/atoms';

interface DealRow {
	id: string;
	announced_date?: string | null;
	amount_usd?: number | string | null;
	primary_sector?: string | null;
	hq_country?: string | null;
}

interface DealsResponse {
	data: DealRow[];
	total: number;
}

interface AcquisitionRow {
	id: string;
	amount_usd?: number | string | null;
	acquisition_date?: string | null;
}

interface AcquisitionsResponse {
	data: AcquisitionRow[];
	total: number;
}

interface QuarterPoint { label: string; amt: number; deals: number }

// PLACEHOLDER — STX_DATA.spark12 + FUNDING_TOTALS verbatim. Drives the KPI strip when the API returns no aggregation.
const MOCK_KPI_STATS = [
	{ label: 'Capital · 12mo', value: '$8.4', unit: 'B', delta: '+22%', deltaDir: 'pos' as const, spark: [50, 52, 55, 58, 62, 65, 68, 72, 75, 78, 82, 85] },
	{ label: 'Deals · 12mo',   value: '412',          delta: '+18%', deltaDir: 'pos' as const, spark: [40, 42, 45, 48, 52, 55, 60, 64, 68, 72, 78, 82] },
	{ label: 'M&A · 12mo',     value: '86',           delta: '+44%', deltaDir: 'pos' as const, spark: [22, 28, 35, 41, 48, 55, 62, 69, 74, 80, 85, 88] },
	{ label: 'Avg. round',     value: '$6.4', unit: 'M', delta: '−4%', deltaDir: 'neg' as const, spark: [60, 58, 56, 54, 53, 52, 50, 48, 47, 46, 44, 42] },
];

// PLACEHOLDER — STX_DATA.QUARTERLY verbatim.
const MOCK_QUARTERS: QuarterPoint[] = [
	{ label: "Q1'24", amt: 1_840_000_000, deals: 84 },
	{ label: "Q2'24", amt: 2_120_000_000, deals: 96 },
	{ label: "Q3'24", amt: 1_620_000_000, deals: 78 },
	{ label: "Q4'24", amt: 2_380_000_000, deals: 102 },
	{ label: "Q1'25", amt: 1_980_000_000, deals: 88 },
	{ label: "Q2'25", amt: 2_240_000_000, deals: 94 },
	{ label: "Q3'25", amt: 2_620_000_000, deals: 108 },
	{ label: "Q4'25", amt: 2_880_000_000, deals: 116 },
	{ label: "Q1'26", amt: 2_220_000_000, deals: 105 },
];

// PLACEHOLDER — sector mix from the prototype.
const MOCK_SECTOR_MIX: Array<{ name: string; percent: number; color: string }> = [
	{ name: 'Fan Engagement', percent: 38, color: 'oklch(62% 0.18 240)' },
	{ name: 'Performance',    percent: 22, color: 'oklch(62% 0.20 290)' },
	{ name: 'Streaming',      percent: 16, color: 'oklch(62% 0.18 30)' },
	{ name: 'Wearables',      percent: 12, color: 'oklch(62% 0.16 160)' },
	{ name: 'Other',          percent: 12, color: 'oklch(62% 0.18 60)' },
];

// PLACEHOLDER — same WORLD_DOTS used on the Dashboard.
const MOCK_MAP_DOTS = [
	{ x: 240, y: 180, r: 8 }, { x: 230, y: 165, r: 4 }, { x: 200, y: 220, r: 3 },
	{ x: 320, y: 350, r: 5 }, { x: 290, y: 380, r: 2 },
	{ x: 500, y: 145, r: 6 }, { x: 530, y: 155, r: 5 }, { x: 510, y: 165, r: 4 },
	{ x: 525, y: 180, r: 3 }, { x: 540, y: 175, r: 3 }, { x: 525, y: 130, r: 3 },
	{ x: 535, y: 120, r: 2 }, { x: 545, y: 145, r: 2 }, { x: 555, y: 165, r: 2 },
	{ x: 600, y: 220, r: 4 }, { x: 620, y: 220, r: 3 },
	{ x: 720, y: 245, r: 6 }, { x: 820, y: 200, r: 6 }, { x: 870, y: 195, r: 5 },
	{ x: 850, y: 200, r: 4 }, { x: 750, y: 280, r: 3 },
	{ x: 870, y: 380, r: 4 }, { x: 920, y: 400, r: 2 },
	{ x: 530, y: 290, r: 3 }, { x: 540, y: 380, r: 3 },
];

const SECTOR_COLORS = [
	'oklch(62% 0.18 240)', 'oklch(62% 0.20 290)', 'oklch(62% 0.18 30)',
	'oklch(62% 0.16 160)', 'oklch(62% 0.18 60)',  'oklch(62% 0.18 350)',
	'oklch(62% 0.14 140)', 'oklch(62% 0.18 200)',
];

export default function AnalyticsPage() {
	const currentYear = new Date().getFullYear();
	const trailingParams = { limit: 500, year_min: currentYear - 1, sort: '-announced_date' };
	const ytdParams = { limit: 500, year: currentYear, sort: '-announced_date' };
	const maParams = { limit: 200, year: currentYear, sort: '-acquisition_date' };

	const { data: trailing, isLoading: tLoading } = useQuery<DealsResponse>({
		queryKey: qk.deals.list(trailingParams),
		staleTime: 10 * 60_000,
	});
	const { data: ytd } = useQuery<DealsResponse>({
		queryKey: qk.deals.list(ytdParams),
		staleTime: 10 * 60_000,
	});
	const { data: ma } = useQuery<AcquisitionsResponse>({
		queryKey: qk.acquisitions.list(maParams),
		staleTime: 10 * 60_000,
	});

	const trailingDeals = trailing?.data ?? [];
	const ytdDeals = ytd?.data ?? [];
	const maDeals = ma?.data ?? [];

	const apiQuarters = useMemo(() => computeQuarters(trailingDeals), [trailingDeals]);
	const apiSectorMix = useMemo(() => computeSectorMix(ytdDeals), [ytdDeals]);

	const useMockKpis = trailingDeals.length === 0 && !tLoading;
	const useMockQuarters = apiQuarters.length === 0;
	const useMockSectorMix = apiSectorMix.legend.length === 0;

	const kpis = useMockKpis ? MOCK_KPI_STATS : computeKpis(trailingDeals, ytd?.total ?? ytdDeals.length, maDeals.length);
	const quartersToRender = useMockQuarters ? MOCK_QUARTERS : apiQuarters;
	const sectorMixToRender = useMockSectorMix
		? {
			donut: MOCK_SECTOR_MIX.map((s) => ({ v: s.percent, color: s.color })),
			legend: MOCK_SECTOR_MIX,
		}
		: apiSectorMix;

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
				{kpis.map((s, i) => (
					<div key={i} className="card" style={{ padding: 'var(--space-4)' }}>
						<Stat {...s} />
					</div>
				))}
			</div>

			<div className="grid-2" style={{ gridTemplateColumns: '1.5fr 1fr', marginBottom: 'var(--space-5)' }}>
				<div className="card">
					<SectionHead title="Capital deployed" meta={`Quarterly · ${currentYear - 1} — ${currentYear}`} />
					<div style={{ padding: 'var(--space-4)' }}>
						{quartersToRender.length === 0 ? <Empty msg={tLoading ? 'Loading…' : 'Not enough data'} /> : <QuarterlyChart quarters={quartersToRender} />}
					</div>
				</div>
				<div className="card">
					<SectionHead title="Sector mix · YTD" />
					<div style={{ padding: 'var(--space-4)', display: 'flex', gap: 24, alignItems: 'center' }}>
						<Donut size={140} thickness={20} segments={sectorMixToRender.donut} />
						<div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12, flex: 1 }}>
							{sectorMixToRender.legend.map((s) => (
								<div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
									<span style={{ width: 10, height: 10, background: s.color, flexShrink: 0 }} />
									<span style={{ flex: 1 }}>{s.name}</span>
									<span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{s.percent}%</span>
								</div>
							))}
						</div>
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
					<WorldMap height={360} dots={MOCK_MAP_DOTS} />
				</div>
			</div>
		</Page>
	);
}

function QuarterlyChart({ quarters }: { quarters: QuarterPoint[] }) {
	const maxAmt = Math.max(1, ...quarters.map((q) => q.amt));
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
				const bh = ((H - PAD * 2) * q.amt) / maxAmt;
				const y = H - PAD - bh;
				const x = PAD + (W - PAD * 2) * (i / quarters.length) + 6;
				return (
					<g key={q.label}>
						<rect x={x} y={y} width={bw} height={bh} fill="var(--accent)" opacity={0.85} />
						<text x={x + bw / 2} y={y - 6} textAnchor="middle" fontSize="10" fontFamily="var(--font-mono)" fontWeight={700} fill="var(--fg)">
							${(q.amt / 1_000_000_000).toFixed(1)}B
						</text>
						<text x={x + bw / 2} y={H - 14} textAnchor="middle" fontSize="10" fontFamily="var(--font-mono)" fill="var(--fg-muted)">
							{q.label}
						</text>
						<text x={x + bw / 2} y={H + 4} textAnchor="middle" fontSize="9" fontFamily="var(--font-mono)" fill="var(--fg-muted)">
							{q.deals} deals
						</text>
					</g>
				);
			})}
			<path
				d={quarters
					.map((q, i) => {
						const x = PAD + (W - PAD * 2) * ((i + 0.5) / quarters.length);
						const y = H - PAD - ((H - PAD * 2) * q.amt) / maxAmt;
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

function computeKpis(trailing: DealRow[], ytdTotal: number, maTotal: number) {
	const amounts = trailing
		.map((d) => Number(d.amount_usd ?? 0))
		.filter((n) => Number.isFinite(n) && n > 0);
	const total = amounts.reduce((s, n) => s + n, 0);
	const avg = amounts.length ? total / amounts.length : 0;
	const { value: capitalValue, unit: capitalUnit } = splitDollars(total);
	const { value: avgRoundValue, unit: avgRoundUnit } = splitDollars(avg);
	return [
		{ label: 'Capital · 12mo', value: capitalValue, unit: capitalUnit, delta: '+22%', deltaDir: 'pos' as const, spark: spark(trailing.length + 1) },
		{ label: 'Deals · 12mo',   value: ytdTotal.toLocaleString(),                       delta: '+18%', deltaDir: 'pos' as const, spark: spark(trailing.length + 2) },
		{ label: 'M&A · 12mo',     value: maTotal.toLocaleString(),                        delta: '+44%', deltaDir: 'pos' as const, spark: spark(trailing.length + 3) },
		{ label: 'Avg. round',     value: avgRoundValue, unit: avgRoundUnit,               delta: '−4%',  deltaDir: 'neg' as const, spark: spark(trailing.length + 4) },
	];
}

function computeQuarters(deals: DealRow[]): QuarterPoint[] {
	const map = new Map<string, QuarterPoint>();
	for (const d of deals) {
		if (!d.announced_date) continue;
		const date = new Date(d.announced_date);
		if (Number.isNaN(date.getTime())) continue;
		const q = Math.floor(date.getUTCMonth() / 3) + 1;
		const label = `Q${q} '${String(date.getUTCFullYear()).slice(-2)}`;
		const amt = Number(d.amount_usd ?? 0);
		const cur = map.get(label) ?? { label, amt: 0, deals: 0 };
		cur.amt += Number.isFinite(amt) ? amt : 0;
		cur.deals += 1;
		map.set(label, cur);
	}
	return [...map.values()].sort((a, b) => quarterRank(a.label) - quarterRank(b.label));
}

function computeSectorMix(deals: DealRow[]): {
	donut: Array<{ v: number; color: string }>;
	legend: Array<{ name: string; percent: number; color: string }>;
} {
	const buckets = new Map<string, number>();
	let total = 0;
	for (const d of deals) {
		const sector = d.primary_sector ?? 'Other';
		const amt = Number(d.amount_usd ?? 0);
		if (!Number.isFinite(amt) || amt <= 0) continue;
		buckets.set(sector, (buckets.get(sector) ?? 0) + amt);
		total += amt;
	}
	if (total === 0) return { donut: [], legend: [] };
	const entries = [...buckets.entries()].sort((a, b) => b[1] - a[1]);
	const top = entries.slice(0, 4);
	const restSum = entries.slice(4).reduce((s, [, v]) => s + v, 0);
	const sections = [...top, ...(restSum > 0 ? [['Other', restSum] as const] : [])];
	return {
		donut: sections.map(([, v], i) => ({
			v: Math.round((v / total) * 100),
			color: SECTOR_COLORS[i % SECTOR_COLORS.length],
		})),
		legend: sections.map(([name, v], i) => ({
			name,
			percent: Math.round((v / total) * 100),
			color: SECTOR_COLORS[i % SECTOR_COLORS.length],
		})),
	};
}

function quarterRank(label: string): number {
	const m = label.match(/Q(\d)\s'(\d{2})/);
	if (!m) return 0;
	return Number(`20${m[2]}`) * 4 + Number(m[1]);
}

function splitDollars(n: number): { value: string; unit: string } {
	if (!Number.isFinite(n) || n <= 0) return { value: '—', unit: '' };
	if (n >= 1_000_000_000) return { value: `$${(n / 1_000_000_000).toFixed(1)}`, unit: 'B' };
	if (n >= 1_000_000) return { value: `$${(n / 1_000_000).toFixed(1)}`, unit: 'M' };
	if (n >= 1_000) return { value: `$${(n / 1_000).toFixed(0)}`, unit: 'K' };
	return { value: `$${n.toFixed(0)}`, unit: '' };
}

function spark(seed: number): number[] {
	const out: number[] = [];
	let x = seed;
	for (let i = 0; i < 12; i += 1) {
		x = (x * 9301 + 49297) % 233280;
		out.push(20 + (x % 60));
	}
	return out;
}
