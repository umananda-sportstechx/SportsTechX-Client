'use client';

import { useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Search, Filter, Plus, Grid3x3, List, FileText, ChevronLeft, ChevronRight, Heart } from 'lucide-react';
import { qk } from '@/lib/query-keys';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { Page, Logo, Flag, SectorPill, Chip, Tag, Empty, PageTitle } from '@/components/ui/atoms';
import { CompareBar } from '@/components/compare-bar';
import { CompareToggle } from '@/components/compare-toggle';

interface CompanyRow {
	id: string;
	name: string;
	slug?: string;
	description?: string | null;
	primary_sector?: string | null;
	hq_city?: string | null;
	hq_country?: string | null;
	founded_year?: number | null;
	total_funding_usd?: number | string | null;
	stage?: string | null;
	last_round?: string | null;
}

interface CompaniesResponse {
	data: CompanyRow[];
	total: number;
	page: number;
	totalPages: number;
}

interface SectorRef { id: string; name: string; slug: string }
interface RefResponse<T> { data: T[] }

export default function CompaniesPage() {
	const router = useRouter();
	const pathname = usePathname();
	const params = useSearchParams();

	const [view, setView] = useState<'grid' | 'table'>((params.get('view') as 'grid' | 'table') ?? 'grid');
	const [search, setSearch] = useState(params.get('q') ?? '');
	const [sectorSlug, setSectorSlug] = useState(params.get('sector') ?? '');
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

	const queryParams: Record<string, unknown> = { page, limit: 24 };
	if (debouncedSearch) queryParams.search = debouncedSearch;
	if (sectorSlug) queryParams.sector = sectorSlug;

	const { data, isLoading } = useSWR<CompaniesResponse>(qk.companies.list(queryParams), {
		dedupingInterval: 3 * 60_000,
	});

	const { data: sectors } = useSWR<RefResponse<SectorRef> | SectorRef[]>(qk.reference.sectors(), {
		dedupingInterval: 60 * 60_000,
	});

	const companies = data?.data ?? [];
	const total = data?.total ?? 0;
	const totalPages = data?.totalPages ?? 1;
	const sectorList = Array.isArray(sectors) ? sectors : (sectors?.data ?? []);

	const handleSectorChip = (slug: string) => {
		const next = sectorSlug === slug ? '' : slug;
		setSectorSlug(next);
		setPage(1);
		updateUrl({ sector: next || null, page: null });
	};

	return (
		<Page>
			<PageTitle
				kicker={`Database · ${total.toLocaleString()} entries`}
				title="Companies"
				action={
					<>
						<div style={{ display: 'flex', border: '1px solid var(--border)' }}>
							<button
								className={`btn ghost ${view === 'grid' ? 'primary' : ''}`}
								onClick={() => { setView('grid'); updateUrl({ view: 'grid' }); }}
								style={{ borderRadius: 0 }}
								aria-label="Grid view"
							>
								<Grid3x3 size={14} />
							</button>
							<button
								className={`btn ghost ${view === 'table' ? 'primary' : ''}`}
								onClick={() => { setView('table'); updateUrl({ view: 'table' }); }}
								style={{ borderRadius: 0 }}
								aria-label="Table view"
							>
								<List size={14} />
							</button>
						</div>
						<button className="btn"><Plus size={12} /> Add to watchlist</button>
					</>
				}
			/>

			<div className="filter-bar">
				<div style={{ position: 'relative', flex: '0 0 280px' }}>
					<Search
						size={14}
						style={{ position: 'absolute', left: 10, top: 9, color: 'var(--fg-muted)', pointerEvents: 'none' }}
					/>
					<input
						className="search-input"
						style={{ paddingLeft: 32, height: 32, width: '100%' }}
						placeholder="Search…"
						value={search}
						onChange={(e) => {
							setSearch(e.target.value);
							setPage(1);
							updateUrl({ q: e.target.value || null, page: null });
						}}
					/>
				</div>
				<Chip active={!sectorSlug} count={total} onClick={() => handleSectorChip('')}>
					All
				</Chip>
				{sectorList.slice(0, 10).map((s) => (
					<Chip key={s.id} active={sectorSlug === s.slug} onClick={() => handleSectorChip(s.slug)}>
						{s.name}
					</Chip>
				))}
				<div style={{ flex: 1 }} />
				<button className="btn ghost"><Filter size={12} /> More filters</button>
				<button className="btn ghost"><FileText size={12} /> Export</button>
			</div>

			<div
				style={{
					fontFamily: 'var(--font-mono)',
					fontSize: 11,
					color: 'var(--fg-muted)',
					textTransform: 'uppercase',
					letterSpacing: '0.08em',
					marginBottom: 12,
				}}
			>
				Showing <b style={{ color: 'var(--fg)' }}>{companies.length.toLocaleString()}</b> of {total.toLocaleString()} · Sorted by activity
			</div>

			{isLoading && companies.length === 0 ? (
				<Empty msg="Loading…" />
			) : companies.length === 0 ? (
				<Empty msg="No companies match those filters." />
			) : view === 'grid' ? (
				<div className="co-grid">
					{companies.map((c) => <CompanyCard key={c.id} c={c} />)}
				</div>
			) : (
				<div className="card">
					<table className="data-table">
						<thead>
							<tr>
								<th>Company</th>
								<th>Sector</th>
								<th>Stage</th>
								<th>HQ</th>
								<th style={{ textAlign: 'right' }}>Raised</th>
								<th>Last Round</th>
								<th>Founded</th>
							</tr>
						</thead>
						<tbody>
							{companies.map((c) => (
								<tr key={c.id}>
									<td>
										<Link
											href={`/companies/${c.slug ?? c.id}`}
											style={{ display: 'flex', alignItems: 'center', gap: 10 }}
										>
											<Logo co={{ name: c.name }} size={28} />
											<div>
												<div style={{ fontWeight: 600 }}>{c.name}</div>
												{c.description && (
													<div
														style={{
															fontSize: 11,
															color: 'var(--fg-muted)',
															maxWidth: 280,
															overflow: 'hidden',
															textOverflow: 'ellipsis',
															whiteSpace: 'nowrap',
														}}
													>
														{c.description}
													</div>
												)}
											</div>
										</Link>
									</td>
									<td>{c.primary_sector ? <SectorPill name={c.primary_sector} /> : '—'}</td>
									<td>{c.stage ? <Tag>{c.stage}</Tag> : '—'}</td>
									<td style={{ fontSize: 12, color: 'var(--fg-2)' }}>
										{c.hq_country && <Flag cc={countryCode(c.hq_country)} />}{' '}
										{c.hq_city ? `${c.hq_city}, ` : ''}{c.hq_country ?? ''}
									</td>
									<td className="num" style={{ textAlign: 'right', fontWeight: 700 }}>
										{formatRaised(c.total_funding_usd)}
									</td>
									<td className="num">{c.last_round ?? '—'}</td>
									<td className="num">{c.founded_year ?? '—'}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}

			<CompareBar kind="companies" />

			{totalPages > 1 && (
				<div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8, marginTop: 24 }}>
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
		</Page>
	);
}

function CompanyCard({ c }: { c: CompanyRow }) {
	const cc = c.hq_country ? countryCode(c.hq_country) : '';
	const fav = (c.id.charCodeAt(c.id.length - 1) % 3) === 0;
	return (
		<Link href={`/companies/${c.slug ?? c.id}`} className="card co-card" style={{ display: 'block' }}>
			<div className="co-card-head">
				<Logo co={{ name: c.name }} size={44} />
				<div style={{ flex: 1, minWidth: 0 }}>
					<div style={{ fontWeight: 700, fontSize: 15 }}>{c.name}</div>
					<div style={{ fontSize: 11, color: 'var(--fg-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
						{cc && <Flag cc={cc} />}
						{c.hq_city ?? c.hq_country ?? '—'}
					</div>
				</div>
				{fav && <Heart size={14} fill="var(--accent)" stroke="var(--accent)" />}
			</div>
			<p className="co-sub">{c.description ?? '—'}</p>
			<div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, margin: '10px 0' }}>
				{c.primary_sector && <SectorPill name={c.primary_sector} />}
				{c.stage && <Tag>{c.stage}</Tag>}
			</div>
			<div className="co-card-foot">
				<div>
					<div className="co-stat-label">Total raised</div>
					<div className="co-stat-val">{formatRaised(c.total_funding_usd)}</div>
				</div>
				<div>
					<div className="co-stat-label">Last round</div>
					<div className="co-stat-val">{c.last_round ?? '—'}</div>
				</div>
				<div>
					<div className="co-stat-label">Founded</div>
					<div className="co-stat-val">{c.founded_year ?? '—'}</div>
				</div>
			</div>
			<div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
				<CompareToggle id={c.id} kind="companies" />
			</div>
		</Link>
	);
}

function formatRaised(value: number | string | null | undefined): string {
	if (value == null) return '—';
	const n = typeof value === 'string' ? Number(value) : value;
	if (!Number.isFinite(n) || n === 0) return '—';
	if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
	if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
	if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
	return `$${n.toFixed(0)}`;
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
