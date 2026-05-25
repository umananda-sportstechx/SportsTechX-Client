'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { ArrowLeft } from 'lucide-react';
import { qk } from '@/lib/query-keys';
import { Page, Empty, Flag, Tag } from '@/components/ui/atoms';

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
	is_verified?: boolean | null;
	actively_investing?: boolean | null;
	focus_stages?: string[] | null;
	focus_sectors?: string[] | null;
}

interface InvestorsResponse { data: InvestorRow[] }

export default function CompareInvestorsPage() {
	const params = useSearchParams();
	const idsParam = params.get('ids') ?? '';
	const ids = idsParam.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 4);

	const { data, isLoading } = useSWR<InvestorsResponse>(ids.length > 0 ? qk.compare.investors(ids) : null);

	if (ids.length === 0) return <Page><BackLink /><Empty msg="No investors selected. Pick rows on /investors first." /></Page>;
	if (isLoading) return <Page><BackLink /><Empty msg="Loading comparison…" /></Page>;

	const rows = data?.data ?? [];
	if (rows.length === 0) return <Page><BackLink /><Empty msg="Couldn't load the selected investors." /></Page>;

	return (
		<Page>
			<BackLink />
			<h1 style={titleStyle}>Compare investors</h1>
			<p style={{ color: 'var(--fg-2)', marginBottom: 'var(--space-4)' }}>
				Side-by-side on the metrics that drive deal-flow decisions.
			</p>

			<div className="card" style={{ padding: 0, overflowX: 'auto' }}>
				<table className="data-table" style={{ minWidth: 720 }}>
					<thead>
						<tr>
							<th style={{ width: 180 }}>Metric</th>
							{rows.map((inv) => (
								<th key={inv.id}>
									<Link href={`/investors/${inv.slug ?? inv.id}`} style={{ fontWeight: 700 }}>{inv.name}</Link>
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						<Row label="Category" rows={rows} render={(r) => r.category ? <Tag>{r.category.replace(/_/g, ' ')}</Tag> : '—'} />
						<Row label="Type" rows={rows} render={(r) => r.type ?? '—'} />
						<Row label="HQ" rows={rows} render={(r) => (
							<span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
								{r.hq_country && <Flag cc={countryCode(r.hq_country)} />}
								{[r.hq_city, r.hq_country].filter(Boolean).join(', ') || '—'}
							</span>
						)} />
						<Row label="Year launched" rows={rows} render={(r) => r.year_launched ?? '—'} />
						<Row label="AUM" rows={rows} render={(r) => formatDollars(r.total_aum_usd)} />
						<Row label="Deal count" rows={rows} render={(r) => r.deals_count ?? '—'} />
						<Row label="Verified" rows={rows} render={(r) => r.is_verified ? 'Yes' : '—'} />
						<Row label="Actively investing" rows={rows} render={(r) => r.actively_investing ? 'Yes' : '—'} />
						<Row label="Stages" rows={rows} render={(r) => (r.focus_stages ?? []).slice(0, 4).map((s) => <Tag key={s}>{s}</Tag>) as React.ReactNode || '—'} />
						<Row label="Sectors" rows={rows} render={(r) => (r.focus_sectors ?? []).slice(0, 4).map((s) => <Tag key={s}>{s}</Tag>) as React.ReactNode || '—'} />
						<Row label="Recent investment" rows={rows} render={(r) => r.recent_investment ?? '—'} />
						<Row label="Thesis" rows={rows} render={(r) => (
							<span style={{ fontSize: 12, color: 'var(--fg-2)', lineHeight: 1.5 }}>{r.thesis ?? r.description ?? '—'}</span>
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
			<Link href="/investors" className="btn ghost"><ArrowLeft size={12} /> Back to investors</Link>
		</div>
	);
}

const titleStyle: React.CSSProperties = { fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 8px' };

function formatDollars(value: number | string | null | undefined): string {
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
