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

interface SectorHeatRow { sector_id: string; sector_name: string; deal_count: number | string; total_amount: number | string | null }
interface WhitespaceSeg { sector_id: string; name: string; deals: number; gap_pct: number; tier: string }
interface WhitespaceResponse { segments: WhitespaceSeg[] }

const MAP_HUES = [350, 290, 160, 30, 60, 140, 255, 200];

export default function InvestorMarketPage() {
	const { data } = useSWR<AcqResponse>(qk.acquisitions.list({ sort: '-amount_usd', disclosed_only: true, limit: 6 }), { dedupingInterval: 10 * 60_000 });
	const { data: heat } = useSWR<SectorHeatRow[]>(qk.analytics.sectorHeat('all', 8), { dedupingInterval: 10 * 60_000 });
	const { data: ws } = useSWR<WhitespaceResponse>(qk.whitespace(), { dedupingInterval: 10 * 60_000 });
	const exits = data?.data ?? [];
	const whitespace = ws?.segments ?? [];

	const heatRows = heat ?? [];
	const maxCap = Math.max(1, ...heatRows.map((r) => Number(r.total_amount ?? 0)));
	const mapCells = heatRows.map((r, i) => ({
		label: r.sector_name,
		n: Number(r.deal_count ?? 0),
		h: Math.max(8, Math.round((Number(r.total_amount ?? 0) / maxCap) * 100)),
		color: `oklch(60% 0.20 ${MAP_HUES[i % MAP_HUES.length]})`,
	}));

	return (
		<Page>
			<WorkspaceHeader
				eyebrow="Dealflow Copilot · Market intelligence"
				title="Market maps & whitespace"
				sub="The shape of the market by sub-sector, where capital is concentrating, and where it isn't yet."
			/>

			<div className="card" style={{ marginBottom: 'var(--space-5)' }}>
				<SectionHead title="Market map" meta="deals · capital intensity" />
				{mapCells.length === 0 ? (
					<div style={{ padding: 'var(--space-4)' }}><Empty msg="No sector data yet." /></div>
				) : (
					<div className="cp-mapgrid cp-mapgrid-lg">
						{mapCells.map((c) => (
							<div key={c.label} className="cp-mapcell" style={{ ['--c' as string]: c.color }}>
								<div className="cp-mapcell-bar" style={{ height: `${c.h}%` }} />
								<div className="cp-mapcell-lbl">{c.label}</div>
								<div className="cp-mapcell-n">{c.n} deals</div>
							</div>
						))}
					</div>
				)}
			</div>

			<div className="grid-2">
				<div className="card">
					<SectionHead title="Whitespace" meta="underfunded vs market" />
					<div style={{ padding: 'var(--space-4)' }}>
						{whitespace.length === 0 ? (
							<Empty msg="No clear whitespace right now — capital is broadly matching activity." />
						) : whitespace.map((w) => (
							<div key={w.sector_id} className="cp-white-row">
								<span className="cp-white-stat">{w.tier}</span>
								<div style={{ flex: 1, minWidth: 0 }}>
									<div className="cp-white-label">{w.name}</div>
									<div className="cp-white-detail">{w.deals} deals · {w.gap_pct}% below median capital per deal</div>
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
