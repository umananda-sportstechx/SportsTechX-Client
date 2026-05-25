'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { ArrowLeft } from 'lucide-react';
import { qk } from '@/lib/query-keys';
import { Page, Empty, Tag } from '@/components/ui/atoms';

interface DealRow {
	id: string;
	company_id: string;
	company_name?: string | null;
	company_slug?: string | null;
	announced_date?: string | null;
	announced_year?: number | null;
	amount_usd?: number | string | null;
	round_type?: string | null;
	lead_investor?: string | null;
	region?: string | null;
	country?: string | null;
	business_model?: string | null;
	deal_size_bucket?: string | null;
	valuation_usd?: number | string | null;
	investors?: string[] | null;
}

interface DealsResponse { data: DealRow[] }

export default function CompareDealsPage() {
	const params = useSearchParams();
	const idsParam = params.get('ids') ?? '';
	const ids = idsParam.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 4);

	const { data, isLoading } = useSWR<DealsResponse>(ids.length > 0 ? qk.compare.deals(ids) : null);

	if (ids.length === 0) return <Page><BackLink /><Empty msg="No deals selected. Pick rows on /deals first." /></Page>;
	if (isLoading) return <Page><BackLink /><Empty msg="Loading comparison…" /></Page>;

	const rows = data?.data ?? [];
	if (rows.length === 0) return <Page><BackLink /><Empty msg="Couldn't load the selected deals." /></Page>;

	return (
		<Page>
			<BackLink />
			<h1 style={titleStyle}>Compare deals</h1>
			<p style={{ color: 'var(--fg-2)', marginBottom: 'var(--space-4)' }}>
				Side-by-side on the metrics that frame a round.
			</p>

			<div className="card" style={{ padding: 0, overflowX: 'auto' }}>
				<table className="data-table" style={{ minWidth: 720 }}>
					<thead>
						<tr>
							<th style={{ width: 180 }}>Metric</th>
							{rows.map((d) => (
								<th key={d.id}>
									<Link href={`/deals/${d.id}`} style={{ fontWeight: 700 }}>{d.company_name ?? '—'}</Link>
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						<Row label="Company" rows={rows} render={(d) => d.company_slug
							? <Link href={`/companies/${d.company_slug}`}>{d.company_name}</Link>
							: (d.company_name ?? '—')} />
						<Row label="Amount" rows={rows} render={(d) => formatDollars(d.amount_usd)} />
						<Row label="Valuation" rows={rows} render={(d) => formatDollars(d.valuation_usd)} />
						<Row label="Round type" rows={rows} render={(d) => d.round_type ? <Tag>{d.round_type}</Tag> : '—'} />
						<Row label="Announced" rows={rows} render={(d) => d.announced_date ? formatDate(d.announced_date) : (d.announced_year ?? '—')} />
						<Row label="Lead investor" rows={rows} render={(d) => d.lead_investor ?? '—'} />
						<Row label="Investors" rows={rows} render={(d) => (d.investors ?? []).slice(0, 6).map((s) => <Tag key={s}>{s}</Tag>) as React.ReactNode || '—'} />
						<Row label="Country" rows={rows} render={(d) => d.country ?? '—'} />
						<Row label="Region" rows={rows} render={(d) => d.region ?? '—'} />
						<Row label="Business model" rows={rows} render={(d) => d.business_model ?? '—'} />
						<Row label="Size bucket" rows={rows} render={(d) => d.deal_size_bucket ?? '—'} />
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
			<Link href="/deals" className="btn ghost"><ArrowLeft size={12} /> Back to deals</Link>
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

function formatDate(iso: string): string {
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return iso;
	return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
}
