'use client';

import { useRouter } from 'next/navigation';
import { ArrowRight, Heart, DollarSign, Bell, Shield } from 'lucide-react';
import { Stat, SectionHead } from '@/components/ui/atoms';
import { WorkspaceHeader, FitBar } from './workspace-ui';
import { genSpark } from './workspace-charts';

/**
 * InvestorHome — the Dealflow Copilot home (persona = investor). Ported from
 * ui_design/app/copilot.jsx `InvestorHome`. Demo-grade sample data (no backend
 * for thesis-fit scoring or the daily digest yet).
 */

const INVESTOR_BLUE = 'oklch(62% 0.20 255)';

const SOURCED = [
	{ name: 'Hoopers', note: 'Series B · fan engagement · London', fit: 92, badges: ['NEW', 'Raising'] },
	{ name: 'SportsVisio', note: 'Seed · performance AI · Boston', fit: 89, badges: ['NEW'] },
	{ name: 'Pressbox Studio', note: 'Series A · media · Berlin', fit: 86, badges: ['Raising'] },
	{ name: 'Tempo Health', note: 'Seed · recovery · Amsterdam', fit: 83, badges: [] },
	{ name: 'Courtline', note: 'Series A · venue tech · Madrid', fit: 81, badges: [] },
];

const DIGEST: Array<{ kind: 'match' | 'funding' | 'signal' | 'exit'; text: string; meta: string }> = [
	{ kind: 'match', text: '3 new companies match your thesis', meta: 'incl. Hoopers · Series B' },
	{ kind: 'funding', text: 'SportsVisio opened a Seed round', meta: '$4M target · matched mandate' },
	{ kind: 'signal', text: 'Fan-engagement capital +31% YoY', meta: 'your core sector' },
	{ kind: 'exit', text: 'Two exits in performance-AI this month', meta: 'avg $180M disclosed' },
];

const DIGEST_ICON = {
	match: { Icon: Heart, cls: 'cp-digest-match' },
	funding: { Icon: DollarSign, cls: 'cp-digest-funding' },
	signal: { Icon: Bell, cls: 'cp-digest-signal' },
	exit: { Icon: Shield, cls: 'cp-digest-exit' },
} as const;

export function InvestorHome() {
	const router = useRouter();
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
					<SectionHead title="Startups that fit your thesis" meta="ranked by fit" action={<button className="btn ghost" onClick={() => router.push('/copilot/sourcing')}>View all <ArrowRight size={12} /></button>} />
					<div className="match-list">
						{SOURCED.map((s) => (
							<div key={s.name} className="match-row">
								<div className="match-main">
									<div className="match-name">
										{s.name}
										{s.badges.includes('NEW') && <span className="src-new">NEW</span>}
										{s.badges.includes('Raising') && <span className="src-raising">RAISING</span>}
									</div>
									<div className="match-sub">{s.note}</div>
								</div>
								<div className="match-fit">
									<div className="match-fit-num">{s.fit}<span>%</span></div>
									<FitBar pct={s.fit} color={INVESTOR_BLUE} />
								</div>
							</div>
						))}
					</div>
				</div>

				<div className="card">
					<SectionHead title="Your daily digest" meta="today" />
					<div className="cp-digest">
						{DIGEST.map((d, i) => {
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
				</div>
			</div>
		</>
	);
}
