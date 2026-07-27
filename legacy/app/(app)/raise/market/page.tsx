'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { useState } from 'react';
import { Loader2, ExternalLink } from 'lucide-react';
import { Page } from '@/components/ui/atoms';

/**
 * Atlas Raise — Market (Notion "Market" + designer brief). Two tabs: Market Size
 * and Competitors. Reuses the founder's verified-company report (/api/verified-
 * reports/mine), which already computes market overview + competitor set.
 * TAM/SAM methodology is still being developed (brief), so those are flexible
 * placeholder cards for now.
 */
interface Report {
	status: string;
	report_data: {
		company?: { sector?: string };
		competitors?: Array<{ id?: string; name?: string; website?: string; business_model?: string }>;
		marketOverview?: { headline?: string; bullets?: string[]; paragraphs?: string[] };
	} | null;
}

export default function RaiseMarketPage() {
	const [tab, setTab] = useState<'size' | 'competitors'>('size');
	const { data, isLoading } = useSWR<Report>(['/api/verified-reports/mine']);
	const rd = data?.report_data ?? null;
	const competitors = rd?.competitors ?? [];

	if (isLoading) return <Page><Center><Loader2 className="spin" size={22} /></Center></Page>;
	if (!rd) return <Page><Empty>Add your company in setup so Atlas can map your market and competitors. <Link href="/raise/setup" style={{ color: 'var(--accent)' }}>Complete setup →</Link></Empty></Page>;

	return (
		<Page>
			<h1 style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 4px' }}>Market</h1>
			{rd.company?.sector && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fg-muted)', marginBottom: 16 }}>{rd.company.sector}</div>}

			{/* Market summary KPI cards (flexible — metrics can be added later) */}
			<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
				<Kpi label="Competitors mapped" value={String(competitors.length)} />
				<Kpi label="TAM" value="—" note="methodology in progress" />
				<Kpi label="SAM" value="—" note="methodology in progress" />
			</div>

			<div style={{ display: 'flex', gap: 18, borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
				{(['size', 'competitors'] as const).map((t) => (
					<button key={t} onClick={() => setTab(t)} style={{ padding: '8px 2px', border: 0, background: 'transparent', cursor: 'pointer', fontSize: 14, fontWeight: 700, color: tab === t ? 'var(--accent)' : 'var(--fg-muted)', borderBottom: `2px solid ${tab === t ? 'var(--accent)' : 'transparent'}`, marginBottom: -1 }}>
						{t === 'size' ? 'Market' : 'Competitors'}
					</button>
				))}
			</div>

			{tab === 'size' ? (
				<div className="card" style={{ padding: 22 }}>
					{rd.marketOverview?.headline && <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, marginBottom: 12 }}>{rd.marketOverview.headline}</div>}
					{rd.marketOverview?.paragraphs?.map((p, i) => <p key={i} style={{ fontSize: 14, color: 'var(--fg-2)', lineHeight: 1.65, margin: '0 0 12px' }}>{p}</p>)}
					{rd.marketOverview?.bullets && rd.marketOverview.bullets.length > 0 && (
						<ul style={{ margin: '8px 0 0', paddingLeft: 20, display: 'grid', gap: 6 }}>
							{rd.marketOverview.bullets.map((b, i) => <li key={i} style={{ fontSize: 14, color: 'var(--fg-2)', lineHeight: 1.5 }}>{b}</li>)}
						</ul>
					)}
					{!rd.marketOverview && <div style={{ color: 'var(--fg-muted)', fontSize: 14 }}>Market analysis is still generating for your company.</div>}
				</div>
			) : competitors.length === 0 ? <Empty>No competitors mapped yet.</Empty> : (
				<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
					{competitors.map((c, i) => (
						<div key={c.id ?? i} className="card" style={{ padding: 18 }}>
							<div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{c.name ?? 'Company'}</div>
							{c.business_model && <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginBottom: 8 }}>{c.business_model}</div>}
							{c.id && <Link href={`/companies/${c.id}`} className="btn ghost" style={{ marginTop: 4 }}><ExternalLink size={13} /> View company</Link>}
						</div>
					))}
				</div>
			)}
		</Page>
	);
}

function Kpi({ label, value, note }: { label: string; value: string; note?: string }) {
	return (
		<div className="card" style={{ padding: 16 }}>
			<div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)' }}>{label}</div>
			<div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, marginTop: 4 }}>{value}</div>
			{note && <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 2 }}>{note}</div>}
		</div>
	);
}
function Center({ children }: { children: React.ReactNode }) { return <div style={{ display: 'grid', placeItems: 'center', minHeight: 300 }}>{children}</div>; }
function Empty({ children }: { children: React.ReactNode }) { return <div className="card" style={{ padding: 28, textAlign: 'center', color: 'var(--fg-2)', fontSize: 14 }}>{children}</div>; }
