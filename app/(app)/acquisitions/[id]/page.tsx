'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import useSWR from 'swr';
import { ArrowLeft, ExternalLink, ArrowRight } from 'lucide-react';
import { qk } from '@/lib/query-keys';
import { Page, Flag, Tag, SectorPill, Empty } from '@/components/ui/atoms';

interface Acquisition {
	id: string;
	acquiree_company_id?: string | null;
	acquiree_name?: string | null;
	acquiree_name_snapshot?: string | null;
	acquiree_description?: string | null;
	acquiree_website_snapshot?: string | null;
	acquirer_company_id?: string | null;
	acquirer_name?: string | null;
	acquirer_name_snapshot?: string | null;
	acquirer_website_snapshot?: string | null;
	acquisition_type?: string | null;
	acquisition_date?: string | null;
	amount_usd?: number | string | null;
	primary_sector?: string | null;
	hq_country?: string | null;
	hq_city?: string | null;
	source_url?: string | null;
}

export default function AcquisitionDetailPage() {
	const params = useParams<{ id: string }>();
	const id = params?.id ?? '';

	const { data, isLoading, error } = useSWR<Acquisition>(
		id ? qk.acquisitions.detail(id) : null,
		{ dedupingInterval: 5 * 60_000 },
	);

	if (isLoading) return <Page><Empty msg="Loading acquisition…" /></Page>;
	if (error || !data?.id) {
		return (
			<Page>
				<div style={{ marginBottom: 'var(--space-4)' }}>
					<Link href="/acquisitions" className="btn ghost"><ArrowLeft size={12} /> Back to acquisitions</Link>
				</div>
				<Empty msg="Acquisition not found" />
			</Page>
		);
	}

	const cc = data.hq_country ? countryCode(data.hq_country) : '';
	const acquiree = data.acquiree_name ?? data.acquiree_name_snapshot ?? '—';
	const acquirer = data.acquirer_name ?? data.acquirer_name_snapshot ?? '—';
	const amt = Number(data.amount_usd ?? 0);
	const isStrategic = data.acquisition_type !== 'asset_purchase';

	return (
		<Page>
			<div style={{ marginBottom: 'var(--space-4)' }}>
				<Link href="/acquisitions" className="btn ghost"><ArrowLeft size={12} /> Back to acquisitions</Link>
			</div>

			<div style={{ marginBottom: 'var(--space-5)' }}>
				<div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
					M&amp;A · {formatShortDate(data.acquisition_date)}
				</div>
				<h1 style={{ fontFamily: 'var(--font-display)', fontSize: 38, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.05, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
					{data.acquiree_company_id ? (
						<Link href={`/companies/${data.acquiree_company_id}`} style={{ color: 'inherit', textDecoration: 'none' }}>{acquiree}</Link>
					) : <span>{acquiree}</span>}
					<ArrowRight size={28} style={{ color: 'var(--fg-muted)' }} />
					{data.acquirer_company_id ? (
						<Link href={`/companies/${data.acquirer_company_id}`} style={{ color: 'inherit', textDecoration: 'none' }}>{acquirer}</Link>
					) : <span>{acquirer}</span>}
				</h1>
				<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
					<Tag variant={isStrategic ? 'pos' : 'pill'}>{formatType(data.acquisition_type)}</Tag>
					{data.primary_sector && <SectorPill name={data.primary_sector} />}
					{cc && <span style={{ fontSize: 12, color: 'var(--fg-2)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
						<Flag cc={cc} /> {[data.hq_city, data.hq_country].filter(Boolean).join(', ')}
					</span>}
				</div>
				{data.source_url && (
					<a href={data.source_url} target="_blank" rel="noopener noreferrer" className="btn ghost">
						Source <ExternalLink size={12} />
					</a>
				)}
			</div>

			<div className="grid-3" style={{ marginBottom: 'var(--space-5)' }}>
				<StatCard label="Deal value" value={Number.isFinite(amt) && amt > 0 ? formatDollars(amt) : 'Undisclosed'} />
				<StatCard label="Type" value={formatType(data.acquisition_type)} />
				<StatCard label="Date" value={formatShortDate(data.acquisition_date)} />
			</div>

			{data.acquiree_description && (
				<div className="card" style={{ padding: 'var(--space-4)' }}>
					<div className="co-stat-label" style={{ marginBottom: 8 }}>About {acquiree}</div>
					<p style={{ margin: 0, color: 'var(--fg-2)', lineHeight: 1.6 }}>{data.acquiree_description}</p>
				</div>
			)}
		</Page>
	);
}

function StatCard({ label, value }: { label: string; value: string }) {
	return (
		<div className="card" style={{ padding: 'var(--space-4)' }}>
			<div className="co-stat-label">{label}</div>
			<div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, marginTop: 4 }}>{value}</div>
		</div>
	);
}

function formatType(t: string | null | undefined): string {
	if (!t) return 'Deal';
	switch (t) {
		case 'acquisition': return 'Acquisition';
		case 'merger': return 'Merger';
		case 'asset_purchase': return 'Asset purchase';
		default: return t;
	}
}

function formatShortDate(iso: string | null | undefined): string {
	if (!iso) return '—';
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return '—';
	return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
}

function formatDollars(value: number | string): string {
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
