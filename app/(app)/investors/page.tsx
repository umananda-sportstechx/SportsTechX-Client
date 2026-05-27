'use client';

import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { qk } from '@/lib/query-keys';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { Page, Flag, Tag, Empty, PageTitle } from '@/components/ui/atoms';
import {
	FilterRail, ActiveFiltersBar,
	emptyFilterState, type Facet, type FilterState,
} from '@/components/ui/filter-rail';
import { InvestorDrawer } from '@/components/ui/investor-drawer';
import { CompareBar } from '@/components/compare-bar';
import { CompareToggle } from '@/components/compare-toggle';

interface InvestorRow {
	id: string;
	name: string;
	slug?: string;
	description?: string | null;
	thesis?: string | null;
	category?: string | null;
	type?: string | null;
	hq_country?: string | null;
	hq_city?: string | null;
	total_aum_usd?: number | string | null;
	deals_count?: number | null;
	primary_focus?: string | null;
	recent_investment?: string | null;
	year_launched?: number | null;
}

interface InvestorsResponse {
	data: InvestorRow[];
	total: number;
	page: number;
	totalPages: number;
}

const CATEGORY_OPTIONS = [
	{ value: 'venture_capital', label: 'VC' },
	{ value: 'financial_services', label: 'CVC' },
	{ value: 'private_equity', label: 'PE' },
	{ value: 'family_investment_office', label: 'Family Office' },
	{ value: 'sovereign_wealth_fund', label: 'SWF' },
	{ value: 'angel', label: 'Angel' },
];

const TYPE_COLORS: Record<string, string> = {
	venture_capital: 'oklch(62% 0.18 240)',
	financial_services: 'oklch(62% 0.16 160)',
	private_equity: 'oklch(62% 0.18 30)',
	family_investment_office: 'oklch(62% 0.20 290)',
	sovereign_wealth_fund: 'oklch(62% 0.18 60)',
	angel: 'oklch(62% 0.18 350)',
	other: 'oklch(62% 0.04 240)',
};

export default function InvestorsPage() {
	const router = useRouter();
	const pathname = usePathname();
	const params = useSearchParams();

	const [page, setPage] = useState(Number(params.get('page') ?? '1'));
	const [drawerTarget, setDrawerTarget] = useState<string | null>(null);

	const facets = useMemo<Facet[]>(() => [
		{ key: 'is_verified', label: 'Verified', kind: 'bool' },
		{ key: 'actively_investing', label: 'Actively investing', kind: 'bool' },
		{
			key: 'category',
			label: 'Firm type',
			kind: 'multi',
			options: () => CATEGORY_OPTIONS,
		},
	], []);

	const [filterState, setFilterState] = useState<FilterState>(() => {
		const init = emptyFilterState(facets, { search: params.get('q') ?? '' });
		const v = params.get('is_verified'); if (v) init.is_verified = v === 'true';
		const a = params.get('actively_investing'); if (a) init.actively_investing = a === 'true';
		const c = params.get('category');
		if (c) init.category = c.split(',').filter(Boolean);
		return init;
	});

	useEffect(() => {
		const sp = new URLSearchParams();
		if (filterState.search) sp.set('q', filterState.search);
		if (filterState.is_verified === true) sp.set('is_verified', 'true');
		if (filterState.actively_investing === true) sp.set('actively_investing', 'true');
		const cat = filterState.category as string[] | undefined;
		if (cat?.length) sp.set('category', cat.join(','));
		if (page > 1) sp.set('page', String(page));
		const qs = sp.toString();
		router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [filterState, page]);

	const debouncedSearch = useDebouncedValue(filterState.search ?? '', 300);

	const queryParams: Record<string, unknown> = { page, limit: 24 };
	if (debouncedSearch) queryParams.search = debouncedSearch;
	const cat = filterState.category as string[] | undefined;
	if (cat?.length === 1) queryParams.category = cat[0];
	if (filterState.is_verified === true) queryParams.is_verified = true;
	if (filterState.actively_investing === true) queryParams.actively_investing = true;

	const { data, isLoading } = useSWR<InvestorsResponse>(qk.investors.list(queryParams), {
		dedupingInterval: 3 * 60_000,
	});

	const investors = data?.data ?? [];
	const total = data?.total ?? 0;
	const totalPages = data?.totalPages ?? 1;

	return (
		<Page>
			<PageTitle
				kicker={`Capital · ${total.toLocaleString()} firms`}
				title="Investors"
				sub="The capital markets behind sports tech — VCs, corporate venture, PE and accelerators."
				action={<button className="btn"><Plus size={12} /> Add to watchlist</button>}
			/>

			<div className="flt-layout">
				<FilterRail
					facets={facets}
					state={filterState}
					setState={(s) => { setFilterState(s); setPage(1); }}
					defaultOpen={{ category: true }}
				/>

				<div className="flt-main">
					<ActiveFiltersBar
						facets={facets}
						state={filterState}
						setState={setFilterState}
						placeholder="Search firms, thesis, portfolio…"
						total={total}
						shown={investors.length}
					/>

					{isLoading && investors.length === 0 ? (
						<Empty msg="Loading…" />
					) : investors.length === 0 ? (
						<div className="card flt-empty-state">
							<h3>No investors match</h3>
							<p>Try clearing some filters.</p>
						</div>
					) : (
						<div className="inv-grid">
							{investors.map((i) => (
								<InvestorCard key={i.id} i={i} onOpenDrawer={setDrawerTarget} />
							))}
						</div>
					)}

					<InvestorDrawer
						idOrSlug={drawerTarget}
						onClose={() => setDrawerTarget(null)}
					/>

					<CompareBar kind="investors" />

					{totalPages > 1 && (
						<div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8, marginTop: 24 }}>
							<span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-muted)', marginRight: 8 }}>
								Page {page} of {totalPages}
							</span>
							<button className="btn ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>
								<ChevronLeft size={14} />
							</button>
							<button className="btn ghost" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
								<ChevronRight size={14} />
							</button>
						</div>
					)}
				</div>
			</div>
		</Page>
	);
}

function InvestorCard({ i, onOpenDrawer }: { i: InvestorRow; onOpenDrawer: (idOrSlug: string) => void }) {
	const color = TYPE_COLORS[i.category ?? 'other'] ?? 'oklch(62% 0.04 240)';
	const initials = i.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
	const cc = i.hq_country ? countryCode(i.hq_country) : '';
	const typeLabel = formatType(i.category ?? i.type);
	const target = i.slug ?? i.id;
	const open = () => onOpenDrawer(target);
	const handleClick = (e: React.MouseEvent) => {
		if ((e.target as HTMLElement).closest('button, a')) return;
		if (e.metaKey || e.ctrlKey || e.button === 1) {
			window.open(`/investors/${target}`, '_blank');
			return;
		}
		open();
	};
	return (
		// `<div role="button">` — CompareToggle button inside forbids nesting.
		<div
			role="button"
			tabIndex={0}
			className="card inv-card"
			style={{ display: 'block', width: '100%', textAlign: 'left', cursor: 'pointer' }}
			onClick={handleClick}
			onKeyDown={(e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					if ((e.target as HTMLElement).closest('button, a')) return;
					e.preventDefault();
					open();
				}
			}}
		>
			<div className="inv-bar" style={{ background: color }} />
			<div style={{ padding: 'var(--space-4)' }}>
				<div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
					<div className="co-logo" style={{ width: 44, height: 44, background: color, color: '#fff', fontSize: 14 }}>
						{initials}
					</div>
					<div style={{ flex: 1, minWidth: 0 }}>
						<div style={{ fontWeight: 700, fontSize: 15 }}>{i.name}</div>
						<div
							style={{
								fontSize: 11,
								color: 'var(--fg-muted)',
								display: 'flex',
								alignItems: 'center',
								gap: 4,
								flexWrap: 'wrap',
							}}
						>
							{cc && <Flag cc={cc} />}
							{i.hq_country ?? '—'}{typeLabel !== '—' && <> · <Tag>{typeLabel}</Tag></>}
						</div>
					</div>
				</div>
				<p
					style={{
						fontSize: 13,
						color: 'var(--fg-2)',
						minHeight: 36,
						marginBottom: 12,
						lineHeight: 1.4,
						display: '-webkit-box',
						WebkitLineClamp: 2,
						WebkitBoxOrient: 'vertical',
						overflow: 'hidden',
					}}
				>
					{i.thesis ?? i.description ?? '—'}
				</p>
				<div
					style={{
						display: 'grid',
						gridTemplateColumns: '1fr 1fr 1fr',
						gap: 8,
						paddingTop: 12,
						borderTop: '1px solid var(--border)',
					}}
				>
					<div>
						<div className="co-stat-label">AUM</div>
						<div className="co-stat-val">{formatDollars(i.total_aum_usd) ?? '—'}</div>
					</div>
					<div>
						<div className="co-stat-label">Deals</div>
						<div className="co-stat-val">{i.deals_count ?? '—'}</div>
					</div>
					<div>
						<div className="co-stat-label">Stage</div>
						<div className="co-stat-val" style={{ fontSize: 12 }}>{i.primary_focus ?? '—'}</div>
					</div>
				</div>
				{i.recent_investment && (
					<div style={{ marginTop: 10, fontSize: 11, color: 'var(--fg-muted)' }}>
						Recent: <b style={{ color: 'var(--fg)' }}>{i.recent_investment}</b>
					</div>
				)}
				<div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
					<CompareToggle id={i.id} kind="investors" />
				</div>
			</div>
		</div>
	);
}

function formatType(t: string | null | undefined): string {
	if (!t) return '—';
	switch (t) {
		case 'venture_capital': return 'VC';
		case 'private_equity': return 'PE';
		case 'financial_services': return 'CVC';
		case 'family_investment_office': return 'Family Office';
		case 'sovereign_wealth_fund': return 'SWF';
		case 'angel': return 'Angel';
		default: return t.replace(/_/g, ' ');
	}
}

function formatDollars(value: number | string | null | undefined): string | null {
	if (value == null) return null;
	const n = typeof value === 'string' ? Number(value) : value;
	if (!Number.isFinite(n) || n <= 0) return null;
	if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
	if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(0)}M`;
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
