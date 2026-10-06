'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, RefreshCw } from 'lucide-react';
import { qk } from '@/lib/query-keys';
import { apiRequest } from '@/lib/query-client';
import { Card, Tabs, Button, Loading, Empty, Logo, Flag } from '@/components/atlas';

/**
 * Market → My market. The founder's OWN market: LLM-estimated TAM/SAM plus
 * grounded funding/CAGR/competitor aggregates for their sector. Moved verbatim
 * from the old Market "Analysis" tab so nothing is lost when the general market
 * analytics took that slot.
 */
interface Grounded { sector?: string; total_funding_usd?: number; funded_companies?: number; companies_tracked?: number; deals?: number; funding_cagr_pct?: number | null }
interface Methodology { approach?: string; grounded?: Grounded; assumptions?: string[]; sources?: string[] }
interface Competitor { id: string; name: string; website?: string | null; custom_logo_url?: string | null; hq_country: string | null; funding: string }
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
const usd = (n?: number | null) => (n == null ? '—' : n >= 1e9 ? `$${(n / 1e9).toFixed(1)}bn` : n >= 1e6 ? `$${(n / 1e6).toFixed(0)}m` : n > 0 ? `$${n.toLocaleString()}` : '—');

export function MyMarket() {
	const [tab, setTab] = useState<'size' | 'competitors'>('size');
	const [recomputing, setRecomputing] = useState(false);
	const [attempts, setAttempts] = useState(0);
	const { data, isLoading, mutate } = useSWR<Market>(qk.raise.market(), {
		refreshInterval: (d) => (d && !d.unavailable && d.tam == null && attempts < 6 ? 8000 : 0),
		onSuccess: (d) => setAttempts((a) => (d && !d.unavailable && d.tam == null ? a + 1 : 0)),
	});
	const estimating = !!data && !data.unavailable && data.tam == null && attempts < 6;
	const competitors = useMemo(() => data?.competitors ?? [], [data]);
	const g = data?.methodology?.grounded;

	const recompute = async () => {
		setRecomputing(true);
		try {
			const res = await apiRequest('GET', '/api/raise/market?force=1');
			if (!res.ok) throw new Error('Could not recompute');
			setAttempts(0);
			await mutate((await res.json()) as Market, { revalidate: false });
			toast.success('Market analysis recomputed');
		} catch (e) { toast.error((e as Error).message ?? 'Recompute failed'); }
		finally { setRecomputing(false); }
	};

	if (isLoading) return <Loading />;
	if (!data || data.unavailable) return (
		<Empty>Atlas needs your company category to map your market. Set it under{' '}
			<Link href="/raise/settings" style={{ color: 'var(--a-navy)' }}>Thesis settings → Category</Link>.</Empty>
	);

	return (
		<>
			<div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
				<Button variant="outline" size="sm" disabled={recomputing} onClick={() => void recompute()}>
					{recomputing ? <Loader2 className="animate-spin" size={13} /> : <RefreshCw size={13} />} Recompute
				</Button>
			</div>

			<div className="atlas-kpis">
				<Kpi label="Total market (TAM)" value={estimating || recomputing ? '—' : eur(data.tam)} note={estimating || recomputing ? 'Estimating…' : data.tam != null ? 'Estimate' : undefined} />
				<Kpi label="Addressable market (SAM)" value={estimating || recomputing ? '—' : eur(data.sam)} note={estimating || recomputing ? 'Estimating…' : data.sam != null ? 'Estimate' : undefined} />
				<Kpi label="Market growth" value={data.cagr != null ? `${Number(data.cagr).toFixed(1)}% CAGR` : '—'} />
				<Kpi label="Competitors tracked" value={String(g?.companies_tracked ?? competitors.length)} />
				<Kpi label="Total funding raised" value={usd(g?.total_funding_usd)} />
			</div>

			<div style={{ marginTop: 36 }}>
				<Tabs tabs={[{ key: 'size', label: 'Market size' }, { key: 'competitors', label: 'Competitors' }]} value={tab} onChange={setTab} />
			</div>

			{tab === 'size' ? (
				<div style={{ marginTop: 27, display: 'grid', gap: 20 }}>
					{data.classification && (
						<Card glow="blue">
							<div className="atlas-eyebrow">Your market classification</div>
							<div style={{ fontSize: 18, fontFamily: 'var(--a-font)', fontWeight: 700, marginTop: 12 }}>{data.classification}</div>
						</Card>
					)}
					{data.insight_md && (
						<Card>
							<div className="atlas-h2" style={{ marginBottom: 12 }}>Market insights</div>
							<p style={{ margin: 0, fontSize: 13, color: 'var(--a-muted)', lineHeight: 1.6 }}>{data.insight_md}</p>
						</Card>
					)}
					<Card>
						<div className="atlas-eyebrow" style={{ marginBottom: 12 }}>How these figures are derived</div>
						{data.methodology?.approach && <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--a-muted)', lineHeight: 1.5 }}>{data.methodology.approach}</p>}
						{g && (
							<div style={{ fontSize: 12, color: 'var(--a-muted)', display: 'grid', gap: 4, marginBottom: 12 }}>
								<span><strong style={{ color: 'var(--a-ink)' }}>Grounded (from our dataset):</strong> {usd(g.total_funding_usd)} raised · {g.funded_companies ?? 0} funded of {g.companies_tracked ?? 0} companies · {g.deals ?? 0} deals{g.funding_cagr_pct != null ? ` · funding CAGR ${g.funding_cagr_pct}%` : ''}.</span>
							</div>
						)}
						{(data.methodology?.assumptions?.length ?? 0) > 0 && (
							<div style={{ marginBottom: 10 }}>
								<div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Assumptions</div>
								<ul style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 4 }}>{data.methodology!.assumptions!.map((a, i) => <li key={i} style={{ fontSize: 12, color: 'var(--a-muted)', lineHeight: 1.5 }}>{a}</li>)}</ul>
							</div>
						)}
						<div style={{ fontSize: 11, color: 'var(--a-faint)', marginTop: 8 }}>TAM/SAM are estimates; funding, competitor counts and CAGR are computed from SportsTechX data.</div>
					</Card>
				</div>
			) : (
				<div style={{ marginTop: 27 }}>
					{competitors.length === 0 ? <Empty>No competitors mapped yet.</Empty> : (
						<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
							{competitors.map((c) => (
								<div key={c.id} className="atlas-card atlas-entity-card" style={{ minHeight: 120 }}>
									<div className="atlas-entity-card__head" style={{ marginBottom: 12 }}>
										<Logo co={{ name: c.name, website: c.website, custom_logo_url: c.custom_logo_url }} size={62} radius={9} />
										<div style={{ minWidth: 0, paddingTop: 11 }}>
											<div className="atlas-entity-card__name">{c.name}</div>
											{c.hq_country && <div className="atlas-entity-card__meta"><Flag cc={c.hq_country} size={11} />{c.hq_country}</div>}
										</div>
									</div>
									<div className="atlas-entity-card__actions" style={{ fontFamily: 'var(--a-mono)', fontSize: 10, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--a-muted)' }}>{c.funding}</div>
								</div>
							))}
						</div>
					)}
				</div>
			)}
		</>
	);
}

function Kpi({ label, value, note }: { label: string; value: string; note?: string }) {
	return (
		<div className="atlas-kpi">
			<div className="atlas-kpi__label">{label}</div>
			<div className="atlas-kpi__value">{value}</div>
			<div className="atlas-kpi__note">{note}</div>
		</div>
	);
}
