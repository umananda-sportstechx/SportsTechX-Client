'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import useSWR from 'swr';
import { ArrowLeft, Calendar, ExternalLink, MapPin, Clock, DollarSign } from 'lucide-react';
import { qk } from '@/lib/query-keys';
import { Page, Flag, Tag, Empty } from '@/components/ui/atoms';

interface EcosystemEntity {
	id: string;
	name: string;
	slug?: string | null;
	description?: string | null;
	entity_type?: string | null;
	website?: string | null;
	status?: string | null;
	cohort_label?: string | null;
	investment_label?: string | null;
	investment_amount?: number | string | null;
	duration_label?: string | null;
	application_deadline?: string | null;
	hq_city?: string | null;
	hq_country?: string | null;
	tags?: string[] | null;
	color?: string | null;
}

export default function ProgramDetailPage() {
	const params = useParams<{ slug: string }>();
	const slug = params?.slug ?? '';

	const { data, isLoading, error } = useSWR<EcosystemEntity>(
		slug ? qk.ecosystem.detail(slug) : null,
		{ dedupingInterval: 5 * 60_000 },
	);

	if (isLoading) return <Page><Empty msg="Loading program…" /></Page>;
	if (error || !data?.id) {
		return (
			<Page>
				<div style={{ marginBottom: 'var(--space-4)' }}>
					<Link href="/programs" className="btn ghost"><ArrowLeft size={12} /> Back to programs</Link>
				</div>
				<Empty msg="Program not found" />
			</Page>
		);
	}

	const cc = data.hq_country ? countryCode(data.hq_country) : '';
	const status = data.status ?? null;
	const statusLabel = formatStatus(status);
	const investment = data.investment_label ?? formatDollars(data.investment_amount);

	return (
		<Page>
			<div style={{ marginBottom: 'var(--space-4)' }}>
				<Link href="/programs" className="btn ghost"><ArrowLeft size={12} /> Back to programs</Link>
			</div>

			<div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 'var(--space-5)' }}>
				<div style={{ background: data.color ? `linear-gradient(135deg, ${data.color}, ${data.color}aa)` : 'oklch(58% 0.22 290)', padding: 'var(--space-5)', color: '#fff' }}>
					{data.cohort_label && (
						<div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.85, marginBottom: 8 }}>
							{data.cohort_label}
						</div>
					)}
					<h1 style={{ fontFamily: 'var(--font-display)', fontSize: 38, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.05, margin: '0 0 12px' }}>
						{data.name}
					</h1>
					{status && (
						<div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: 'rgba(255,255,255,0.18)', fontSize: 11, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
							{statusLabel}
						</div>
					)}
				</div>
				<div style={{ padding: 'var(--space-5)' }}>
					{data.description && (
						<p style={{ margin: '0 0 var(--space-4)', color: 'var(--fg-2)', lineHeight: 1.6 }}>
							{data.description}
						</p>
					)}
					<div className="grid-4" style={{ marginBottom: 'var(--space-4)' }}>
						<MetaCard icon={<DollarSign size={14} />} label="Investment" value={investment ?? '—'} />
						<MetaCard icon={<Clock size={14} />} label="Duration" value={data.duration_label ?? '—'} />
						<MetaCard
							icon={<MapPin size={14} />}
							label="Location"
							value={[data.hq_city, data.hq_country].filter(Boolean).join(', ') || '—'}
							flag={cc}
						/>
						<MetaCard
							icon={<Calendar size={14} />}
							label="Deadline"
							value={data.application_deadline ? formatShortDate(data.application_deadline) : '—'}
						/>
					</div>
					<div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
						{(data.tags ?? []).map((t) => <Tag key={t}>{t}</Tag>)}
					</div>
					{data.website && (
						<a href={data.website} target="_blank" rel="noopener noreferrer" className="btn">
							Apply <ExternalLink size={12} />
						</a>
					)}
				</div>
			</div>
		</Page>
	);
}

function MetaCard({ icon, label, value, flag }: { icon: React.ReactNode; label: string; value: string; flag?: string }) {
	return (
		<div style={{ padding: 'var(--space-3)', background: 'var(--bg-2)' }}>
			<div className="co-stat-label" style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>{icon} {label}</div>
			<div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, marginTop: 4, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
				{flag && <Flag cc={flag} />} {value}
			</div>
		</div>
	);
}

function formatStatus(s: string | null | undefined): string {
	switch (s) {
		case 'open': return 'Applications open';
		case 'closing_soon': return 'Closing soon';
		case 'closed': return 'Closed';
		default: return s ?? '—';
	}
}

function formatDollars(value: number | string | null | undefined): string | null {
	if (value == null) return null;
	const n = typeof value === 'string' ? Number(value) : value;
	if (!Number.isFinite(n) || n <= 0) return null;
	if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(0)}M`;
	if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
	return `$${n.toFixed(0)}`;
}

function formatShortDate(iso: string): string {
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
