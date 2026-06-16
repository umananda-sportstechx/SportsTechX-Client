'use client';

import useSWR from 'swr';
import { qk } from '@/lib/query-keys';
import { Page, SectionHead, Empty } from '@/components/ui/atoms';
import { WorkspaceHeader } from '@/components/copilot/workspace-ui';

/**
 * InvestorMarket (i-market) — market maps + whitespace. The exit landscape is
 * wired to the real acquisitions endpoint; the sub-sector map + whitespace use
 * representative sample data (no heatmap endpoint yet).
 */

interface AcquisitionRow {
	id: string; acquiree_name?: string | null; acquirer_name?: string | null;
	amount_usd?: number | string | null;
}
interface AcqResponse { data: AcquisitionRow[] }

const MAP_CELLS = [
	{ label: 'Fan Engagement', n: 64, h: 100, color: 'oklch(58% 0.22 350)' },
	{ label: 'Media & Streaming', n: 52, h: 84, color: 'oklch(58% 0.22 290)' },
	{ label: 'Performance', n: 48, h: 78, color: 'oklch(58% 0.22 160)' },
	{ label: 'Venue & Live', n: 31, h: 52, color: 'oklch(62% 0.18 30)' },
	{ label: 'Wellness', n: 28, h: 46, color: 'oklch(62% 0.18 60)' },
	{ label: 'Gear & Hardware', n: 22, h: 38, color: 'oklch(62% 0.14 140)' },
	{ label: 'Esports', n: 41, h: 66, color: 'oklch(62% 0.18 255)' },
];

const WHITESPACE = [
	{ stat: 'Underfunded', label: 'Recovery & Wellness', detail: '−42% capital vs adjacent growth' },
	{ stat: 'Emerging', label: 'Women’s sports media', detail: '+88% YoY rounds, few late-stage funds' },
	{ stat: 'Whitespace', label: 'Grassroots & youth tech', detail: 'High activity, almost no specialist capital' },
];

export default function InvestorMarketPage() {
	const { data } = useSWR<AcqResponse>(qk.acquisitions.list({ sort: '-amount_usd', disclosed_only: true, limit: 6 }), { dedupingInterval: 10 * 60_000 });
	const exits = data?.data ?? [];

	return (
		<Page>
			<WorkspaceHeader
				eyebrow="Dealflow Copilot · Market intelligence"
				title="Market maps & whitespace"
				sub="The shape of the market by sub-sector, where capital is concentrating, and where it isn't yet."
			/>

			<div className="card" style={{ marginBottom: 'var(--space-5)' }}>
				<SectionHead title="Market map" meta="company count · capital intensity" />
				<div className="cp-mapgrid cp-mapgrid-lg">
					{MAP_CELLS.map((c) => (
						<div key={c.label} className="cp-mapcell" style={{ ['--c' as string]: c.color }}>
							<div className="cp-mapcell-bar" style={{ height: `${c.h}%` }} />
							<div className="cp-mapcell-lbl">{c.label}</div>
							<div className="cp-mapcell-n">{c.n} cos</div>
						</div>
					))}
				</div>
			</div>

			<div className="grid-2">
				<div className="card">
					<SectionHead title="Whitespace" meta="underfunded vs growth" />
					<div style={{ padding: 'var(--space-4)' }}>
						{WHITESPACE.map((w) => (
							<div key={w.label} className="cp-white-row">
								<span className="cp-white-stat">{w.stat}</span>
								<div style={{ flex: 1, minWidth: 0 }}>
									<div className="cp-white-label">{w.label}</div>
									<div className="cp-white-detail">{w.detail}</div>
								</div>
							</div>
						))}
					</div>
				</div>

				<div className="card">
					<SectionHead title="Exit landscape" meta="recent sector M&A" />
					{exits.length === 0 ? (
						<div style={{ padding: 'var(--space-4)' }}><Empty msg="No disclosed exits yet." /></div>
					) : (
						<table className="data-table">
							<thead>
								<tr><th>Target</th><th>Acquirer</th><th style={{ textAlign: 'right' }}>Value</th></tr>
							</thead>
							<tbody>
								{exits.map((e) => (
									<tr key={e.id}>
										<td style={{ fontWeight: 700 }}>{e.acquiree_name ?? '—'}</td>
										<td style={{ color: 'var(--fg-muted)' }}>{e.acquirer_name ?? '—'}</td>
										<td className="num" style={{ textAlign: 'right', fontWeight: 700 }}>{formatAmt(e.amount_usd)}</td>
									</tr>
								))}
							</tbody>
						</table>
					)}
				</div>
			</div>
		</Page>
	);
}

function formatAmt(v: number | string | null | undefined): string {
	if (v == null) return '—';
	const n = typeof v === 'string' ? Number(v) : v;
	if (!Number.isFinite(n) || n <= 0) return '—';
	if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
	if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(0)}M`;
	return `$${(n / 1_000).toFixed(0)}K`;
}
