'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { ArrowRight, Check, Lock, Loader2, FileText, Users, MessageSquare } from 'lucide-react';
import { Page } from '@/components/ui/atoms';
import { useUserProfile } from '@/hooks/use-user-profile';
import { qk } from '@/lib/query-keys';

/**
 * Atlas Raise — Home (Notion "2. Home page structure"): header + What Needs Your
 * Attention (main column) + Raise Snapshot & Strategy Session (side column).
 * Reads GET /api/raise/home. A founder who hasn't finished setup is sent to the wizard.
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

	// First-login: no raise yet → straight to the setup wizard.
	useEffect(() => { if (data && data.needs_setup && !data.raise) router.replace('/raise/setup'); }, [data, router]);

	if (isLoading || !data) return <Page><Center><Loader2 className="spin" size={22} /></Center></Page>;
	if (data.needs_setup && !data.raise) return <Page><Center><Loader2 className="spin" size={22} /></Center></Page>;

	const r = data.raise;
	const greetName = profile?.display_name?.split(' ')[0] ?? profile?.full_name?.split(' ')[0] ?? 'there';
	const committedPct = r && r.target_amount && Number(r.target_amount) > 0
		? Math.min(100, Math.round((Number(r.committed_amount ?? 0) / Number(r.target_amount)) * 100)) : 0;

	return (
		<Page>
			{/* Header */}
			<div style={{ marginBottom: 'var(--space-5)' }}>
				<h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 10px' }}>Good day, {greetName}</h1>
				{r && (
					<div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', fontSize: 14, color: 'var(--fg-2)' }}>
						<Chip>{r.round_type ? r.round_type.replace('_', ' ') : 'Round'}</Chip>
						<Chip>{money(r.target_amount, r.currency_code)} target</Chip>
						<Chip>{money(r.committed_amount, r.currency_code)} committed</Chip>
						{r.target_close_date && <Chip>Close: {new Date(r.target_close_date).toLocaleDateString(undefined, { day: 'numeric', month: 'long' })}</Chip>}
						<span style={{ padding: '3px 10px', borderRadius: 20, background: 'var(--accent)', color: '#fff', fontSize: 12, fontWeight: 600 }}>{STAGE_LABEL[r.stage] ?? r.stage}</span>
						{r.momentum && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fg-muted)' }}>Momentum: {r.momentum}</span>}
					</div>
				)}
				{r && r.target_amount && (
					<div style={{ marginTop: 14, maxWidth: 420 }}>
						<div style={{ height: 6, background: 'var(--bg-2)', borderRadius: 3, overflow: 'hidden' }}>
							<div style={{ width: `${committedPct}%`, height: '100%', background: 'var(--accent)' }} />
						</div>
						<div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 5 }}>{committedPct}% of target committed — capital progress, not overall completion</div>
					</div>
				)}
			</div>

			<div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(260px, 1fr)', gap: 'var(--space-4)', alignItems: 'start' }}>
				{/* What Needs Your Attention */}
				<div>
					<SideLabel>What needs your attention</SideLabel>
					<div style={{ display: 'grid', gap: 12 }}>
						{data.attention.length === 0
							? <div className="card" style={{ padding: 20, color: 'var(--fg-muted)', fontSize: 14 }}>You’re all caught up. Keep your pipeline moving.</div>
							: data.attention.map((a) => (
								<div key={a.id} className="card" style={{ padding: 20 }}>
									<div style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 700, marginBottom: 6 }}>{a.title}</div>
									<div style={{ fontSize: 14, color: 'var(--fg-2)', lineHeight: 1.55, marginBottom: 14 }}>{a.why}</div>
									<Link href={a.cta_href} className="btn">{a.cta_label} <ArrowRight size={13} /></Link>
								</div>
							))}
					</div>
				</div>

				{/* Side column */}
				<div style={{ display: 'grid', gap: 'var(--space-4)' }}>
					<div className="card" style={{ padding: 18 }}>
						<SideLabel>Raise snapshot</SideLabel>
						<SnapRow icon={<FileText size={15} />} label="Pitch deck" href="/raise/pitch-deck"
							value={data.snapshot.deck ? (data.snapshot.deck.score != null ? `${data.snapshot.deck.score}/100 · ${data.snapshot.deck.status}` : data.snapshot.deck.status) : 'Not analysed'} />
						<SnapRow icon={<Users size={15} />} label="Investors in pipeline" href="/raise/pipeline" value={String(data.snapshot.pipeline_count)} />
						<SnapRow icon={<MessageSquare size={15} />} label="Active conversations" href="/raise/pipeline" value={String(data.snapshot.active_conversations)} last />
					</div>

					<div className="card" style={{ padding: 18 }}>
						<SideLabel>Strategy session</SideLabel>
						{data.strategy.status === 'booked' ? (
							<>
								<div style={{ fontWeight: 600, marginBottom: 4 }}>Session booked</div>
								<div style={{ fontSize: 13, color: 'var(--fg-2)' }}>{data.strategy.scheduled_at ? new Date(data.strategy.scheduled_at).toLocaleString() : ''}</div>
							</>
						) : data.strategy.status === 'available' ? (
							<>
								<div style={{ fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.5, marginBottom: 12 }}>Use your quarterly session to pressure-test the raise and plan what to do next.</div>
								<Link href="/raise/strategy" className="btn">Book your call <ArrowRight size={13} /></Link>
							</>
						) : (
							<>
								<div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--fg-muted)', marginBottom: 10 }}><Lock size={12} /> Unlock by completing:</div>
								<div style={{ display: 'grid', gap: 7 }}>
									{data.strategy.steps.map((s) => (
										<div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: s.done ? 'var(--fg)' : 'var(--fg-muted)' }}>
											{s.done ? <Check size={14} color="var(--accent)" /> : <span style={{ width: 14, height: 14, borderRadius: '50%', border: '1.5px solid var(--border)', display: 'inline-block' }} />}
											{s.label}
										</div>
									))}
								</div>
								<div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 10 }}>{data.strategy.steps.filter((s) => s.done).length} of {data.strategy.steps.length} complete</div>
							</>
						)}
					</div>
				</div>
			</div>
		</Page>
	);
}

function Center({ children }: { children: React.ReactNode }) { return <div style={{ display: 'grid', placeItems: 'center', minHeight: 320 }}>{children}</div>; }
function Chip({ children }: { children: React.ReactNode }) { return <span style={{ padding: '3px 10px', borderRadius: 20, background: 'var(--bg-2)', fontSize: 13, textTransform: 'capitalize' }}>{children}</span>; }
function SideLabel({ children }: { children: React.ReactNode }) { return <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--fg-muted)', marginBottom: 12 }}>{children}</div>; }
function SnapRow({ icon, label, value, href, last }: { icon: React.ReactNode; label: string; value: string; href: string; last?: boolean }) {
	return (
		<Link href={href} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '10px 0', borderBottom: last ? 'none' : '1px solid var(--border)', textDecoration: 'none', color: 'inherit' }}>
			<span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--fg-2)', fontSize: 13 }}>{icon} {label}</span>
			<span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600 }}>{value}</span>
		</Link>
	);
}
