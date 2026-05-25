'use client';

import { useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Search, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { qk } from '@/lib/query-keys';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { Page, Flag, Tag, Chip, Empty } from '@/components/ui/atoms';
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

const TYPE_CHIPS: Array<{ label: string; key: string }> = [
	{ label: 'VC', key: 'venture_capital' },
	{ label: 'CVC', key: 'financial_services' },
	{ label: 'PE', key: 'private_equity' },
	{ label: 'Family Office', key: 'family_investment_office' },
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

	const [search, setSearch] = useState(params.get('q') ?? '');
	const [category, setCategory] = useState(params.get('category') ?? '');
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
	if (category) queryParams.category = category;

	const { data, isLoading } = useSWR<InvestorsResponse>(qk.investors.list(queryParams), {
		dedupingInterval: 3 * 60_000,
	});

	const investors = data?.data ?? [];
	const total = data?.total ?? 0;
	const totalPages = data?.totalPages ?? 1;

	const handleChip = (key: string) => {
		const next = category === key ? '' : key;
		setCategory(next);
		setPage(1);
		updateUrl({ category: next || null, page: null });
	};

	return (
		<Page>
			<div
				style={{
					display: 'flex',
					alignItems: 'flex-end',
					justifyContent: 'space-between',
					marginBottom: 'var(--space-5)',
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
						Capital · {total.toLocaleString()} firms
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
						Investors
					</h1>
					<p style={{ fontSize: 14, color: 'var(--fg-2)', maxWidth: 640, margin: 0 }}>
						The capital markets behind sports tech — VCs, corporate venture, PE and family offices.
					</p>
				</div>
				<button className="btn"><Plus size={12} /> Add to watchlist</button>
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
				<Chip active={!category} count={total} onClick={() => handleChip('')}>
					All
				</Chip>
				{TYPE_CHIPS.map((c) => (
					<Chip key={c.key} active={category === c.key} onClick={() => handleChip(c.key)}>
						{c.label}
					</Chip>
				))}
			</div>

			{isLoading && investors.length === 0 ? (
				<Empty msg="Loading…" />
			) : investors.length === 0 ? (
				<Empty msg="No investors match those filters." />
			) : (
				<div className="inv-grid">
					{investors.map((i) => <InvestorCard key={i.id} i={i} />)}
				</div>
			)}

			<CompareBar kind="investors" />

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

function InvestorCard({ i }: { i: InvestorRow }) {
	const color = TYPE_COLORS[i.category ?? 'other'] ?? 'oklch(62% 0.04 240)';
	const initials = i.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
	const cc = i.hq_country ? countryCode(i.hq_country) : '';
	const typeLabel = formatType(i.category ?? i.type);
	return (
		<Link
			href={`/investors/${i.slug ?? i.id}`}
			className="card inv-card"
			style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}
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
		</Link>
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
