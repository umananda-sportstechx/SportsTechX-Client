'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import useSWR from 'swr';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { qk } from '@/lib/query-keys';
import { Page, Flag, Tag, Empty } from '@/components/ui/atoms';
import { SortHeader, applySort, parseMoney, type SortState } from '@/components/ui/sort-header';

interface Investor {
	id: string;
	name: string;
	slug?: string;
	description?: string | null;
	thesis?: string | null;
	website?: string | null;
	logo_url?: string | null;
	category?: string | null;
	hq_country?: string | null;
	hq_city?: string | null;
	total_aum_usd?: number | string | null;
	num_investments?: number | null;
	primary_focus?: string | null;
	year_launched?: number | null;
	recent_investment?: string | null;
}

interface Deal {
	id: string;
	company_name?: string | null;
	company_slug?: string | null;
	announced_date?: string | null;
	amount_usd?: number | string | null;
	round_type_name?: string | null;
}

interface DealsResponse { data: Deal[]; total: number }

const TYPE_COLORS: Record<string, string> = {
	venture_capital: 'oklch(62% 0.18 240)',
	financial_services: 'oklch(62% 0.16 160)',
	private_equity: 'oklch(62% 0.18 30)',
	family_investment_office: 'oklch(62% 0.20 290)',
	sovereign_wealth_fund: 'oklch(62% 0.18 60)',
	angel: 'oklch(62% 0.18 350)',
	other: 'oklch(62% 0.04 240)',
};

export default function InvestorDetailPage() {
	const params = useParams<{ slug: string }>();
	const slug = params?.slug ?? '';
	const [sort, setSort] = useState<SortState | null>({ key: 'announced_date', dir: 'desc' });

	const { data: investor, isLoading, error } = useSWR<Investor>(
		slug ? qk.investors.detail(slug) : null,
		{ dedupingInterval: 5 * 60_000 },
	);

	const { data: dealsResp } = useSWR<DealsResponse>(
		investor?.id ? qk.deals.list({ investor_id: investor.id, limit: 30, sort: '-announced_date' }) : null,
		{ dedupingInterval: 5 * 60_000 },
	);
	const deals = dealsResp?.data ?? [];

	if (isLoading) return <Page><Empty msg="Loading investor…" /></Page>;
	if (error || !investor?.id) {
		return (
			<Page>
				<Link href="/investors" className="co-back">
					<ArrowLeft size={12} /> Back to investors
				</Link>
				<Empty msg="Investor not found" />
			</Page>
		);
	}

	const cc = investor.hq_country ? countryCode(investor.hq_country) : '';
	const color = TYPE_COLORS[investor.category ?? 'other'] ?? TYPE_COLORS.other;
	const initials = investor.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
	const typeLabel = formatCategory(investor.category);

	const sortedDeals = applySort(deals, sort, {
		announced_date: (d) => (d.announced_date ? Date.parse(d.announced_date) : null),
		company_name: (d) => d.company_name ?? '',
		amount_usd: (d) => parseMoney(d.amount_usd),
		round_type_name: (d) => d.round_type_name ?? '',
	});

	return (
		<Page>
			<Link href="/investors" className="co-back">
				<ArrowLeft size={12} /> Back to investors
			</Link>

			{/* Hero with color bar accent */}
			<div className="card inv-card" style={{ padding: 0, marginBottom: 'var(--space-5)' }}>
				<div className="inv-bar" style={{ background: color, height: 4 }} />
				<div style={{ padding: 'var(--space-5)', display: 'flex', alignItems: 'flex-start', gap: 'var(--space-4)' }}>
					{investor.logo_url ? (
						/* eslint-disable-next-line @next/next/no-img-element */
						<img src={investor.logo_url} alt="" style={{ width: 72, height: 72, objectFit: 'contain', background: 'var(--bg-2)' }} />
					) : (
						<div
							className="co-logo"
							style={{ width: 72, height: 72, background: color, color: '#fff', fontSize: 22, fontWeight: 800 }}
						>
							{initials}
						</div>
					)}
					<div style={{ flex: 1, minWidth: 0 }}>
						<div className="co-hero-meta" style={{ marginBottom: 6 }}>
							{cc && <Flag cc={cc} />}
							<span>{[investor.hq_city, investor.hq_country].filter(Boolean).join(', ') || '—'}</span>
						</div>
						<h1 style={{ fontFamily: 'var(--font-display)', fontSize: 38, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1, margin: '0 0 12px' }}>
							{investor.name}
						</h1>
						<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
							{typeLabel && (
								<Tag>
									<span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: color, marginRight: 6, verticalAlign: 'middle' }} />
									{typeLabel}
								</Tag>
							)}
							{investor.primary_focus && <Tag>{investor.primary_focus}</Tag>}
						</div>
						{investor.website && (
							<div style={{ marginTop: 14 }}>
								<a href={investor.website} target="_blank" rel="noopener noreferrer" className="btn ghost">
									Website <ExternalLink size={12} />
								</a>
							</div>
						)}
					</div>
				</div>
			</div>

			{/* Thesis callout */}
			{(investor.thesis || investor.description) && (
				<div className="co-page-grid" style={{ marginBottom: 'var(--space-5)' }}>
					<div className="card" style={{ padding: 'var(--space-5)' }}>
						<div className="co-stat-label" style={{ marginBottom: 8 }}>Investment thesis</div>
						<p style={{ margin: 0, color: 'var(--fg-2)', lineHeight: 1.6, fontSize: 15 }}>
							{investor.thesis ?? investor.description}
						</p>
					</div>
					<aside className="co-page-rail">
						<div className="card co-rail-card">
							<div className="co-rail-h">Key facts</div>
							<div className="co-kv"><span className="co-kv-k">AUM</span><span className="co-kv-v"><b>{formatDollars(investor.total_aum_usd) ?? '—'}</b></span></div>
							<div className="co-kv"><span className="co-kv-k">Investments</span><span className="co-kv-v">{investor.num_investments ?? '—'}</span></div>
							<div className="co-kv"><span className="co-kv-k">Launched</span><span className="co-kv-v">{investor.year_launched ?? '—'}</span></div>
							{investor.recent_investment && (
								<div className="co-kv"><span className="co-kv-k">Recent</span><span className="co-kv-v">{investor.recent_investment}</span></div>
							)}
						</div>
					</aside>
				</div>
			)}

			{/* Portfolio deals */}
			<section className="co-sec">
				<h3 className="co-sec-h">
					Portfolio deals
					{dealsResp?.total ? (
						<span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-muted)', fontWeight: 400, marginLeft: 12 }}>
							{dealsResp.total} total
						</span>
					) : null}
				</h3>
				{deals.length === 0 ? (
					<div className="co-empty">No tracked portfolio deals yet.</div>
				) : (
					<div className="card" style={{ padding: 0 }}>
						<table className="data-table">
							<thead>
								<tr>
									<SortHeader label="Date" sortKey="announced_date" sort={sort} setSort={setSort} defaultDir="desc" />
									<SortHeader label="Company" sortKey="company_name" sort={sort} setSort={setSort} />
									<SortHeader label="Round" sortKey="round_type_name" sort={sort} setSort={setSort} />
									<SortHeader label="Amount" sortKey="amount_usd" sort={sort} setSort={setSort} align="right" defaultDir="desc" />
								</tr>
							</thead>
							<tbody>
								{sortedDeals.map((d) => (
									<tr key={d.id}>
										<td className="num">{formatShortDate(d.announced_date)}</td>
										<td>
											<Link href={`/companies/${d.company_slug ?? d.id}`} style={{ fontWeight: 600 }}>
												{d.company_name ?? '—'}
											</Link>
										</td>
										<td>{d.round_type_name ? <Tag>{d.round_type_name}</Tag> : '—'}</td>
										<td className="num" style={{ textAlign: 'right', fontWeight: 700 }}>{formatDollars(d.amount_usd) ?? '—'}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</section>
		</Page>
	);
}

function formatCategory(c: string | null | undefined): string {
	if (!c) return '';
	switch (c) {
		case 'venture_capital': return 'VC';
		case 'private_equity': return 'PE';
		case 'financial_services': return 'CVC';
		case 'family_investment_office': return 'Family Office';
		case 'sovereign_wealth_fund': return 'SWF';
		case 'angel': return 'Angel';
		default: return c.replace(/_/g, ' ');
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

function formatShortDate(iso: string | null | undefined): string {
	if (!iso) return '—';
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return '—';
	return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
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
