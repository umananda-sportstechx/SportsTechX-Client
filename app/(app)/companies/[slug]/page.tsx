'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import useSWR from 'swr';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { qk } from '@/lib/query-keys';
import { Page, Logo, Flag, SectorPill, Tag, SectionHead, Sparkline, Empty } from '@/components/ui/atoms';

interface Company {
	id: string;
	name: string;
	slug?: string;
	description?: string | null;
	website?: string | null;
	primary_sector?: string | null;
	hq_city?: string | null;
	hq_country?: string | null;
	founded_year?: number | null;
	total_funding_usd?: number | string | null;
	stage?: string | null;
}

interface Deal {
	id: string;
	announced_date?: string | null;
	amount_usd?: number | string | null;
	round_type_name?: string | null;
	lead_investor?: string | null;
}

interface DealsResponse { data: Deal[]; total: number }

/**
 * Company detail page. Fetches the company by slug or id from /api/companies
 * plus its deal history. Linked from every company table/grid row across the
 * app (companies list, dashboard latest funding, etc.).
 */
export default function CompanyDetailPage() {
	const params = useParams<{ slug: string }>();
	const slug = params?.slug ?? '';

	const { data: company, isLoading, error } = useSWR<Company>(
		slug ? qk.companies.detail(slug) : null,
		{ dedupingInterval: 5 * 60_000 },
	);

	const { data: dealsResp } = useSWR<DealsResponse>(
		company?.id ? qk.deals.list({ company_id: company.id, limit: 30, sort: '-announced_date' }) : null,
		{ dedupingInterval: 5 * 60_000 },
	);

	const deals = dealsResp?.data ?? [];

	if (isLoading) {
		return <Page><Empty msg="Loading company…" /></Page>;
	}
	if (error || !company || !company.id) {
		return (
			<Page>
				<div style={{ marginBottom: 'var(--space-4)' }}>
					<Link href="/companies" className="btn ghost"><ArrowLeft size={12} /> Back to companies</Link>
				</div>
				<Empty msg="Company not found" />
			</Page>
		);
	}

	const cc = company.hq_country ? countryCode(company.hq_country) : '';

	return (
		<Page>
			<div style={{ marginBottom: 'var(--space-4)' }}>
				<Link href="/companies" className="btn ghost"><ArrowLeft size={12} /> Back to companies</Link>
			</div>

			<div
				style={{
					display: 'flex',
					alignItems: 'flex-start',
					gap: 'var(--space-4)',
					marginBottom: 'var(--space-5)',
				}}
			>
				<Logo co={{ name: company.name }} size={72} />
				<div style={{ flex: 1, minWidth: 0 }}>
					<div
						style={{
							fontFamily: 'var(--font-mono)',
							fontSize: 11,
							color: 'var(--fg-muted)',
							textTransform: 'uppercase',
							letterSpacing: '0.1em',
							marginBottom: 6,
							display: 'flex',
							alignItems: 'center',
							gap: 8,
						}}
					>
						{cc && <Flag cc={cc} />}
						{company.hq_city ? `${company.hq_city}, ` : ''}{company.hq_country ?? '—'}
					</div>
					<h1
						style={{
							fontFamily: 'var(--font-display)',
							fontSize: 38,
							fontWeight: 800,
							letterSpacing: '-0.02em',
							lineHeight: 1,
							margin: '0 0 8px',
						}}
					>
						{company.name}
					</h1>
					<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
						{company.primary_sector && <SectorPill name={company.primary_sector} />}
						{company.stage && <Tag>{company.stage}</Tag>}
					</div>
					{company.description && (
						<p style={{ fontSize: 14, color: 'var(--fg-2)', lineHeight: 1.55, maxWidth: 720, margin: 0 }}>
							{company.description}
						</p>
					)}
					{company.website && (
						<a href={company.website} target="_blank" rel="noopener noreferrer" style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--accent)', fontSize: 13 }}>
							{company.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
							<ExternalLink size={12} />
						</a>
					)}
				</div>
			</div>

			<div className="grid-4" style={{ marginBottom: 'var(--space-5)' }}>
				<div className="card" style={{ padding: 'var(--space-4)' }}>
					<div className="co-stat-label">Total raised</div>
					<div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, marginTop: 4 }}>
						{formatDollars(company.total_funding_usd)}
					</div>
				</div>
				<div className="card" style={{ padding: 'var(--space-4)' }}>
					<div className="co-stat-label">Founded</div>
					<div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, marginTop: 4 }}>
						{company.founded_year ?? '—'}
					</div>
				</div>
				<div className="card" style={{ padding: 'var(--space-4)' }}>
					<div className="co-stat-label">Rounds</div>
					<div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, marginTop: 4 }}>
						{deals.length}
					</div>
				</div>
				<div className="card" style={{ padding: 'var(--space-4)' }}>
					<div className="co-stat-label">Last round</div>
					<div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, marginTop: 4 }}>
						{formatShortDate(deals[0]?.announced_date) || '—'}
					</div>
				</div>
			</div>

			<div className="card">
				<SectionHead title="Funding history" meta={`${deals.length} rounds`} />
				{deals.length === 0 ? (
					<Empty msg="No disclosed rounds yet" />
				) : (
					<table className="data-table">
						<thead>
							<tr>
								<th>Date</th>
								<th>Round</th>
								<th>Lead investor</th>
								<th style={{ textAlign: 'right' }}>Amount</th>
							</tr>
						</thead>
						<tbody>
							{deals.map((d) => (
								<tr key={d.id}>
									<td className="num">{formatShortDate(d.announced_date)}</td>
									<td><Tag variant="pos">{d.round_type_name ?? '—'}</Tag></td>
									<td style={{ color: 'var(--fg-2)' }}>{d.lead_investor ?? '—'}</td>
									<td className="num" style={{ textAlign: 'right', fontWeight: 700 }}>
										{formatDollars(d.amount_usd)}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				)}
			</div>

			<div className="card" style={{ marginTop: 'var(--space-5)', padding: 'var(--space-4)' }}>
				<SectionHead title="Activity" meta="Synthetic — replace with /api/companies/:id/activity" />
				<div style={{ padding: 'var(--space-3)' }}>
					<Sparkline values={generateSpark(company.id)} w={680} h={64} fill />
				</div>
			</div>
		</Page>
	);
}

function generateSpark(seed: string | null | undefined): number[] {
	const s = seed ?? 'stx';
	let x = (s.charCodeAt(0) || 0) + (s.charCodeAt(1) || 0) + s.length;
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

function formatDollars(value: number | string | null | undefined): string {
	if (value == null) return '—';
	const n = typeof value === 'string' ? Number(value) : value;
	if (!Number.isFinite(n) || n <= 0) return '—';
	if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
	if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
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
		'The Netherlands': 'NL', Sweden: 'SE', Switzerland: 'CH', Belgium: 'BE',
		Austria: 'AT', Poland: 'PL', India: 'IN', China: 'CN', Japan: 'JP',
		Singapore: 'SG', Australia: 'AU', Brazil: 'BR', Canada: 'CA', Portugal: 'PT',
	};
	return map[countryName] ?? countryName.slice(0, 2).toUpperCase();
}
