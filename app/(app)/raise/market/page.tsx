'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { Screen, H1, Eyebrow, Card, Stat, Tabs, Button, Loading, Empty } from '@/components/atlas/kit';

/**
 * Atlas Raise — Market (mock-ups 08/09 / Notion "Market"). Two tabs: Market size
 * and Competitors. Reuses the founder's verified-company report
 * (/api/verified-reports/mine), which computes market overview + competitors.
 * TAM/SAM methodology is still in progress (brief), shown as placeholder KPIs.
 */
interface Report {
	status: string;
	report_data: {
		company?: { sector?: string };
		competitors?: Array<{ id?: string; name?: string; website?: string; business_model?: string; hq_country?: string }>;
		marketOverview?: { headline?: string; bullets?: string[]; paragraphs?: string[] };
	} | null;
}

export default function RaiseMarketPage() {
	const [tab, setTab] = useState<'size' | 'competitors'>('size');
	const { data, isLoading } = useSWR<Report>(['/api/verified-reports/mine']);
	const rd = data?.report_data ?? null;
	const competitors = rd?.competitors ?? [];

	if (isLoading) return <Screen><Loading /></Screen>;
	if (!rd) return <Screen><Empty>Add your company in setup so Atlas can map your market and competitors.{' '}<Link href="/raise/setup" style={{ color: 'var(--a-navy)' }}>Complete setup →</Link></Empty></Screen>;

	return (
		<Screen>
			<H1>Market</H1>
			{rd.company?.sector && <div style={{ marginTop: 6 }}><Eyebrow>{rd.company.sector}</Eyebrow></div>}

			<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, margin: '20px 0 24px' }}>
				<Stat label="Total market (TAM)" value="—" />
				<Stat label="Addressable market (SAM)" value="—" />
				<Stat label="Competitors mapped" value={String(competitors.length)} />
			</div>

			<Tabs tabs={[{ key: 'size', label: 'Market size' }, { key: 'competitors', label: 'Competitors' }]} value={tab} onChange={setTab} />

			<div style={{ marginTop: 20 }}>
				{tab === 'size' ? (
					<Card focus style={{ padding: 22 }}>
						{rd.marketOverview?.headline && <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>{rd.marketOverview.headline}</div>}
						{rd.marketOverview?.paragraphs?.map((p, i) => <p key={i} style={{ fontSize: 14, color: 'var(--a-muted)', lineHeight: 1.65, margin: '0 0 12px' }}>{p}</p>)}
						{rd.marketOverview?.bullets && rd.marketOverview.bullets.length > 0 && (
							<ul style={{ margin: '8px 0 0', paddingLeft: 20, display: 'grid', gap: 6 }}>
								{rd.marketOverview.bullets.map((b, i) => <li key={i} style={{ fontSize: 14, color: 'var(--a-muted)', lineHeight: 1.5 }}>{b}</li>)}
							</ul>
						)}
						{!rd.marketOverview && <div style={{ color: 'var(--a-faint)', fontSize: 14 }}>Market analysis is still generating for your company.</div>}
						<div style={{ fontSize: 12, color: 'var(--a-faint)', marginTop: 16 }}>TAM / SAM sizing methodology is in progress and will appear here once available.</div>
					</Card>
				) : competitors.length === 0 ? <Empty>No competitors mapped yet.</Empty> : (
					<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
						{competitors.map((c, i) => (
							<Card key={c.id ?? i} style={{ padding: 18 }}>
								<div style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}>{c.name ?? 'Company'}</div>
								{c.hq_country && <div style={{ fontSize: 12, color: 'var(--a-faint)', marginBottom: 8 }}>{c.hq_country}</div>}
								{c.business_model && <div style={{ fontSize: 12, color: 'var(--a-muted)', marginBottom: 10 }}>{c.business_model}</div>}
								{c.id && <Button href={`/companies/${c.id}`} variant="ghost" size="sm"><ExternalLink size={13} /> View company</Button>}
							</Card>
						))}
					</div>
				)}
			</div>
		</Screen>
	);
}
