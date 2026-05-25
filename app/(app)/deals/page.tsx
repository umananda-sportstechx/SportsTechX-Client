'use client';

import Link from 'next/link';
import { useState } from 'react';
import useSWR from 'swr';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Search, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { qk } from '@/lib/query-keys';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { Page, Flag, Tag, SectorPill, Empty, Logo } from '@/components/ui/atoms';
import { CompareBar } from '@/components/compare-bar';
import { CompareToggle } from '@/components/compare-toggle';

interface Deal {
	id: string;
	company_id?: string | null;
	company_name?: string | null;
	company_slug?: string | null;
	announced_date?: string | null;
	amount_usd?: number | string | null;
	round_type_name?: string | null;
	primary_sector?: string | null;
	lead_investor?: string | null;
	hq_country?: string | null;
}

interface DealsResponse { data: Deal[]; total: number; page: number; totalPages: number }

export default function DealsListPage() {
	const router = useRouter();
	const pathname = usePathname();
	const params = useSearchParams();

	const [search, setSearch] = useState(params.get('q') ?? '');
	const [page, setPage] = useState(Number(params.get('page') ?? '1'));
	const debouncedSearch = useDebouncedValue(search, 300);

	const updateUrl = (updates: Record<string, string | number | null>) => {
		const sp = new URLSearchParams(params.toString());
		Object.entries(updates).forEach(([k, v]) => {
			if (v == null || v === '') sp.delete(k);
			else sp.set(k, String(v));
		});
		router.push(`${pathname}?${sp.toString()}`, { scroll: false });
	};

	const queryParams: Record<string, unknown> = { page, limit: 30, sort: '-announced_date' };
	if (debouncedSearch) queryParams.search = debouncedSearch;

	const { data, isLoading } = useSWR<DealsResponse>(qk.deals.list(queryParams), {
		dedupingInterval: 3 * 60_000,
	});
	const deals = data?.data ?? [];
	const total = data?.total ?? 0;
	const totalPages = data?.totalPages ?? 1;

	return (
		<Page>
			<div style={{ marginBottom: 'var(--space-5)' }}>
				<div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
					Deals · {total.toLocaleString()} disclosed
				</div>
				<h1 style={{ fontFamily: 'var(--font-display)', fontSize: 38, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1, margin: '0 0 6px' }}>
					Deals
				</h1>
				<p style={{ fontSize: 14, color: 'var(--fg-2)', margin: 0 }}>
					Every disclosed funding round we've tracked.
				</p>
			</div>

			<div className="filter-bar">
				<div style={{ position: 'relative', flex: '0 0 280px' }}>
					<Search size={14} style={{ position: 'absolute', left: 10, top: 9, color: 'var(--fg-muted)', pointerEvents: 'none' }} />
					<input
						className="search-input"
						style={{ paddingLeft: 32, height: 32, width: '100%' }}
						placeholder="Search…"
						value={search}
						onChange={(e) => { setSearch(e.target.value); setPage(1); updateUrl({ q: e.target.value || null, page: null }); }}
					/>
				</div>
				<div style={{ flex: 1 }} />
				<button className="btn ghost"><Filter size={12} /> More filters</button>
			</div>

			{isLoading && deals.length === 0 ? (
				<Empty msg="Loading…" />
			) : deals.length === 0 ? (
				<Empty msg="No deals match those filters." />
			) : (
				<div className="card">
					<table className="data-table">
						<thead>
							<tr>
								<th>Date</th><th>Company</th><th>Sector</th><th>Round</th><th>Lead investor</th>
								<th>Geo</th><th style={{ textAlign: 'right' }}>Amount</th><th />
							</tr>
						</thead>
						<tbody>
							{deals.map((d) => {
								const cc = d.hq_country ? countryCode(d.hq_country) : '';
								return (
									<tr key={d.id}>
										<td className="num">{formatShortDate(d.announced_date)}</td>
										<td>
											<Link href={`/deals/${d.id}`} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
												<Logo co={{ name: d.company_name ?? '—' }} size={24} />
												<span style={{ fontWeight: 600 }}>{d.company_name ?? '—'}</span>
											</Link>
										</td>
										<td>{d.primary_sector ? <SectorPill name={d.primary_sector} /> : '—'}</td>
										<td>{d.round_type_name ? <Tag variant="pos">{d.round_type_name}</Tag> : '—'}</td>
										<td style={{ color: 'var(--fg-2)' }}>{d.lead_investor ?? '—'}</td>
										<td>{cc && <Flag cc={cc} />} {cc}</td>
										<td className="num" style={{ textAlign: 'right', fontWeight: 700 }}>{formatDollars(d.amount_usd)}</td>
										<td style={{ textAlign: 'right' }}><CompareToggle id={d.id} kind="deals" /></td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			)}

			<CompareBar kind="deals" />

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

function formatShortDate(iso: string | null | undefined): string {
	if (!iso) return '—';
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return '—';
	return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
}

function formatDollars(value: number | string | null | undefined): string {
	if (value == null) return '—';
	const n = typeof value === 'string' ? Number(value) : value;
	if (!Number.isFinite(n) || n <= 0) return '—';
	if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
	if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
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
