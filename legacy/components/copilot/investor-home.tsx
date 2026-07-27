'use client';

import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { ArrowRight, Heart, DollarSign, Bell, Shield } from 'lucide-react';
import { Stat, SectionHead } from '@/components/ui/atoms';
import { qk } from '@/lib/query-keys';
import { WorkspaceHeader } from './workspace-ui';
import { genSpark } from './workspace-charts';

/**
 * InvestorHome — the Dealflow Copilot home (persona = investor). Sourced list is
 * live (companies actively raising); the daily digest is composed from recent
 * deals + acquisitions. Stat tiles remain representative pending a thesis-fit
 * scoring backend.
 */

const INVESTOR_BLUE = 'oklch(62% 0.20 255)';

interface CompanyRow { id: string; name: string; slug?: string | null; hq_city?: string | null; hq_country?: string | null; last_round_type?: string | null }
interface CompaniesResponse { data: CompanyRow[] }
interface DealRow { id: string; company_name?: string | null; amount_usd?: number | string | null; round_type_name?: string | null }
interface DealsResponse { data: DealRow[] }
interface AcqRow { id: string; acquiree_name?: string | null; acquirer_name?: string | null; amount_usd?: number | string | null }
interface AcqResponse { data: AcqRow[] }

const DIGEST_ICON = {
	match: { Icon: Heart, cls: 'cp-digest-match' },
	funding: { Icon: DollarSign, cls: 'cp-digest-funding' },
	signal: { Icon: Bell, cls: 'cp-digest-signal' },
	exit: { Icon: Shield, cls: 'cp-digest-exit' },
} as const;

function fmtAmt(v: number | string | null | undefined): string {
	if (v == null) return '$—';
	const n = typeof v === 'string' ? Number(v) : v;
	if (!Number.isFinite(n) || n <= 0) return '$—';
	if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
	if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(0)}M`;
	return `$${(n / 1_000).toFixed(0)}K`;
}

export function InvestorHome() {
	const router = useRouter();
	const { data: comps } = useSWR<CompaniesResponse>(qk.companies.list({ is_actively_raising: true, sort: '-created_at', limit: 5 }), { dedupingInterval: 5 * 60_000 });
	const { data: recentDeals } = useSWR<DealsResponse>(qk.deals.list({ limit: 3, sort: '-announced_date' }), { dedupingInterval: 5 * 60_000 });
	const { data: recentExits } = useSWR<AcqResponse>(qk.acquisitions.list({ limit: 2, sort: '-amount_usd', disclosed_only: true }), { dedupingInterval: 10 * 60_000 });

	const sourced = comps?.data ?? [];
	const digest: Array<{ kind: 'funding' | 'exit'; text: string; meta: string }> = [
		...(recentDeals?.data ?? []).map((d) => ({ kind: 'funding' as const, text: `${d.company_name ?? 'A company'} raised ${fmtAmt(d.amount_usd)}`, meta: d.round_type_name ?? 'Funding round' })),
		...(recentExits?.data ?? []).map((a) => ({ kind: 'exit' as const, text: `${a.acquiree_name ?? 'A company'} acquired by ${a.acquirer_name ?? '—'}`, meta: fmtAmt(a.amount_usd) })),
	];

	return (
		<>
			<WorkspaceHeader
				eyebrow="Dealflow Copilot · Verance Capital"
				title="Today's dealflow, on your thesis."
				sub="The whole ecosystem, filtered to what fits your mandate — matched sourcing, market maps and the intel to move first."
				action={
					<button className="btn" onClick={() => router.push('/copilot/sourcing')}>
						Open sourcing <ArrowRight size={14} />
					</button>
				}
			/>

			<div className="grid-4" style={{ marginBottom: 'var(--space-5)' }}>
				<div className="card feature" style={{ padding: 'var(--space-4)' }}>
					<Stat label="New matches · week" value="17" delta="+5 vs last week" deltaDir="pos" spark={genSpark(8, 17)} sparkColor={INVESTOR_BLUE} />
				</div>
				<div className="card feature" style={{ padding: 'var(--space-4)' }}>
					<Stat label="Active deal alerts" value="6" delta="2 triggered today" deltaDir="pos" spark={genSpark(3, 6)} sparkColor={INVESTOR_BLUE} />
				</div>
				<div className="card feature" style={{ padding: 'var(--space-4)' }}>
					<Stat label="Companies tracked" value="128" delta="+9 this month" deltaDir="pos" spark={genSpark(110, 128)} sparkColor={INVESTOR_BLUE} />
				</div>
				<div className="card feature" style={{ padding: 'var(--space-4)' }}>
					<Stat label="Avg thesis fit" value="84" unit="%" delta="top-of-funnel" deltaDir="pos" spark={genSpark(78, 84)} sparkColor={INVESTOR_BLUE} />
				</div>
			</div>

			<div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 16 }}>
				<div className="card">
					<SectionHead title="Companies raising now" meta="freshest first" action={<button className="btn ghost" onClick={() => router.push('/copilot/sourcing')}>View all <ArrowRight size={12} /></button>} />
					{sourced.length === 0 ? (
						<div style={{ padding: 'var(--space-4)', fontSize: 13, color: 'var(--fg-2)' }}>No companies are flagged as raising right now.</div>
					) : (
						<div className="match-list">
							{sourced.map((s) => {
								const note = [s.last_round_type, [s.hq_city, s.hq_country].filter(Boolean).join(', ')].filter(Boolean).join(' · ');
								return (
									<div key={s.id} className="match-row" role="button" tabIndex={0} onClick={() => router.push(`/companies/${s.slug ?? s.id}`)}>
										<div className="match-main">
											<div className="match-name">{s.name} <span className="src-raising">RAISING</span></div>
											<div className="match-sub">{note || '—'}</div>
										</div>
										<ArrowRight size={14} style={{ color: 'var(--fg-muted)' }} />
									</div>
								);
							})}
						</div>
					)}
				</div>

				<div className="card">
					<SectionHead title="Your daily digest" meta="latest activity" />
					{digest.length === 0 ? (
						<div style={{ padding: 'var(--space-4)', fontSize: 13, color: 'var(--fg-2)' }}>No recent activity on the wire.</div>
					) : (
						<div className="cp-digest">
							{digest.map((d, i) => {
								const { Icon, cls } = DIGEST_ICON[d.kind];
								return (
									<div key={i} className="cp-digest-row">
										<div className={`cp-digest-ico ${cls}`}><Icon size={15} /></div>
										<div>
											<div className="cp-digest-text">{d.text}</div>
											<div className="cp-digest-meta">{d.meta}</div>
										</div>
									</div>
								);
							})}
						</div>
					)}
				</div>
			</div>
		</>
	);
}
