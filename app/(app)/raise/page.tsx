'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { ArrowRight, Check, Lock, Loader2 } from 'lucide-react';
import { useUserProfile } from '@/hooks/use-user-profile';
import { qk } from '@/lib/query-keys';
import { Card, H1, Eyebrow, Badge, Button, Progress } from '@/components/atlas/kit';

/**
 * Atlas Raise — Home (mock-up 03 / Notion "2. Home page structure"): header +
 * What Needs Your Attention (main column) + Raise Snapshot & Strategy Session
 * (side column). Rebuilt on the Atlas kit; data unchanged (GET /api/raise/home).
 */

interface Attention { id: string; title: string; why: string; cta_label: string; cta_href: string; count?: number }
interface Home {
	needs_setup: boolean;
	raise: { round_type: string | null; target_amount: string | null; committed_amount: string | null; currency_code: string | null; target_close_date: string | null; status: string; stage: string; momentum: string | null } | null;
	snapshot: { deck: { score: number | null; status: string } | null; pipeline_count: number; active_conversations: number };
	attention: Attention[];
	strategy: { status: string; scheduled_at: string | null; next_eligible_at: string | null; steps: { label: string; done: boolean }[] };
}

const STAGE_LABEL: Record<string, string> = {
	setting_up: 'Setting up', preparing: 'Preparing', outreach: 'Outreach underway',
	in_conversations: 'In conversations', due_diligence: 'In due diligence',
	closing: 'Closing', funded: 'Funded', paused: 'Paused', closed: 'Closed',
};
const money = (v: string | null, ccy: string | null) => {
	if (v == null) return '—';
	const n = Number(v);
	const sym = ccy === 'USD' ? '$' : ccy === 'GBP' ? '£' : '€';
	return n >= 1_000_000 ? `${sym}${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}m` : `${sym}${n.toLocaleString()}`;
};

export default function RaiseHomePage() {
	const router = useRouter();
	const { data: profile } = useUserProfile();
	const { data, isLoading } = useSWR<Home>(qk.raise.home());

	useEffect(() => { if (data && data.needs_setup && !data.raise) router.replace('/raise/setup'); }, [data, router]);

	if (isLoading || !data || (data.needs_setup && !data.raise)) return <Wrap><Center><Loader2 className="spin" size={22} /></Center></Wrap>;

	const r = data.raise;
	const greetName = profile?.display_name?.split(' ')[0] ?? profile?.full_name?.split(' ')[0] ?? 'there';
	const committedPct = r && r.target_amount && Number(r.target_amount) > 0
		? Math.min(100, Math.round((Number(r.committed_amount ?? 0) / Number(r.target_amount)) * 100)) : 0;

	return (
		<Wrap>
			{/* Header */}
			<div style={{ marginBottom: 20 }}>
				<H1>Good day, {greetName}</H1>
				{r && (
					<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: 12 }}>
						<Badge>{r.round_type ? r.round_type.replace(/_/g, ' ') : 'Round'}</Badge>
						<Badge>{money(r.target_amount, r.currency_code)} target</Badge>
						<Badge>{money(r.committed_amount, r.currency_code)} committed</Badge>
						{r.target_close_date && <Badge>Close: {new Date(r.target_close_date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</Badge>}
					</div>
				)}
			</div>

			{r && r.target_amount && (
				<Card variant="cream" style={{ marginBottom: 20 }}>
					<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
						<span style={{ fontSize: 12, color: 'var(--a-muted)' }}>Capital committed</span>
						<div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
							<Badge tone="navy">Stage: {STAGE_LABEL[r.stage] ?? r.stage}</Badge>
							{r.momentum && <Badge tone="ok">Momentum: {r.momentum}</Badge>}
						</div>
					</div>
					<Progress pct={committedPct} />
					<div style={{ fontSize: 11, color: 'var(--a-faint)', marginTop: 6 }}>
						{money(r.committed_amount, r.currency_code)} of {money(r.target_amount, r.currency_code)} — capital progress, not overall completion
					</div>
				</Card>
			)}

			<div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(280px, 1fr)', gap: 20, alignItems: 'start' }}>
				{/* What Needs Your Attention */}
				<Card focus>
					<div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>What needs your attention</div>
					<div style={{ height: 1, background: 'var(--a-border)', margin: '14px -20px' }} />
					{data.attention.length === 0
						? <div style={{ color: 'var(--a-faint)', fontSize: 14 }}>You’re all caught up. Keep your pipeline moving.</div>
						: data.attention.map((a, i) => (
							<div key={a.id}>
								{i > 0 && <div style={{ height: 1, background: 'var(--a-border)', margin: '18px -20px' }} />}
								<div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }}>
									<div>
										<div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>{a.title}</div>
										<div style={{ fontSize: 13, color: 'var(--a-muted)', lineHeight: 1.5 }}>{a.why}</div>
										{a.count != null && <div style={{ marginTop: 10 }}><Badge tone="danger">{a.count} overdue</Badge></div>}
									</div>
									<Button href={a.cta_href} variant="outline" size="sm">{a.cta_label}</Button>
								</div>
							</div>
						))}
				</Card>

				{/* Side column */}
				<div style={{ display: 'grid', gap: 20 }}>
					<Card variant="cream">
						<div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Raise snapshot</div>
						<div style={{ height: 1, background: 'var(--a-border)', margin: '12px -20px' }} />
						<SnapRow label="Pitch deck" href="/pitch-analyzer"
							value={data.snapshot.deck ? (data.snapshot.deck.score != null ? `${data.snapshot.deck.score}/100 · Reviewed` : 'Processing…') : 'Not analysed'} />
						<SnapRow label="Investors in pipeline" href="/raise/pipeline" value={String(data.snapshot.pipeline_count)} />
						<SnapRow label="Active conversations" href="/raise/pipeline" value={String(data.snapshot.active_conversations)} last />
					</Card>

					<Card variant="cream">
						<div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
							{data.strategy.status === 'booked' ? 'Strategy session booked'
								: data.strategy.status === 'available' ? 'Your strategy session is available'
									: 'Quarterly strategy session'}
						</div>
						{data.strategy.status === 'booked' ? (
							<div style={{ fontSize: 13, color: 'var(--a-muted)' }}>{data.strategy.scheduled_at ? new Date(data.strategy.scheduled_at).toLocaleString() : 'Time to be confirmed'}</div>
						) : data.strategy.status === 'available' ? (
							<>
								<div style={{ fontSize: 13, color: 'var(--a-muted)', lineHeight: 1.5, marginBottom: 14 }}>Use your quarterly session to pressure-test the raise and plan what to do next.</div>
								<Button href="/raise/strategy">Book your call <ArrowRight size={14} /></Button>
							</>
						) : (
							<>
								<div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--a-faint)', margin: '4px 0 12px' }}><Lock size={12} /> Unlock by completing:</div>
								<div style={{ display: 'grid', gap: 8 }}>
									{data.strategy.steps.map((s) => (
										<div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: s.done ? 'var(--a-ink)' : 'var(--a-faint)' }}>
											{s.done ? <Check size={14} color="var(--a-navy)" /> : <span style={{ width: 14, height: 14, borderRadius: '50%', border: '1.5px solid var(--a-border-strong)' }} />}
											{s.label}
										</div>
									))}
								</div>
								<div style={{ fontSize: 11, color: 'var(--a-faint)', marginTop: 10 }}>{data.strategy.steps.filter((s) => s.done).length} of {data.strategy.steps.length} complete</div>
							</>
						)}
					</Card>
				</div>
			</div>
		</Wrap>
	);
}

function Wrap({ children }: { children: React.ReactNode }) { return <div style={{ padding: '32px 40px', maxWidth: 1180 }}>{children}</div>; }
function Center({ children }: { children: React.ReactNode }) { return <div style={{ display: 'grid', placeItems: 'center', minHeight: 320 }}>{children}</div>; }
function SnapRow({ label, value, href, last }: { label: string; value: string; href: string; last?: boolean }) {
	return (
		<Link href={href} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '11px 0', borderBottom: last ? 'none' : '1px solid var(--a-border)', textDecoration: 'none', color: 'inherit' }}>
			<span style={{ color: 'var(--a-muted)', fontSize: 13 }}>{label}</span>
			<span style={{ fontSize: 13, fontWeight: 600 }}>{value}</span>
		</Link>
	);
}
