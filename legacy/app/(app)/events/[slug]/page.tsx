'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import useSWR from 'swr';
import { ArrowLeft, Calendar, ExternalLink, MapPin } from 'lucide-react';
import { qk } from '@/lib/query-keys';
import { Page, Flag, Tag, Empty } from '@/components/ui/atoms';

interface EcosystemEntity {
	id: string;
	name: string;
	slug?: string | null;
	description?: string | null;
	entity_type?: string | null;
	website?: string | null;
	hq_city?: string | null;
	hq_country?: string | null;
	start_date?: string | null;
	end_date?: string | null;
	expected_attendees?: string | null;
	tags?: string[] | null;
	color?: string | null;
}

export default function EventDetailPage() {
	const params = useParams<{ slug: string }>();
	const slug = params?.slug ?? '';

	const { data, isLoading, error } = useSWR<EcosystemEntity>(
		slug ? qk.ecosystem.detail(slug) : null,
		{ dedupingInterval: 5 * 60_000 },
	);

	if (isLoading) return <Page><Empty msg="Loading event…" /></Page>;
	if (error || !data?.id) {
		return (
			<Page>
				<div style={{ marginBottom: 'var(--space-4)' }}>
					<Link href="/events" className="btn ghost"><ArrowLeft size={12} /> Back to events</Link>
				</div>
				<Empty msg="Event not found" />
			</Page>
		);
	}

	const cc = data.hq_country ? countryCode(data.hq_country) : '';
	const dateRange = formatDateRange(data.start_date, data.end_date);

	return (
		<Page>
			<div style={{ marginBottom: 'var(--space-4)' }}>
				<Link href="/events" className="btn ghost"><ArrowLeft size={12} /> Back to events</Link>
			</div>

			<div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 'var(--space-5)' }}>
				<div style={{ background: data.color ?? 'oklch(58% 0.22 240)', padding: 'var(--space-5)', color: '#fff' }}>
					<div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.85, marginBottom: 8 }}>
						Event
					</div>
					<h1 style={{ fontFamily: 'var(--font-display)', fontSize: 38, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.05, margin: '0 0 12px' }}>
						{data.name}
					</h1>
					<div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13, opacity: 0.92 }}>
						{dateRange && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Calendar size={14} /> {dateRange}</span>}
						{(data.hq_city || data.hq_country) && (
							<span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
								<MapPin size={14} />
								{cc && <Flag cc={cc} />}
								{[data.hq_city, data.hq_country].filter(Boolean).join(', ')}
							</span>
						)}
					</div>
				</div>
				<div style={{ padding: 'var(--space-5)' }}>
					{data.description && (
						<p style={{ margin: '0 0 var(--space-4)', color: 'var(--fg-2)', lineHeight: 1.6 }}>
							{data.description}
						</p>
					)}
					<div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 'var(--space-4)' }}>
						{(data.tags ?? []).map((t) => <Tag key={t}>{t}</Tag>)}
					</div>
					{data.expected_attendees && (
						<div style={{ fontSize: 13, color: 'var(--fg-muted)', marginBottom: 12 }}>
							Expected attendees: <b style={{ color: 'var(--fg)' }}>{data.expected_attendees}</b>
						</div>
					)}
					{data.website && (
						<a href={data.website} target="_blank" rel="noopener noreferrer" className="btn">
							Event website <ExternalLink size={12} />
						</a>
					)}
				</div>
			</div>
		</Page>
	);
}

function formatDateRange(start: string | null | undefined, end: string | null | undefined): string {
	if (!start) return '';
	const s = new Date(start);
	if (Number.isNaN(s.getTime())) return '';
	const startFmt = s.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	if (!end) return startFmt;
	const e = new Date(end);
	if (Number.isNaN(e.getTime()) || e.getTime() === s.getTime()) return startFmt;
	const endFmt = e.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	return `${startFmt} — ${endFmt}`;
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
