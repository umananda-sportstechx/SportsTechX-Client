'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { useMemo, useState } from 'react';
import { Screen, H1, Card, Tabs, Button, Loading, Empty } from '@/components/atlas/kit';

/**
 * Atlas Raise — Market (canvas: isMarket → marketSize / marketComp). Reuses the
 * founder's verified-company report (GET /api/verified-reports/mine — returns an
 * ARRAY, newest first). TAM/SAM/CAGR/funding aren't computed yet, so those KPI
 * tiles read "—" (methodology in progress); competitors are real.
 */
interface Report {
	status: string;
	report_data: {
		company?: { sector?: string; classification?: string[] };
		competitors?: Array<{ id?: string; name?: string; website?: string; business_model?: string; hq_country?: string; funding?: string; category?: string }>;
		marketOverview?: { headline?: string; bullets?: string[]; paragraphs?: string[] };
	} | null;
}

export default function RaiseMarketPage() {
	const [tab, setTab] = useState<'size' | 'competitors'>('size');
	const [filter, setFilter] = useState<'all' | 'direct' | 'adjacent'>('all');
	const { data, isLoading } = useSWR<Report[]>(['/api/verified-reports/mine']);
	const rd = data?.[0]?.report_data ?? null;
	const competitors = rd?.competitors ?? [];
	const shown = useMemo(() => {
		if (filter === 'all') return competitors;
		return competitors.filter((c) => (c.category ?? '').toLowerCase().includes(filter === 'direct' ? 'direct' : 'adjacent'));
	}, [competitors, filter]);

	if (isLoading) return <Screen><Loading /></Screen>;
	if (!rd) return <Screen><Empty>Add your company in setup so Atlas can map your market and competitors.{' '}<Link href="/raise/setup" style={{ color: 'var(--a-navy)' }}>Complete setup →</Link></Empty></Screen>;

	const classification = rd.company?.classification ?? (rd.company?.sector ? [rd.company.sector] : []);

	return (
		<Screen width={1400}>
			<H1>Market</H1>

			<div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0,1fr))', gap: 13, marginTop: 20 }}>
				<Kpi label="Total market (TAM)" value="—" />
				<Kpi label="Addressable market (SAM)" value="—" />
				<Kpi label="Market growth" value="—" />
				<Kpi label="Competitors tracked" value={String(competitors.length)} />
				<Kpi label="Total funding raised" value="—" />
			</div>

			<div style={{ marginTop: 28 }}>
				<Tabs tabs={[{ key: 'size', label: 'Market size' }, { key: 'competitors', label: 'Competitors' }]} value={tab} onChange={setTab} />
			</div>

			{tab === 'size' ? (
				<div style={{ marginTop: 20, display: 'grid', gap: 18 }}>
					{classification.length > 0 && (
						<Card focus style={{ padding: '18px 24px' }}>
							<div style={{ fontSize: 13, color: 'var(--a-muted)' }}>Your market classification</div>
							<div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10, fontSize: 15, flexWrap: 'wrap' }}>
								{classification.map((c, i) => (
									<span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
										<span style={{ fontWeight: 600 }}>{c}</span>{i < classification.length - 1 && <span style={{ color: 'var(--a-faint)' }}>→</span>}
									</span>
								))}
							</div>
						</Card>
					)}
					<Card focus style={{ padding: '20px 24px 26px' }}>
						<div style={{ fontSize: 15, fontWeight: 600 }}>{rd.marketOverview?.headline ?? 'Market overview'}</div>
						{rd.marketOverview?.paragraphs?.map((p, i) => <p key={i} style={{ fontSize: 13, color: 'var(--a-muted)', lineHeight: 1.65, margin: '12px 0 0' }}>{p}</p>)}
						{rd.marketOverview?.bullets && rd.marketOverview.bullets.length > 0 && (
							<ul style={{ margin: '10px 0 0', paddingLeft: 20, display: 'grid', gap: 6 }}>{rd.marketOverview.bullets.map((b, i) => <li key={i} style={{ fontSize: 13, color: 'var(--a-muted)', lineHeight: 1.5 }}>{b}</li>)}</ul>
						)}
						{!rd.marketOverview && <div style={{ color: 'var(--a-faint)', fontSize: 14, marginTop: 8 }}>Market analysis is still generating for your company.</div>}
						<div style={{ fontSize: 12, color: 'var(--a-faint)', marginTop: 16 }}>TAM / SAM sizing methodology is in progress and will appear here once available.</div>
					</Card>
					<div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
						<Button variant="outline" disabled title="Coming soon">Change geography</Button>
						<Button variant="outline" disabled title="Coming soon">Select a narrower segment</Button>
						<Button variant="outline" disabled title="Coming soon">Correct categorisation</Button>
					</div>
				</div>
			) : (
				<div style={{ marginTop: 20 }}>
					<div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
						{(['all', 'direct', 'adjacent'] as const).map((f) => (
							<button key={f} onClick={() => setFilter(f)} className={`atlas-btn ${filter === f ? 'atlas-btn--primary' : 'atlas-btn--outline'} atlas-btn--sm`} style={{ textTransform: 'capitalize' }}>
								{f}{f === 'all' ? ` (${competitors.length})` : ''}
							</button>
						))}
						<span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--a-faint)' }}>Last updated: {data?.[0] ? 'recent' : '—'}</span>
					</div>
					{shown.length === 0 ? <Empty>No competitors mapped yet.</Empty> : (
						<div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 14 }}>
							{shown.map((c, i) => (
								<Card key={c.id ?? i} style={{ padding: 16, minHeight: 132 }}>
									<div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
										<span style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--a-inset)', display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 600, color: 'var(--a-muted)', flexShrink: 0 }}>{(c.name ?? 'C').charAt(0)}</span>
										<div><div style={{ fontSize: 14, fontWeight: 600 }}>{c.name ?? 'Company'}</div>{c.hq_country && <div style={{ fontSize: 12, color: 'var(--a-faint)', marginTop: 4 }}>{c.hq_country}</div>}</div>
									</div>
									{c.funding && <div style={{ fontSize: 12, color: 'var(--a-muted)', marginTop: 14 }}>{c.funding}</div>}
									{c.business_model && <div style={{ fontSize: 12, color: 'var(--a-faint)', marginTop: 8, lineHeight: 1.35 }}>{c.business_model}</div>}
								</Card>
							))}
						</div>
					)}
				</div>
			)}
		</Screen>
	);
}

function Kpi({ label, value }: { label: string; value: string }) {
	return <div className="atlas-stat"><div className="atlas-stat__label">{label}</div><div className="atlas-stat__value">{value}</div></div>;
}
