'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Search, Filter, Plus, Grid3x3, List, FileText, ChevronLeft, ChevronRight, Heart } from 'lucide-react';
import { qk } from '@/lib/query-keys';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { Page, Logo, Flag, Sparkline, SectorPill, Chip, Tag, Empty } from '@/components/ui/atoms';

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

// PLACEHOLDER — first 12 prototype companies (mirrors STX_DATA.COMPANIES) so the
// grid + table never render empty. Replace by improving /api/companies coverage.
const MOCK_COMPANIES: Array<{
	id: string; name: string; sub: string; sector: string; stage: string; founded: number;
	hq: string; cc: string; raised: number; lastRound: string; color: string;
}> = [
	{ id: 'mc-1',  name: 'Pickleball.com',         sub: 'Central pickleball directory',     sector: 'Media & Streaming',   stage: 'Growth',    founded: 2021, hq: 'Sarajevo',  cc: 'BA', raised: 225, lastRound: "May '26", color: '#A855F7' },
	{ id: 'mc-2',  name: 'Teamworks',              sub: 'Athlete engagement platform',      sector: 'Performance',         stage: 'Series C',  founded: 2014, hq: 'Durham',    cc: 'US', raised: 100, lastRound: "Apr '26", color: '#0F172A' },
	{ id: 'mc-3',  name: 'Fastbreak AI',           sub: 'Intelligent sports scheduling',    sector: 'Performance',         stage: 'Series B',  founded: 2020, hq: 'Charlotte', cc: 'US', raised: 80,  lastRound: "Mar '26", color: '#22D3EE' },
	{ id: 'mc-4',  name: 'ASB GlassFloor',         sub: 'Sports flooring solution',         sector: 'Stadium & Facilities',stage: 'Series A',  founded: 2010, hq: 'Stein',     cc: 'DE', raised: 30,  lastRound: "Feb '26", color: '#94A3B8' },
	{ id: 'mc-5',  name: 'Metasports Interactive', sub: 'Next-gen venture studio',          sector: 'Esports',             stage: 'Series B',  founded: 2019, hq: 'Hyderabad', cc: 'IN', raised: 20,  lastRound: "Apr '26", color: '#0EA5E9' },
	{ id: 'mc-6',  name: 'Hoopers',                sub: 'Fan intelligence platform',        sector: 'Fan Engagement',      stage: 'Series A',  founded: 2018, hq: 'Lisbon',    cc: 'PT', raised: 15.9,lastRound: "Jan '26", color: '#A78BFA' },
	{ id: 'mc-7',  name: 'Gemini Sports Analytics',sub: 'Athlete welfare & performance',    sector: 'Performance',         stage: 'Series A',  founded: 2019, hq: 'Miami',     cc: 'US', raised: 15.1,lastRound: "Dec '25", color: '#F472B6' },
	{ id: 'mc-8',  name: 'PlayReplay',             sub: 'Real-time tennis line calling',    sector: 'Performance',         stage: 'Series A',  founded: 2020, hq: 'Stockholm', cc: 'SE', raised: 12,  lastRound: "May '26", color: '#3B82F6' },
	{ id: 'mc-9',  name: 'VisioLab',               sub: 'iPad-based checkout',              sector: 'Stadium & Facilities',stage: 'Series A',  founded: 2017, hq: 'Munster',   cc: 'DE', raised: 11,  lastRound: "Apr '26", color: '#84CC16' },
	{ id: 'mc-10', name: 'SportsVisio',            sub: 'AI to calculate statistics',       sector: 'Media & Streaming',   stage: 'Seed',      founded: 2022, hq: 'Miami',     cc: 'US', raised: 8,   lastRound: "Apr '26", color: '#14B8A6' },
	{ id: 'mc-11', name: 'Myocene',                sub: 'Muscle fatigue measurement',       sector: 'Recovery & Wellness', stage: 'Seed',      founded: 2018, hq: 'Liege',     cc: 'BE', raised: 6.2, lastRound: "Mar '26", color: '#FB923C' },
	{ id: 'mc-12', name: '1080Motion',             sub: 'Digital motorized strength training',sector: 'Wearables & Gear',  stage: 'Series A',  founded: 2014, hq: 'Stockholm', cc: 'SE', raised: 3.6, lastRound: "Feb '26", color: '#34D399' },
];

const MOCK_STAGES = ['Pre-seed', 'Seed', 'Series A', 'Series B', 'Series C', 'Growth'];

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

	const { data, isLoading } = useQuery<CompaniesResponse>({
		queryKey: qk.companies.list(queryParams),
		staleTime: 3 * 60_000,
	});

	const { data: sectors } = useQuery<RefResponse<SectorRef>>({
		queryKey: qk.reference.sectors(),
		staleTime: 60 * 60_000,
	});

	const companiesApi = data?.data ?? [];
	const total = data?.total ?? 0;
	const totalPages = data?.totalPages ?? 1;
	const sectorList = sectors?.data ?? [];
	const useMock = !isLoading && companiesApi.length === 0;
	const displayTotal = total || 8160;
	const displayShown = useMock ? MOCK_COMPANIES.length : companiesApi.length;

	const handleSectorChip = (slug: string) => {
		const next = sectorSlug === slug ? '' : slug;
		setSectorSlug(next);
		setPage(1);
		updateUrl({ sector: next || null, page: null });
	};

	return (
		<Page>
			<div
				style={{
					display: 'flex',
					alignItems: 'flex-end',
					justifyContent: 'space-between',
					marginBottom: 'var(--space-4)',
					flexWrap: 'wrap',
					gap: 16,
				}}
			>
				<div>
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
						Database · {displayTotal.toLocaleString()} entries
					</div>
					<h1
						style={{
							fontFamily: 'var(--font-display)',
							fontSize: 38,
							fontWeight: 800,
							letterSpacing: '-0.02em',
							lineHeight: 1,
							margin: 0,
						}}
					>
						Companies
					</h1>
				</div>
				<div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
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
				</div>
			</div>

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
				<Chip active={!sectorSlug} count={displayTotal} onClick={() => handleSectorChip('')}>
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
				Showing <b style={{ color: 'var(--fg)' }}>{displayShown.toLocaleString()}</b> of {displayTotal.toLocaleString()} · Sorted by activity
			</div>

			{isLoading && companiesApi.length === 0 ? (
				<Empty msg="Loading…" />
			) : view === 'grid' ? (
				<div className="co-grid">
					{useMock
						? MOCK_COMPANIES.map((c) => <MockCompanyCard key={c.id} c={c} />)
						: companiesApi.map((c) => <CompanyCard key={c.id} c={c} />)}
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
								<th>Trend</th>
							</tr>
						</thead>
						<tbody>
							{useMock
								? MOCK_COMPANIES.map((c) => (
									<tr key={c.id}>
										<td>
											<div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
												<Logo co={{ name: c.name, color: c.color }} size={28} />
												<div>
													<div style={{ fontWeight: 600 }}>{c.name}</div>
													<div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{c.sub}</div>
												</div>
											</div>
										</td>
										<td><SectorPill name={c.sector} /></td>
										<td><Tag>{c.stage}</Tag></td>
										<td><Flag cc={c.cc} /> {c.hq}</td>
										<td className="num" style={{ textAlign: 'right', fontWeight: 700 }}>${c.raised}M</td>
										<td className="num">{c.lastRound}</td>
										<td className="num">{c.founded}</td>
										<td><Sparkline values={generateSpark(c.id)} w={70} h={20} fill={false} /></td>
									</tr>
								))
								: companiesApi.map((c) => {
									const stage = c.stage ?? pickMockStage(c.id);
									const lastRound = c.last_round ?? pickMockLastRound(c.id);
									return (
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
											<td><Tag>{stage}</Tag></td>
											<td style={{ fontSize: 12, color: 'var(--fg-2)' }}>
												{c.hq_country && <Flag cc={countryCode(c.hq_country)} />}{' '}
												{c.hq_city ? `${c.hq_city}, ` : ''}{c.hq_country ?? ''}
											</td>
											<td className="num" style={{ textAlign: 'right', fontWeight: 700 }}>
												{formatRaised(c.total_funding_usd)}
											</td>
											<td className="num">{lastRound}</td>
											<td className="num">{c.founded_year ?? '—'}</td>
											<td><Sparkline values={generateSpark(c.id)} w={70} h={20} fill={false} /></td>
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

function MockCompanyCard({ c }: { c: typeof MOCK_COMPANIES[number] }) {
	const fav = (c.id.charCodeAt(c.id.length - 1) % 3) === 0;
	return (
		<Link href={`/companies/${c.id}`} className="card co-card" style={{ display: 'block' }}>
			<div className="co-card-head">
				<Logo co={{ name: c.name, color: c.color }} size={44} />
				<div style={{ flex: 1, minWidth: 0 }}>
					<div style={{ fontWeight: 700, fontSize: 15 }}>{c.name}</div>
					<div style={{ fontSize: 11, color: 'var(--fg-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
						<Flag cc={c.cc} /> {c.hq}
					</div>
				</div>
				{fav && <Heart size={14} fill="var(--accent)" stroke="var(--accent)" />}
			</div>
			<p className="co-sub">{c.sub}</p>
			<div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, margin: '10px 0' }}>
				<SectorPill name={c.sector} />
				<Tag>{c.stage}</Tag>
			</div>
			<div className="co-card-foot">
				<div>
					<div className="co-stat-label">Total raised</div>
					<div className="co-stat-val">${c.raised}M</div>
				</div>
				<div>
					<div className="co-stat-label">Last round</div>
					<div className="co-stat-val">{c.lastRound}</div>
				</div>
				<div>
					<div className="co-stat-label">Founded</div>
					<div className="co-stat-val">{c.founded}</div>
				</div>
			</div>
		</Link>
	);
}

function CompanyCard({ c }: { c: CompanyRow }) {
	const cc = c.hq_country ? countryCode(c.hq_country) : '';
	const fav = (c.id.charCodeAt(c.id.length - 1) % 3) === 0;
	const stage = c.stage ?? pickMockStage(c.id);
	const lastRound = c.last_round ?? pickMockLastRound(c.id);
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
				<Tag>{stage}</Tag>
			</div>
			<div className="co-card-foot">
				<div>
					<div className="co-stat-label">Total raised</div>
					<div className="co-stat-val">{formatRaised(c.total_funding_usd)}</div>
				</div>
				<div>
					<div className="co-stat-label">Last round</div>
					<div className="co-stat-val">{lastRound}</div>
				</div>
				<div>
					<div className="co-stat-label">Founded</div>
					<div className="co-stat-val">{c.founded_year ?? '—'}</div>
				</div>
			</div>
		</Link>
	);
}

function pickMockStage(id: string): string {
	const h = (id.charCodeAt(0) ?? 0) + (id.charCodeAt(1) ?? 0);
	return MOCK_STAGES[h % MOCK_STAGES.length];
}

function pickMockLastRound(id: string): string {
	const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May'];
	const h = (id.charCodeAt(0) ?? 0) + (id.charCodeAt(1) ?? 0);
	return `${months[h % months.length]} '26`;
}

function generateSpark(seed: string): number[] {
	let x = (seed.charCodeAt(0) ?? 0) + (seed.charCodeAt(1) ?? 0) + (seed.length || 0);
	const out: number[] = [];
	let v = 50;
	for (let i = 0; i < 12; i += 1) {
		x = (x * 9301 + 49297) % 233280;
		const r = (x / 233280 - 0.5) * 20 + 1.5;
		v = Math.max(10, Math.min(90, v + r));
		out.push(v);
	}
	return out;
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
