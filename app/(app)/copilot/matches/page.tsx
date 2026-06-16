'use client';

import { useState } from 'react';
import { Check, Send } from 'lucide-react';
import { Page } from '@/components/ui/atoms';
import { WorkspaceHeader, FitBar } from '@/components/copilot/workspace-ui';

/**
 * FounderMatches (f-matches) — ported from ui_design/app/copilot-screens.jsx.
 * Demo-grade sample data; there is no backend for investor-fit scoring yet.
 */

type Kind = 'warm' | 'cold' | 'existing';

interface Match {
	name: string;
	type: string;
	focus: string;
	city: string;
	fit: number;
	why: string[];
	kind: Kind;
}

const MATCHES: Match[] = [
	{ name: 'Verance Capital', type: 'VC · Series B lead', focus: 'Fan engagement', city: 'New York', fit: 94, why: ['Fan engagement', 'Series B', 'Led 3 comps'], kind: 'warm' },
	{ name: 'Courtside Ventures', type: 'VC · Sports specialist', focus: 'Sports-tech', city: 'New York', fit: 91, why: ['Sports-tech focus', '€5–15M checks'], kind: 'warm' },
	{ name: 'Elysian Park', type: 'VC · Growth', focus: 'Media & fan', city: 'Los Angeles', fit: 88, why: ['Media & fan', 'US + EU'], kind: 'cold' },
	{ name: 'Sapphire Sport', type: 'VC · Thesis fit', focus: 'Fan platforms', city: 'New York', fit: 85, why: ['Fan platforms', 'Lead or co-lead'], kind: 'cold' },
	{ name: 'KB Partners', type: 'VC · Early growth', focus: 'Sports & fitness', city: 'Chicago', fit: 83, why: ['Sports & fitness', 'Series A–B'], kind: 'cold' },
	{ name: 'Drive by DraftKings', type: 'CVC · Strategic', focus: 'Fan & betting', city: 'Boston', fit: 80, why: ['Strategic fit', 'Fan data'], kind: 'cold' },
	{ name: 'Seedcamp', type: 'VC · Existing investor', focus: 'Seed → A', city: 'London', fit: 78, why: ['On cap table', 'Seed lead'], kind: 'existing' },
	{ name: 'Speedinvest', type: 'VC · Existing investor', focus: 'Series A', city: 'Vienna', fit: 75, why: ['On cap table', 'Series A'], kind: 'existing' },
];

const TABS: Array<{ id: 'all' | Kind; label: string }> = [
	{ id: 'all', label: 'All matches' },
	{ id: 'warm', label: 'Warm intros' },
	{ id: 'cold', label: 'Available' },
	{ id: 'existing', label: 'Existing' },
];

export default function FounderMatchesPage() {
	const [tab, setTab] = useState<'all' | Kind>('all');
	const count = (id: 'all' | Kind) => (id === 'all' ? MATCHES.length : MATCHES.filter((m) => m.kind === id).length);
	const rows = tab === 'all' ? MATCHES : MATCHES.filter((m) => m.kind === tab);

	return (
		<Page>
			<WorkspaceHeader
				eyebrow="Fundraising Copilot · Investors"
				title="Investor matches"
				sub="42 funds ranked against Hoopers's stage, sector and geography — warmest paths first."
			/>

			<div className="cp-tabs">
				{TABS.map((t) => (
					<button key={t.id} className={`cp-tab ${tab === t.id ? 'on' : ''}`} onClick={() => setTab(t.id)}>
						{t.label}<span className="cp-tab-n">{count(t.id)}</span>
					</button>
				))}
			</div>

			<div className="card match-list-lg">
				<div className="match-list">
					{rows.map((m) => (
						<div key={m.name} className="match-row match-row-page">
							<div className="match-main">
								<div className="match-name">{m.name}</div>
								<div className="match-sub">{m.type} · {m.focus} · {m.city}</div>
								<div className="match-why">{m.why.map((w) => <span key={w} className="match-chip">{w}</span>)}</div>
							</div>
							<div className="match-fit match-fit-page">
								<div className="match-fit-num">{m.fit}<span>%</span></div>
								<FitBar pct={m.fit} />
								<div className="match-fit-lbl">fit</div>
							</div>
							<div className="match-cta">
								{m.kind === 'existing' ? (
									<button className="btn ghost" disabled><Check size={12} /> On your cap table</button>
								) : m.kind === 'warm' ? (
									<button className="btn"><Send size={12} /> Request warm intro</button>
								) : (
									<button className="btn ghost"><Send size={12} /> Request intro</button>
								)}
							</div>
						</div>
					))}
				</div>
			</div>
		</Page>
	);
}
