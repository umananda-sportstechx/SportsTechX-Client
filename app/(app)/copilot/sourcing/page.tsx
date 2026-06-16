'use client';

import { Search, Bell, Plus } from 'lucide-react';
import { Page, SectionHead } from '@/components/ui/atoms';
import { WorkspaceHeader, FitBar } from '@/components/copilot/workspace-ui';

/**
 * InvestorSourcing (i-sourcing) — ported from
 * ui_design/app/copilot-screens.jsx. Demo-grade sample data.
 */

const INVESTOR_BLUE = 'oklch(62% 0.20 255)';

const SOURCED = [
	{ name: 'Hoopers', note: 'Series B · fan engagement · London', fit: 92, badges: ['NEW', 'Raising'] },
	{ name: 'SportsVisio', note: 'Seed · performance AI · Boston', fit: 89, badges: ['NEW'] },
	{ name: 'Pressbox Studio', note: 'Series A · media · Berlin', fit: 86, badges: ['Raising'] },
	{ name: 'Tempo Health', note: 'Seed · recovery · Amsterdam', fit: 83, badges: [] },
	{ name: 'Courtline', note: 'Series A · venue tech · Madrid', fit: 81, badges: [] },
	{ name: 'Rally', note: 'Seed · community · Toronto', fit: 78, badges: ['NEW'] },
];

const SEARCHES = [
	{ name: 'Fan-engagement · Series A–B · EU', count: 14, alert: true },
	{ name: 'Performance AI · Seed', count: 9, alert: true },
	{ name: 'Recovery & wellness · global', count: 21, alert: false },
];

const ALERTS = [
	'SportsVisio opened a Seed round',
	'Pressbox Studio flagged as raising',
];

export default function InvestorSourcingPage() {
	return (
		<Page>
			<WorkspaceHeader
				eyebrow="Dealflow Copilot · Sourcing"
				title="Sourcing"
				sub="Startups matched to Verance Capital's thesis, freshest first. Deal alerts fire the moment a fit starts raising."
			/>

			<div style={{ display: 'grid', gridTemplateColumns: '1.7fr 1fr', gap: 16 }}>
				<div className="card match-list-lg">
					<SectionHead title="Matched startups" meta="ranked by thesis fit" />
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

				<div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
					<div className="card">
						<SectionHead title="Saved searches" action={<button className="btn ghost"><Plus size={12} /> New</button>} />
						<div style={{ padding: 'var(--space-4)' }}>
							{SEARCHES.map((s) => (
								<div key={s.name} className="cp-search-row">
									<Search size={15} />
									<div style={{ flex: 1, minWidth: 0 }}>
										<div className="cp-search-name">{s.name}</div>
										<div className="cp-search-meta">{s.count} companies · alert {s.alert ? 'on' : 'off'}</div>
									</div>
									{s.alert && <Bell size={14} className="cp-bell-on" />}
								</div>
							))}
						</div>
					</div>

					<div className="card cp-alert-card">
						<SectionHead title="Deal alerts" meta="2 triggered today — both match your active mandate." />
						<div style={{ padding: '0 var(--space-4) var(--space-3)' }}>
							{ALERTS.map((a) => (
								<div key={a} className="cp-alert"><span className="src-new">NEW</span>{a}</div>
							))}
						</div>
					</div>
				</div>
			</div>
		</Page>
	);
}
