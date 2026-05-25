'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import useSWR from 'swr';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { qk } from '@/lib/query-keys';
import { Page, Flag, Tag, SectionHead, Empty } from '@/components/ui/atoms';

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

export default function InvestorDetailPage() {
	const params = useParams<{ slug: string }>();
	const slug = params?.slug ?? '';

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
				<div style={{ marginBottom: 'var(--space-4)' }}>
					<Link href="/investors" className="btn ghost"><ArrowLeft size={12} /> Back to investors</Link>
				</div>
				<Empty msg="Investor not found" />
			</Page>
		);
	}

	const cc = investor.hq_country ? countryCode(investor.hq_country) : '';

	return (
		<Page>
			<div style={{ marginBottom: 'var(--space-4)' }}>
				<Link href="/investors" className="btn ghost"><ArrowLeft size={12} /> Back to investors</Link>
			</div>

			<div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
				{investor.logo_url ? (
					/* eslint-disable-next-line @next/next/no-img-element */
					<img src={investor.logo_url} alt="" style={{ width: 72, height: 72, objectFit: 'contain', background: 'var(--bg-2)' }} />
				) : (
					<div style={{ width: 72, height: 72, background: 'var(--bg-3)', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 22 }}>
						{investor.name.charAt(0)}
					</div>
				)}
				<div style={{ flex: 1, minWidth: 0 }}>
					<div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
						{cc && <Flag cc={cc} />}
						{investor.hq_city ? `${investor.hq_city}, ` : ''}{investor.hq_country ?? '—'}
					</div>
					<h1 style={{ fontFamily: 'var(--font-display)', fontSize: 38, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1, margin: '0 0 8px' }}>
						{investor.name}
					</h1>
					{(investor.category || investor.primary_focus) && (
						<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
							{investor.category && <Tag>{formatCategory(investor.category)}</Tag>}
							{investor.primary_focus && <Tag>{investor.primary_focus}</Tag>}
						</div>
					)}
					{investor.website && (
						<div style={{ marginTop: 12 }}>
							<a href={investor.website} target="_blank" rel="noopener noreferrer" className="btn ghost">
								Website <ExternalLink size={12} />
							</a>
						</div>
					)}
				</div>
			</div>

			{(investor.thesis || investor.description) && (
				<div className="card" style={{ padding: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
					<p style={{ margin: 0, color: 'var(--fg-2)', lineHeight: 1.6 }}>
						{investor.thesis ?? investor.description}
					</p>
				</div>
			)}

			<div className="grid-3" style={{ marginBottom: 'var(--space-5)' }}>
				<StatCard label="AUM" value={formatDollars(investor.total_aum_usd) ?? '—'} />
				<StatCard label="Investments" value={(investor.num_investments ?? '—').toString()} />
				<StatCard label="Launched" value={(investor.year_launched ?? '—').toString()} />
			</div>

			<div className="card">
				<SectionHead title="Portfolio deals" meta={dealsResp?.total ? `${dealsResp.total} total` : ''} />
				{deals.length === 0 ? (
					<Empty msg="No tracked portfolio deals yet." />
				) : (
					<table className="data-table">
						<thead><tr><th>Date</th><th>Company</th><th>Round</th><th style={{ textAlign: 'right' }}>Amount</th></tr></thead>
						<tbody>
							{deals.map((d) => (
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
				)}
			</div>
		</Page>
	);
}

function StatCard({ label, value }: { label: string; value: string }) {
	return (
		<div className="card" style={{ padding: 'var(--space-4)' }}>
			<div className="co-stat-label">{label}</div>
			<div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, marginTop: 4 }}>{value}</div>
		</div>
	);
}

function formatCategory(c: string): string {
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
