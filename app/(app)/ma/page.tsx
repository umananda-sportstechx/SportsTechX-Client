'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { qk } from '@/lib/query-keys';
import { Page, Flag, Tag, SectorPill, Stat, SectionHead, Empty, PageTitle } from '@/components/ui/atoms';

interface AcquisitionRow {
	id: string;
	acquiree_name?: string | null;
	acquiree_slug?: string | null;
	acquiree_description?: string | null;
	acquirer_name?: string | null;
	acquirer_slug?: string | null;
	acquisition_type?: string | null;
	acquisition_date?: string | null;
	amount_usd?: number | string | null;
	primary_sector?: string | null;
	hq_country?: string | null;
}

interface AcquisitionsResponse {
	data: AcquisitionRow[];
	total: number;
	page: number;
	totalPages: number;
}

interface MaStatsResponse {
	count: number;
	largest_value: number;
	median_value: number;
	acquisition_pct: number;
}

export default function MnaPage() {
	const router = useRouter();
	const pathname = usePathname();
	const params = useSearchParams();

	const [page, setPage] = useState(Number(params.get('page') ?? '1'));
	const currentYear = new Date().getFullYear();

	const updateUrl = (updates: Record<string, string | number | null>) => {
		const sp = new URLSearchParams(params.toString());
		Object.entries(updates).forEach(([k, v]) => {
			if (v == null || v === '') sp.delete(k);
			else sp.set(k, String(v));
		});
		router.push(`${pathname}?${sp.toString()}`, { scroll: false });
	};

	const allTimeParams = { limit: 1, sort: '-acquisition_date' };
	const { data: allTime } = useSWR<AcquisitionsResponse>(qk.acquisitions.list(allTimeParams), { dedupingInterval: 10 * 60_000 });

	const { data: stats } = useSWR<MaStatsResponse>(qk.analytics.maStats('ytd'), { dedupingInterval: 10 * 60_000 });

	const tableParams = { page, limit: 30, sort: '-acquisition_date' };
	const { data: tableData, isLoading } = useSWR<AcquisitionsResponse>(qk.acquisitions.list(tableParams), { dedupingInterval: 3 * 60_000 });

	const totalAllTime = allTime?.total ?? 0;
	const table = tableData?.data ?? [];
	const totalPages = tableData?.totalPages ?? 1;

	return (
		<Page>
			<PageTitle
				kicker="M&A Tracker · all-time"
				title={`${totalAllTime.toLocaleString()} acquisitions tracked`}
			/>

			<div className="grid-4" style={{ marginBottom: 'var(--space-5)' }}>
				{statStrip(stats, currentYear).map((s, i) => (
					<div key={i} className="card" style={{ padding: 'var(--space-4)' }}>
						<Stat {...s} />
					</div>
				))}
			</div>

			<div className="card">
				<SectionHead title="Recent Acquisitions" meta={`${totalAllTime.toLocaleString()} disclosed`} />
				{isLoading && table.length === 0 ? (
					<Empty msg="Loading…" />
				) : table.length === 0 ? (
					<Empty msg="No acquisitions tracked yet." />
				) : (
					<table className="data-table">
						<thead>
							<tr>
								<th>Date</th>
								<th>Target</th>
								<th>Acquirer</th>
								<th>Sector</th>
								<th>Type</th>
								<th>Geo</th>
								<th style={{ textAlign: 'right' }}>Value</th>
							</tr>
						</thead>
						<tbody>
							{table.map((d) => {
								const isStrategic = d.acquisition_type !== 'asset_purchase';
								const cc = d.hq_country ? countryCode(d.hq_country) : '';
								const amt = Number(d.amount_usd ?? 0);
								return (
									<tr key={d.id}>
										<td className="num">{formatShortDate(d.acquisition_date)}</td>
										<td>
											<div style={{ fontWeight: 600 }}>{d.acquiree_name ?? '—'}</div>
											{d.acquiree_description && (
												<div
													style={{
														fontSize: 11,
														color: 'var(--fg-muted)',
														display: '-webkit-box',
														WebkitLineClamp: 1,
														WebkitBoxOrient: 'vertical',
														overflow: 'hidden',
													}}
												>
													{d.acquiree_description}
												</div>
											)}
										</td>
										<td>
											<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
												<ArrowRight size={12} style={{ color: 'var(--fg-muted)' }} />
												<span>{d.acquirer_name ?? '—'}</span>
											</div>
										</td>
										<td>{d.primary_sector ? <SectorPill name={d.primary_sector} /> : '—'}</td>
										<td><Tag variant={isStrategic ? 'pos' : 'pill'}>{formatType(d.acquisition_type)}</Tag></td>
										<td>{cc && <Flag cc={cc} />} {cc}</td>
										<td className="num" style={{ textAlign: 'right', fontWeight: 700 }}>
											{Number.isFinite(amt) && amt > 0
												? formatDollars(amt)
												: <span style={{ color: 'var(--fg-muted)', fontWeight: 400, fontSize: 11 }}>undisc.</span>}
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				)}

				{totalPages > 1 && (
					<div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8, padding: '12px var(--space-4)' }}>
						<span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-muted)', marginRight: 8 }}>
							Page {page} of {totalPages}
						</span>
						<button
							className="btn ghost"
							disabled={page <= 1}
							onClick={() => { const next = page - 1; setPage(next); updateUrl({ page: next }); }}
						>
							<ChevronLeft size={14} />
						</button>
						<button
							className="btn ghost"
							disabled={page >= totalPages}
							onClick={() => { const next = page + 1; setPage(next); updateUrl({ page: next }); }}
						>
							<ChevronRight size={14} />
						</button>
					</div>
				)}
			</div>
		</Page>
	);
}

function statStrip(stats: MaStatsResponse | undefined, currentYear: number) {
	const l = splitDollars(stats?.largest_value ?? 0);
	const m = splitDollars(stats?.median_value ?? 0);
	const strategicPct = stats?.acquisition_pct ?? 0;
	return [
		{ label: `${currentYear} YTD`,     value: (stats?.count ?? 0).toLocaleString(),                                                 deltaDir: 'pos' as const },
		{ label: `Largest ${currentYear}`, value: l.value, unit: l.unit,                                                                deltaDir: 'pos' as const },
		{ label: 'Median value',           value: m.value, unit: m.unit,                                                                deltaDir: 'pos' as const },
		{ label: 'Acquisitions share',     value: strategicPct.toString(), unit: '%', delta: `vs ${100 - strategicPct}% mergers`,      deltaDir: 'pos' as const },
	];
}

function formatType(t: string | null | undefined): string {
	if (!t) return 'Deal';
	switch (t) {
		case 'acquisition': return 'Strategic';
		case 'merger': return 'Merger';
		case 'asset_purchase': return 'Asset';
		default: return t;
	}
}

function splitDollars(n: number): { value: string; unit: string } {
	if (!Number.isFinite(n) || n <= 0) return { value: '—', unit: '' };
	if (n >= 1_000_000_000) return { value: `$${(n / 1_000_000_000).toFixed(2)}`, unit: 'B' };
	if (n >= 1_000_000) return { value: `$${(n / 1_000_000).toFixed(1)}`, unit: 'M' };
	if (n >= 1_000) return { value: `$${(n / 1_000).toFixed(0)}`, unit: 'K' };
	return { value: `$${n.toFixed(0)}`, unit: '' };
}

function formatDollars(value: number): string {
	if (!Number.isFinite(value) || value <= 0) return '—';
	if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
	if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(0)}M`;
	if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
	return `$${value.toFixed(0)}`;
}

function formatShortDate(iso: string | null | undefined): string {
	if (!iso) return '—';
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return '—';
	return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
}

function countryCode(countryName: string): string {
	const map: Record<string, string> = {
		'United States': 'US', USA: 'US', 'United Kingdom': 'GB', UK: 'GB',
		Germany: 'DE', France: 'FR', Italy: 'IT', Spain: 'ES', Netherlands: 'NL',
		'The Netherlands': 'NL', Sweden: 'SE', Switzerland: 'CH', Belgium: 'BE',
		Austria: 'AT', Poland: 'PL', India: 'IN', China: 'CN', Japan: 'JP',
		Singapore: 'SG', Australia: 'AU', Brazil: 'BR', Canada: 'CA', Portugal: 'PT',
	};
	return map[countryName] ?? countryName.slice(0, 2).toUpperCase();
}
