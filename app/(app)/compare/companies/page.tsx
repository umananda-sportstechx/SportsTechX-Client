'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { ArrowLeft } from 'lucide-react';
import { qk } from '@/lib/query-keys';
import { Page, Empty, Logo, Flag, SectorPill, Tag } from '@/components/ui/atoms';

interface CompanyRow {
	id: string;
	name: string;
	slug?: string;
	website?: string | null;
	custom_logo_url?: string | null;
	description?: string | null;
	primary_sector?: string | null;
	hq_city?: string | null;
	hq_country?: string | null;
	founded_year?: number | null;
	total_funding_usd?: number | string | null;
	stage?: string | null;
	last_round?: string | null;
	business_model?: string | null;
	is_unicorn?: boolean | null;
	is_actively_raising?: boolean | null;
	deals_count?: number | null;
	sports?: string[] | null;
	tech_tags?: string[] | null;
}

interface CompaniesResponse { data: CompanyRow[] }

export default function CompareCompaniesPage() {
	const params = useSearchParams();
	const idsParam = params.get('ids') ?? '';
	const ids = idsParam.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 4);

	const { data, isLoading } = useSWR<CompaniesResponse>(ids.length > 0 ? qk.compare.companies(ids) : null);

	if (ids.length === 0) {
		return (
			<Page>
				<BackLink />
				<Empty msg="No companies selected. Pick rows on /companies first." />
			</Page>
		);
	}
	if (isLoading) return <Page><BackLink /><Empty msg="Loading comparison…" /></Page>;

	const rows = data?.data ?? [];
	if (rows.length === 0) return <Page><BackLink /><Empty msg="Couldn't load the selected companies." /></Page>;

	return (
		<Page>
			<BackLink />
			<h1 style={titleStyle}>Compare companies</h1>
			<p style={{ color: 'var(--fg-2)', marginBottom: 'var(--space-4)' }}>
				Side-by-side on the metrics that drive a buy decision.
			</p>

			<div className="card" style={{ padding: 0, overflowX: 'auto' }}>
				<table className="data-table" style={{ minWidth: 720 }}>
					<thead>
						<tr>
							<th style={{ width: 180 }}>Metric</th>
							{rows.map((c) => (
								<th key={c.id}>
									<Link href={`/companies/${c.slug ?? c.id}`} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
										<Logo co={{ name: c.name, website: c.website, custom_logo_url: c.custom_logo_url }} size={24} />
										<span style={{ fontWeight: 700 }}>{c.name}</span>
									</Link>
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						<Row label="Sector" rows={rows} render={(c) => c.primary_sector ? <SectorPill name={c.primary_sector} /> : '—'} />
						<Row label="Country" rows={rows} render={(c) => (
							<span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
								{c.hq_country && <Flag cc={countryCode(c.hq_country)} />}
								{[c.hq_city, c.hq_country].filter(Boolean).join(', ') || '—'}
							</span>
						)} />
						<Row label="Founded" rows={rows} render={(c) => c.founded_year ?? '—'} />
						<Row label="Stage" rows={rows} render={(c) => c.stage ? <Tag>{c.stage}</Tag> : '—'} />
						<Row label="Last round" rows={rows} render={(c) => c.last_round ?? '—'} />
						<Row label="Total raised" rows={rows} render={(c) => formatRaised(c.total_funding_usd)} />
						<Row label="Deals" rows={rows} render={(c) => c.deals_count ?? '—'} />
						<Row label="Business model" rows={rows} render={(c) => c.business_model ?? '—'} />
						<Row label="Unicorn" rows={rows} render={(c) => c.is_unicorn ? 'Yes' : '—'} />
						<Row label="Raising" rows={rows} render={(c) => c.is_actively_raising ? 'Active' : '—'} />
						<Row label="Sports" rows={rows} render={(c) => (c.sports?.length ? c.sports.slice(0, 3).map((s) => <Tag key={s}>{s}</Tag>) : '—')} />
						<Row label="Tech tags" rows={rows} render={(c) => (c.tech_tags?.length ? c.tech_tags.slice(0, 3).map((s) => <Tag key={s}>{s}</Tag>) : '—')} />
						<Row label="Description" rows={rows} render={(c) => (
							<span style={{ fontSize: 12, color: 'var(--fg-2)', lineHeight: 1.5 }}>{c.description ?? '—'}</span>
						)} />
					</tbody>
				</table>
			</div>
		</Page>
	);
}

function Row<T>({ label, rows, render }: { label: string; rows: T[]; render: (row: T) => React.ReactNode }) {
	return (
		<tr>
			<td style={{ color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</td>
			{rows.map((r, i) => <td key={i}>{render(r)}</td>)}
		</tr>
	);
}

function BackLink() {
	return (
		<div style={{ marginBottom: 'var(--space-4)' }}>
			<Link href="/companies" className="btn ghost"><ArrowLeft size={12} /> Back to companies</Link>
		</div>
	);
}

const titleStyle: React.CSSProperties = { fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 8px' };

function formatRaised(value: number | string | null | undefined): string {
	if (value == null) return '—';
	const n = typeof value === 'string' ? Number(value) : value;
	if (!Number.isFinite(n) || n <= 0) return '—';
	if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
	if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(0)}M`;
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
