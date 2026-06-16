'use client';

import useSWR from 'swr';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { qk } from '@/lib/query-keys';
import { Page, Stat, SectionHead, Tag, Flag, Empty } from '@/components/ui/atoms';
import { WorkspaceHeader } from '@/components/copilot/workspace-ui';
import { MiniBars, genSpark } from '@/components/copilot/workspace-charts';

/**
 * FounderMarket (f-market) — the funding climate around the founder's sector.
 * The quarterly chart + recent rounds are wired to real endpoints; the
 * sector-scoped KPI tiles use representative sample data (analytics endpoints
 * aren't sector-filtered yet).
 */

interface QuarterlyPoint { year: number; quarter: number; quarter_label: string; total_amount: number; deal_count: number }
interface DealRow {
	id: string; company_name?: string | null; company_slug?: string | null;
	round_type_name?: string | null; hq_country?: string | null; amount_usd?: number | string | null;
}
interface DealsResponse { data: DealRow[] }

export default function FounderMarketPage() {
	const year = new Date().getFullYear();
	const { data: quarters } = useSWR<QuarterlyPoint[]>(qk.analytics.quarterly({ from: year - 1, to: year }), { dedupingInterval: 10 * 60_000 });
	const { data: deals } = useSWR<DealsResponse>(qk.deals.list({ limit: 6, sort: '-announced_date', year }), { dedupingInterval: 5 * 60_000 });

	const qPoints = quarters ?? [];
	const rounds = deals?.data ?? [];

	return (
		<Page>
			<WorkspaceHeader
				eyebrow="Fundraising Copilot · Market"
				title="Funding momentum in your sector"
				sub="The capital climate around fan-engagement — how much is being raised, by whom, and at what stage."
			/>

			<div className="grid-4" style={{ marginBottom: 'var(--space-5)' }}>
				<div className="card feature" style={{ padding: 'var(--space-4)' }}>
					<Stat label="Sector capital · TTM" value="$486" unit="M" delta="+31% YoY" deltaDir="pos" spark={genSpark(360, 486)} />
				</div>
				<div className="card feature" style={{ padding: 'var(--space-4)' }}>
					<Stat label="Rounds · TTM" value="74" delta="+12 vs prior" deltaDir="pos" spark={genSpark(58, 74)} />
				</div>
				<div className="card feature" style={{ padding: 'var(--space-4)' }}>
					<Stat label="Median Series B" value="$24" unit="M" delta="in your range" deltaDir="pos" spark={genSpark(20, 24)} />
				</div>
				<div className="card feature" style={{ padding: 'var(--space-4)' }}>
					<Stat label="Active investors" value="12" delta="matched to you" deltaDir="pos" spark={genSpark(6, 12)} />
				</div>
			</div>

			<div className="grid-2">
				<div className="card">
					<SectionHead title="Quarterly capital into sector" meta="$ raised" />
					<div style={{ padding: 'var(--space-4)' }}>
						{qPoints.length === 0
							? <Empty msg="No quarterly data yet." />
							: <MiniBars values={qPoints.map((q) => q.total_amount)} labels={qPoints.map((q) => q.quarter_label)} />}
					</div>
				</div>

				<div className="card">
					<SectionHead title="Recent rounds in your sector" action={<Link className="btn ghost" href="/funding">Funding tracker <ArrowRight size={12} /></Link>} />
					{rounds.length === 0 ? (
						<div style={{ padding: 'var(--space-4)' }}><Empty msg="No recent rounds." /></div>
					) : (
						<table className="data-table">
							<thead>
								<tr><th>Company</th><th>Round</th><th>Geo</th><th style={{ textAlign: 'right' }}>Amount</th></tr>
							</thead>
							<tbody>
								{rounds.map((d) => (
									<tr key={d.id}>
										<td>
											<Link href={d.company_slug ? `/companies/${d.company_slug}` : '/funding'} style={{ fontWeight: 700 }}>
												{d.company_name ?? '—'}
											</Link>
										</td>
										<td>{d.round_type_name ? <Tag variant="pos">{d.round_type_name}</Tag> : '—'}</td>
										<td>{d.hq_country ? <Flag cc={countryCode(d.hq_country)} /> : '—'}</td>
										<td className="num" style={{ textAlign: 'right', fontWeight: 700 }}>{formatAmt(d.amount_usd)}</td>
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
	if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
	return `$${n.toFixed(0)}`;
}

function countryCode(name: string): string {
	const map: Record<string, string> = {
		'United States': 'US', USA: 'US', 'United Kingdom': 'GB', UK: 'GB',
		Germany: 'DE', France: 'FR', Italy: 'IT', Spain: 'ES', Netherlands: 'NL',
		Sweden: 'SE', Switzerland: 'CH', India: 'IN', China: 'CN', Japan: 'JP',
		Singapore: 'SG', Australia: 'AU', Brazil: 'BR', Canada: 'CA', Portugal: 'PT',
	};
	return map[name] ?? name.slice(0, 2).toUpperCase();
}
