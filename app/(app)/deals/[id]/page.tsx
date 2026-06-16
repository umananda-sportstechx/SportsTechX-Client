'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import useSWR from 'swr';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { qk } from '@/lib/query-keys';
import { Page, Flag, Tag, SectorPill, SectionHead, Empty, Logo } from '@/components/ui/atoms';

interface Deal {
	id: string;
	company_id?: string;
	company_name?: string | null;
	company_slug?: string | null;
	announced_date?: string | null;
	amount_usd?: number | string | null;
	round_type_name?: string | null;
	primary_sector?: string | null;
	business_model?: string | null;
	lead_investor?: string | null;
	hq_city?: string | null;
	hq_country?: string | null;
	source_url?: string | null;
}

interface DealInvestor {
	id: string;
	investor_id?: string | null;
	investor_name?: string | null;
	investor_slug?: string | null;
	is_lead?: boolean | null;
}

export default function DealDetailPage() {
	const params = useParams<{ id: string }>();
	const id = params?.id ?? '';

	const { data: deal, isLoading, error } = useSWR<Deal>(
		id ? qk.deals.detail(id) : null,
		{ dedupingInterval: 5 * 60_000 },
	);
	const { data: investors } = useSWR<DealInvestor[]>(
		deal?.id ? qk.deals.investors(deal.id) : null,
		{ dedupingInterval: 5 * 60_000 },
	);

	if (isLoading) return <Page><Empty msg="Loading deal…" /></Page>;
	if (error || !deal?.id) {
		return (
			<Page>
				<div style={{ marginBottom: 'var(--space-4)' }}>
					<Link href="/funding" className="btn ghost"><ArrowLeft size={12} /> Back to funding</Link>
				</div>
				<Empty msg="Deal not found" />
			</Page>
		);
	}

	const cc = deal.hq_country ? countryCode(deal.hq_country) : '';

	return (
		<Page>
			<div style={{ marginBottom: 'var(--space-4)' }}>
				<Link href="/funding" className="btn ghost"><ArrowLeft size={12} /> Back to funding</Link>
			</div>

			<div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
				<Logo co={{ name: deal.company_name ?? '—' }} size={72} />
				<div style={{ flex: 1, minWidth: 0 }}>
					<div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
						Funding round · {formatShortDate(deal.announced_date)}
					</div>
					<h1 style={{ fontFamily: 'var(--font-display)', fontSize: 38, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1, margin: '0 0 6px' }}>
						{deal.company_name ?? '—'}
					</h1>
					<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
						{deal.round_type_name && <Tag variant="pos">{deal.round_type_name}</Tag>}
						{deal.primary_sector && <SectorPill name={deal.primary_sector} />}
						{cc && <span style={{ fontSize: 12, color: 'var(--fg-2)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
							<Flag cc={cc} /> {[deal.hq_city, deal.hq_country].filter(Boolean).join(', ')}
						</span>}
					</div>
					<div style={{ display: 'flex', gap: 8 }}>
						{deal.company_slug || deal.company_id ? (
							<Link href={`/companies/${deal.company_slug ?? deal.company_id}`}><button className="btn">View company</button></Link>
						) : null}
						{deal.source_url && (
							<a href={deal.source_url} target="_blank" rel="noopener noreferrer" className="btn ghost">
								Source <ExternalLink size={12} />
							</a>
						)}
					</div>
				</div>
				<div style={{ textAlign: 'right' }}>
					<div className="co-stat-label">Amount raised</div>
					<div style={{ fontFamily: 'var(--font-display)', fontSize: 38, fontWeight: 800, lineHeight: 1 }}>
						{formatDollars(deal.amount_usd)}
					</div>
				</div>
			</div>

			<div className="card">
				<SectionHead title="Investors" />
				{(!investors || investors.length === 0) ? (
					<Empty msg="No investors disclosed." />
				) : (
					<table className="data-table">
						<thead><tr><th>Name</th><th>Role</th></tr></thead>
						<tbody>
							{investors.map((v) => (
								<tr key={v.id}>
									<td>
										{v.investor_slug || v.investor_id ? (
											<Link href={`/investors/${v.investor_slug ?? v.investor_id}`} style={{ fontWeight: 600 }}>
												{v.investor_name ?? '—'}
											</Link>
										) : <span style={{ fontWeight: 600 }}>{v.investor_name ?? '—'}</span>}
									</td>
									<td>{v.is_lead ? <Tag variant="pos">Lead</Tag> : 'Participant'}</td>
								</tr>
							))}
						</tbody>
					</table>
				)}
			</div>
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
