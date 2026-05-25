'use client';

import Link from 'next/link';
import { useState } from 'react';
import useSWR from 'swr';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { qk } from '@/lib/query-keys';
import { Page, Flag, Tag, SectorPill, Empty } from '@/components/ui/atoms';

interface Acquisition {
	id: string;
	acquiree_name?: string | null;
	acquiree_description?: string | null;
	acquirer_name?: string | null;
	acquisition_type?: string | null;
	acquisition_date?: string | null;
	amount_usd?: number | string | null;
	primary_sector?: string | null;
	hq_country?: string | null;
}

interface AcquisitionsResponse { data: Acquisition[]; total: number; page: number; totalPages: number }

export default function AcquisitionsListPage() {
	const router = useRouter();
	const pathname = usePathname();
	const params = useSearchParams();
	const [page, setPage] = useState(Number(params.get('page') ?? '1'));

	const updateUrl = (updates: Record<string, string | number | null>) => {
		const sp = new URLSearchParams(params.toString());
		Object.entries(updates).forEach(([k, v]) => {
			if (v == null || v === '') sp.delete(k);
			else sp.set(k, String(v));
		});
		router.push(`${pathname}?${sp.toString()}`, { scroll: false });
	};

	const { data, isLoading } = useSWR<AcquisitionsResponse>(
		qk.acquisitions.list({ page, limit: 30, sort: '-acquisition_date' }),
		{ dedupingInterval: 3 * 60_000 },
	);
	const rows = data?.data ?? [];
	const total = data?.total ?? 0;
	const totalPages = data?.totalPages ?? 1;

	return (
		<Page>
			<div style={{ marginBottom: 'var(--space-5)' }}>
				<div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
					M&amp;A · {total.toLocaleString()} tracked
				</div>
				<h1 style={{ fontFamily: 'var(--font-display)', fontSize: 38, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1, margin: '0 0 6px' }}>
					Acquisitions
				</h1>
				<p style={{ fontSize: 14, color: 'var(--fg-2)', margin: 0 }}>
					Every disclosed merger, acquisition, and asset purchase in sports tech.
				</p>
			</div>

			{isLoading && rows.length === 0 ? (
				<Empty msg="Loading…" />
			) : rows.length === 0 ? (
				<Empty msg="No acquisitions tracked yet." />
			) : (
				<div className="card">
					<table className="data-table">
						<thead>
							<tr>
								<th>Date</th><th>Target</th><th>Acquirer</th>
								<th>Sector</th><th>Type</th><th>Geo</th>
								<th style={{ textAlign: 'right' }}>Value</th>
							</tr>
						</thead>
						<tbody>
							{rows.map((d) => {
								const isStrategic = d.acquisition_type !== 'asset_purchase';
								const cc = d.hq_country ? countryCode(d.hq_country) : '';
								const amt = Number(d.amount_usd ?? 0);
								return (
									<tr key={d.id}>
										<td className="num">{formatShortDate(d.acquisition_date)}</td>
										<td>
											<Link href={`/acquisitions/${d.id}`} style={{ fontWeight: 600 }}>
												{d.acquiree_name ?? '—'}
											</Link>
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
											{Number.isFinite(amt) && amt > 0 ? formatDollars(amt) : <span style={{ color: 'var(--fg-muted)', fontWeight: 400, fontSize: 11 }}>undisc.</span>}
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			)}

			{totalPages > 1 && (
				<div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8, marginTop: 24 }}>
					<span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-muted)', marginRight: 8 }}>
						Page {page} of {totalPages}
					</span>
					<button className="btn ghost" disabled={page <= 1} onClick={() => { const next = page - 1; setPage(next); updateUrl({ page: next }); }}>
						<ChevronLeft size={14} />
					</button>
					<button className="btn ghost" disabled={page >= totalPages} onClick={() => { const next = page + 1; setPage(next); updateUrl({ page: next }); }}>
						<ChevronRight size={14} />
					</button>
				</div>
			)}
		</Page>
	);
}

function formatType(t: string | null | undefined): string {
	if (!t) return 'Deal';
	switch (t) {
		case 'acquisition': return 'Acquisition';
		case 'merger': return 'Merger';
		case 'asset_purchase': return 'Asset';
		default: return t;
	}
}

function formatShortDate(iso: string | null | undefined): string {
	if (!iso) return '—';
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return '—';
	return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
}

function formatDollars(value: number | string): string {
	const n = typeof value === 'string' ? Number(value) : value;
	if (!Number.isFinite(n) || n <= 0) return '—';
	if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
	if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(0)}M`;
	if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
	return `$${n.toFixed(0)}`;
}

function countryCode(countryName: string): string {
	const map: Record<string, string> = {
		'United States': 'US', USA: 'US', 'United Kingdom': 'GB', UK: 'GB',
		Germany: 'DE', France: 'FR', Italy: 'IT', Spain: 'ES', Netherlands: 'NL',
		Sweden: 'SE', Switzerland: 'CH', Belgium: 'BE', Austria: 'AT', Poland: 'PL',
		India: 'IN', China: 'CN', Japan: 'JP', Singapore: 'SG', Australia: 'AU',
		Brazil: 'BR', Canada: 'CA', Portugal: 'PT',
	};
	return map[countryName] ?? countryName.slice(0, 2).toUpperCase();
}
