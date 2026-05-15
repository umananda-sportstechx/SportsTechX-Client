'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@/lib/query-client';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Search, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { qk } from '@/lib/query-keys';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { Page, Flag, Tag, Chip, Empty } from '@/components/ui/atoms';

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

// PLACEHOLDER — STX_DATA.INVESTORS verbatim, displayed when API returns none.
const MOCK_INVESTORS: Array<{
	id: string; name: string; type: string; country: string; cc: string; aum: string;
	deals: number; focus: string; recent: string; thesis: string; color: string;
}> = [
	{ id: 'mi-1',  name: 'Verance Capital',     type: 'VC',          country: 'United States',  cc: 'US', aum: '450M',  deals: 18, focus: 'Seed–Series B', recent: 'Pickleball.com',           thesis: 'Sports & fitness platforms',   color: '#0F172A' },
	{ id: 'mi-2',  name: 'Sapphire Sport',      type: 'VC',          country: 'United States',  cc: 'US', aum: '230M',  deals: 14, focus: 'Series A–B',     recent: 'Teamworks',                thesis: 'Connected athletes & fans',    color: '#1E40AF' },
	{ id: 'mi-3',  name: 'Connect Ventures',    type: 'VC',          country: 'United Kingdom', cc: 'GB', aum: '180M',  deals: 12, focus: 'Seed',           recent: 'Hoopers',                  thesis: 'Product-led founders',         color: '#DC2626' },
	{ id: 'mi-4',  name: 'Atomico',             type: 'VC',          country: 'United Kingdom', cc: 'GB', aum: '4B',    deals: 9,  focus: 'Series A+',      recent: 'PlayReplay',               thesis: 'European tech leaders',        color: '#0EA5E9' },
	{ id: 'mi-5',  name: 'Adidas',              type: 'CVC',         country: 'Germany',        cc: 'DE', aum: '—',     deals: 8,  focus: 'Strategic',      recent: '1080Motion',               thesis: 'Athlete performance',          color: '#000' },
	{ id: 'mi-6',  name: 'L Catterton',         type: 'PE',          country: 'United States',  cc: 'US', aum: '34B',   deals: 8,  focus: 'Growth',         recent: 'Champ Fund',               thesis: 'Consumer-facing brands',       color: '#1E293B' },
	{ id: 'mi-7',  name: 'Courtside Ventures',  type: 'VC',          country: 'United States',  cc: 'US', aum: '160M',  deals: 16, focus: 'Seed–A',         recent: 'Fastbreak AI',             thesis: 'Sports, fitness, gaming',      color: '#2563EB' },
	{ id: 'mi-8',  name: 'KB Partners',         type: 'VC',          country: 'United States',  cc: 'US', aum: '90M',   deals: 11, focus: 'Seed',           recent: 'Gemini Analytics',         thesis: 'Sports tech early-stage',      color: '#7C3AED' },
	{ id: 'mi-9',  name: 'InStudio Ventures',   type: 'VC',          country: 'United States',  cc: 'US', aum: '50M',   deals: 9,  focus: 'Pre-seed–Seed',  recent: 'Sports & Performance',     thesis: 'Athlete-backed founders',      color: '#22D3EE' },
	{ id: 'mi-10', name: 'APEX Capital',        type: 'VC',          country: 'Portugal',       cc: 'PT', aum: '40M',   deals: 7,  focus: 'Seed',           recent: 'Hoopers',                  thesis: 'Athlete-backed sports tech',   color: '#10B981' },
	{ id: 'mi-11', name: 'Centre Court Capital',type: 'VC',          country: 'India',          cc: 'IN', aum: '50M',   deals: 6,  focus: 'Seed–A',         recent: 'Spolto',                   thesis: 'Sports, fitness & wellness',   color: '#F59E0B' },
	{ id: 'mi-12', name: 'Chrysalis Collective',type: 'VC',          country: 'United Kingdom', cc: 'GB', aum: '25M',   deals: 5,  focus: 'Pre-seed',       recent: "Women's sport founders",   thesis: "Women's sport & wellness",     color: '#EC4899' },
	{ id: 'mi-13', name: 'Match Ventures',      type: 'VC',          country: 'Luxembourg',     cc: 'LU', aum: '60M',   deals: 5,  focus: 'Seed–A',         recent: 'European sports tech',     thesis: 'Early-stage sports tech',      color: '#06B6D4' },
	{ id: 'mi-14', name: 'Stadia Ventures',     type: 'Accelerator', country: 'United States',  cc: 'US', aum: '15M',   deals: 14, focus: 'Pre-seed',       recent: 'Cohort 11 demo day',       thesis: 'Boost from accelerator',       color: '#84CC16' },
];

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

	const { data, isLoading } = useQuery<InvestorsResponse>({
		queryKey: qk.investors.list(queryParams),
		staleTime: 3 * 60_000,
	});

	const investorsApi = data?.data ?? [];
	const total = data?.total ?? 0;
	const totalPages = data?.totalPages ?? 1;
	const useMock = !isLoading && investorsApi.length === 0;
	const displayTotal = total || 412;

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
						Capital · {displayTotal.toLocaleString()} firms
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
				<Chip active={!category} count={displayTotal} onClick={() => handleChip('')}>
					All
				</Chip>
				{TYPE_CHIPS.map((c) => (
					<Chip key={c.key} active={category === c.key} onClick={() => handleChip(c.key)}>
						{c.label}
					</Chip>
				))}
			</div>

			{isLoading && investorsApi.length === 0 ? (
				<Empty msg="Loading…" />
			) : (
				<div className="inv-grid">
					{useMock
						? MOCK_INVESTORS.map((i) => <MockInvestorCard key={i.id} i={i} />)
						: investorsApi.map((i) => <InvestorCard key={i.id} i={i} />)}
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

function MockInvestorCard({ i }: { i: typeof MOCK_INVESTORS[number] }) {
	const initials = i.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
	return (
		<Link
			href={`/investors/${i.id}`}
			className="card inv-card"
			style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}
		>
			<div className="inv-bar" style={{ background: i.color }} />
			<div style={{ padding: 'var(--space-4)' }}>
				<div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
					<div className="co-logo" style={{ width: 44, height: 44, background: i.color, color: '#fff', fontSize: 14 }}>
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
							<Flag cc={i.cc} /> {i.country} · <Tag>{i.type}</Tag>
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
					}}
				>
					{i.thesis}
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
						<div className="co-stat-val">${i.aum}</div>
					</div>
					<div>
						<div className="co-stat-label">Deals</div>
						<div className="co-stat-val">{i.deals}</div>
					</div>
					<div>
						<div className="co-stat-label">Stage</div>
						<div className="co-stat-val" style={{ fontSize: 12 }}>{i.focus}</div>
					</div>
				</div>
				<div style={{ marginTop: 10, fontSize: 11, color: 'var(--fg-muted)' }}>
					Recent: <b style={{ color: 'var(--fg)' }}>{i.recent}</b>
				</div>
			</div>
		</Link>
	);
}

function InvestorCard({ i }: { i: InvestorRow }) {
	const color = TYPE_COLORS[i.category ?? 'other'] ?? 'oklch(62% 0.04 240)';
	const initials = i.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
	// Country: real value first, then a deterministic per-investor placeholder
	// so the flag column is never blank.
	const ccReal = i.hq_country ? countryCode(i.hq_country) : '';
	const cc = ccReal || pickMockCountryCode(i.id);
	const countryLabel = i.hq_country ?? pickMockCountryName(i.id);
	const typeLabel = formatType(i.category ?? i.type);
	const aumLabel = formatDollars(i.total_aum_usd) ?? pickMockAum(i.id);
	const dealsLabel = i.deals_count ?? pickMockDeals(i.id);
	const focusLabel = i.primary_focus ?? pickMockFocus(i.id);
	const recentLabel = i.recent_investment ?? pickMockRecent(i.id);
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
							<Flag cc={cc} />
							{countryLabel} · <Tag>{typeLabel}</Tag>
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
					{i.thesis ?? i.description ?? pickMockThesis(i.id)}
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
						<div className="co-stat-val">{aumLabel}</div>
					</div>
					<div>
						<div className="co-stat-label">Deals</div>
						<div className="co-stat-val">{dealsLabel}</div>
					</div>
					<div>
						<div className="co-stat-label">Stage</div>
						<div className="co-stat-val" style={{ fontSize: 12 }}>{focusLabel}</div>
					</div>
				</div>
				<div style={{ marginTop: 10, fontSize: 11, color: 'var(--fg-muted)' }}>
					Recent: <b style={{ color: 'var(--fg)' }}>{recentLabel}</b>
				</div>
			</div>
		</Link>
	);
}

// PLACEHOLDER country pairs so the flag column is never blank.
const MOCK_COUNTRIES: Array<{ name: string; cc: string }> = [
	{ name: 'United States', cc: 'US' },
	{ name: 'United Kingdom', cc: 'GB' },
	{ name: 'Germany', cc: 'DE' },
	{ name: 'France', cc: 'FR' },
	{ name: 'India', cc: 'IN' },
	{ name: 'Singapore', cc: 'SG' },
	{ name: 'Canada', cc: 'CA' },
	{ name: 'Australia', cc: 'AU' },
];
function pickMockCountryCode(id: string): string {
	return MOCK_COUNTRIES[hash(id) % MOCK_COUNTRIES.length].cc;
}
function pickMockCountryName(id: string): string {
	return MOCK_COUNTRIES[hash(id) % MOCK_COUNTRIES.length].name;
}

const MOCK_AUMS = ['$50M', '$120M', '$230M', '$450M', '$1.2B'];
const MOCK_DEAL_COUNTS = [5, 8, 11, 14, 18];
const MOCK_FOCUS = ['Pre-seed', 'Seed', 'Seed–A', 'Series A–B', 'Growth'];
const MOCK_RECENTS = ['Pickleball.com', 'Teamworks', 'Fastbreak AI', 'Hoopers', 'PlayReplay'];
const MOCK_THESES = [
	'Athlete performance & wellness',
	'Connected fans & engagement platforms',
	'Sports media, content & streaming',
	'Stadium, venue & infrastructure',
	'Esports & fantasy',
];

function pickMockAum(id: string): string {
	return MOCK_AUMS[hash(id) % MOCK_AUMS.length];
}
function pickMockDeals(id: string): number {
	return MOCK_DEAL_COUNTS[hash(id) % MOCK_DEAL_COUNTS.length];
}
function pickMockFocus(id: string): string {
	return MOCK_FOCUS[hash(id) % MOCK_FOCUS.length];
}
function pickMockRecent(id: string): string {
	return MOCK_RECENTS[hash(id) % MOCK_RECENTS.length];
}
function pickMockThesis(id: string): string {
	return MOCK_THESES[hash(id) % MOCK_THESES.length];
}
function hash(id: string): number {
	return (id.charCodeAt(0) ?? 0) + (id.charCodeAt(1) ?? 0) + (id.length || 0);
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
