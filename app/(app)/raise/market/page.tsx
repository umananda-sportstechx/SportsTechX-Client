'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, RefreshCw } from 'lucide-react';
import { qk } from '@/lib/query-keys';
import { apiRequest } from '@/lib/query-client';
import { Screen, H1, Card, Tabs, Button, Loading, Empty } from '@/components/atlas/kit';

/**
 * Atlas Raise — Market (canvas: isMarket → marketSize / marketComp). Reads
 * GET /api/raise/market: grounded aggregates (total funding, competitors, funding
 * CAGR) from our deals dataset + LLM-estimated TAM/SAM with methodology. Numbers
 * are labelled estimated vs grounded per the honesty note.
 */
interface Grounded { sector?: string; total_funding_usd?: number; funded_companies?: number; companies_tracked?: number; deals?: number; funding_cagr_pct?: number | null }
interface Methodology { approach?: string; grounded?: Grounded; assumptions?: string[]; sources?: string[] }
interface Competitor { id: string; name: string; hq_country: string | null; funding: string }
interface Market {
	unavailable?: boolean; reason?: string;
	tam: string | null; sam: string | null; cagr: string | null;
	classification: string | null; insight_md: string | null;
	methodology: Methodology | null; competitors: Competitor[] | null; updated_at?: string;
}

const eur = (v: string | null) => {
	if (v == null) return '—';
	const n = Number(v);
	return n >= 1e9 ? `EUR ${(n / 1e9).toFixed(1)}bn` : n >= 1e6 ? `EUR ${(n / 1e6).toFixed(0)}m` : `EUR ${n.toLocaleString()}`;
};
const usd = (n?: number) => (n == null ? '—' : n >= 1e9 ? `$${(n / 1e9).toFixed(1)}bn` : n >= 1e6 ? `$${(n / 1e6).toFixed(0)}m` : `$${n.toLocaleString()}`);

export default function RaiseMarketPage() {
	const [tab, setTab] = useState<'size' | 'competitors'>('size');
	const [recomputing, setRecomputing] = useState(false);
	// Poll while the (async) TAM/SAM estimate is still being generated, then stop.
	const { data, isLoading, mutate } = useSWR<Market>(qk.raise.market(), {
		refreshInterval: (d) => (d && !d.unavailable && d.tam == null ? 8000 : 0),
	});
	const estimating = !!data && !data.unavailable && data.tam == null;

	const competitors = useMemo(() => data?.competitors ?? [], [data]);
	const g = data?.methodology?.grounded;

	const recompute = async () => {
		setRecomputing(true);
		try {
			const res = await apiRequest('GET', '/api/raise/market?force=1');
			if (!res.ok) throw new Error('Could not recompute');
			await mutate((await res.json()) as Market, { revalidate: false });
			toast.success('Market analysis recomputed');
		} catch (e) { toast.error((e as Error).message ?? 'Recompute failed'); }
		finally { setRecomputing(false); }
	};

	if (isLoading) return <Screen><Loading /></Screen>;
	if (!data || data.unavailable) return <Screen><H1>Market</H1><div style={{ marginTop: 20 }}><Empty>Add your company in setup so Atlas can map your market and competitors.{' '}<Link href="/raise/setup" style={{ color: 'var(--a-navy)' }}>Complete setup →</Link></Empty></div></Screen>;

	return (
		<Screen width={1400}>
			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
				<H1>Market</H1>
				<Button variant="outline" size="sm" disabled={recomputing} onClick={() => void recompute()}>
					{recomputing ? <Loader2 className="spin" size={13} /> : <RefreshCw size={13} />} Recompute
				</Button>
			</div>

			<div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0,1fr))', gap: 13, marginTop: 20 }}>
				<Kpi label="Total market (TAM)" value={estimating ? 'Estimating…' : eur(data.tam)} estimated={data.tam != null} />
				<Kpi label="Addressable market (SAM)" value={estimating ? 'Estimating…' : eur(data.sam)} estimated={data.sam != null} />
				<Kpi label="Market growth" value={data.cagr != null ? `${Number(data.cagr).toFixed(1)}% CAGR` : '—'} />
				<Kpi label="Competitors tracked" value={String(g?.companies_tracked ?? competitors.length)} />
				<Kpi label="Total funding raised" value={usd(g?.total_funding_usd)} />
			</div>

			<div style={{ marginTop: 28 }}>
				<Tabs tabs={[{ key: 'size', label: 'Market size' }, { key: 'competitors', label: 'Competitors' }]} value={tab} onChange={setTab} />
			</div>

			{tab === 'size' ? (
				<div style={{ marginTop: 20, display: 'grid', gap: 18 }}>
					{data.classification && (
						<Card focus style={{ padding: '18px 24px' }}>
							<div style={{ fontSize: 13, color: 'var(--a-muted)' }}>Your market classification</div>
							<div style={{ fontSize: 15, fontWeight: 600, marginTop: 10 }}>{data.classification}</div>
						</Card>
					)}
					{data.insight_md && (
						<Card focus style={{ padding: '20px 24px 24px' }}>
							<div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Market insights</div>
							<p style={{ margin: 0, fontSize: 13, color: 'var(--a-muted)', lineHeight: 1.6 }}>{data.insight_md}</p>
						</Card>
					)}
					<Card style={{ padding: '20px 24px' }}>
						<div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>How these figures are derived</div>
						{data.methodology?.approach && <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--a-muted)', lineHeight: 1.5 }}>{data.methodology.approach}</p>}
						{g && (
							<div style={{ fontSize: 12, color: 'var(--a-muted)', display: 'grid', gap: 4, marginBottom: 12 }}>
								<span><strong style={{ color: 'var(--a-ink)' }}>Grounded (from our dataset):</strong> {usd(g.total_funding_usd)} raised · {g.funded_companies ?? 0} funded of {g.companies_tracked ?? 0} companies · {g.deals ?? 0} deals{g.funding_cagr_pct != null ? ` · funding CAGR ${g.funding_cagr_pct}%` : ''}.</span>
							</div>
						)}
						{(data.methodology?.assumptions?.length ?? 0) > 0 && (
							<div style={{ marginBottom: 10 }}>
								<div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Assumptions</div>
								<ul style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 4 }}>{data.methodology!.assumptions!.map((a, i) => <li key={i} style={{ fontSize: 12, color: 'var(--a-muted)', lineHeight: 1.5 }}>{a}</li>)}</ul>
							</div>
						)}
						<div style={{ fontSize: 11, color: 'var(--a-faint)', marginTop: 8 }}>TAM/SAM are estimates; funding, competitor counts and CAGR are computed from SportsTechX data.</div>
					</Card>
				</div>
			) : (
				<div style={{ marginTop: 20 }}>
					{competitors.length === 0 ? <Empty>No competitors mapped yet.</Empty> : (
						<div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 14 }}>
							{competitors.map((c) => (
								<Card key={c.id} style={{ padding: 16, minHeight: 110 }}>
									<div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
										<span style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--a-inset)', display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 600, color: 'var(--a-muted)', flexShrink: 0 }}>{c.name.charAt(0)}</span>
										<div><div style={{ fontSize: 14, fontWeight: 600 }}>{c.name}</div>{c.hq_country && <div style={{ fontSize: 12, color: 'var(--a-faint)', marginTop: 4 }}>{c.hq_country}</div>}</div>
									</div>
									<div style={{ fontSize: 12, color: 'var(--a-muted)', marginTop: 14 }}>{c.funding}</div>
								</Card>
							))}
						</div>
					)}
				</div>
			)}
		</Screen>
	);
}

function Kpi({ label, value, estimated }: { label: string; value: string; estimated?: boolean }) {
	return (
		<div className="atlas-stat">
			<div className="atlas-stat__label">{label}{estimated && <span style={{ color: 'var(--a-faint)', fontWeight: 400 }}> · est.</span>}</div>
			<div className="atlas-stat__value">{value}</div>
		</div>
	);
}
