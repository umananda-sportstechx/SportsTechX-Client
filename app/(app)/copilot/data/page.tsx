'use client';

import { useState } from 'react';
import { FileText, Code } from 'lucide-react';
import { Page, SectionHead } from '@/components/ui/atoms';
import { WorkspaceHeader } from '@/components/copilot/workspace-ui';

/**
 * InvestorData (i-data) — pipe matched dealflow into the user's stack. The API
 * key + usage figures are sample; the CRM toggles are local UI state.
 */

const EXPORTS = ['Matched dealflow · CSV', 'Full portfolio · XLSX', 'Market maps · JSON'];

const FEEDS = [
	{ name: 'Salesforce', desc: 'New matches → CRM as leads', on: true },
	{ name: 'Affinity', desc: 'Sync tracked companies + notes', on: true },
	{ name: 'Notion', desc: 'Push diligence memos to a database', on: false },
];

export default function InvestorDataPage() {
	const [revealed, setRevealed] = useState(false);
	const [feeds, setFeeds] = useState(FEEDS.map((f) => f.on));
	const key = revealed ? 'stx_live_3f9c8b2d4e7a1f6h9k3m5n8p2q4r6s8t' : 'stx_live_••••••••••••••••••••••••';

	return (
		<Page>
			<WorkspaceHeader
				eyebrow="Dealflow Copilot · Data & API"
				title="Data & API"
				sub="Pipe matched dealflow and the underlying database straight into your stack."
			/>

			<div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16, marginBottom: 'var(--space-5)' }}>
				<div className="card">
					<SectionHead title="API access" meta="Pro" />
					<div style={{ padding: 'var(--space-4)' }}>
						<div className="co-stat-label" style={{ marginBottom: 8 }}>Personal API key</div>
						<div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
							<input className="search-input" style={{ flex: 1, fontFamily: 'var(--font-mono)' }} value={key} readOnly />
							<button className="btn ghost" onClick={() => setRevealed((v) => !v)}>{revealed ? 'Hide' : 'Reveal'}</button>
						</div>
						<div className="cp-api-grid">
							<div><b>2.4k</b><span>calls today</span></div>
							<div><b>50k</b><span>monthly limit</span></div>
							<div><b>v2</b><span>API version</span></div>
						</div>
					</div>
				</div>

				<div className="card">
					<SectionHead title="Exports" />
					<div style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 10 }}>
						{EXPORTS.map((e) => (
							<button key={e} className="btn ghost cp-export"><FileText size={14} /> {e}</button>
						))}
					</div>
				</div>
			</div>

			<div className="card">
				<SectionHead title="CRM sync feed" meta="live" />
				<div style={{ padding: '0 var(--space-3) var(--space-3)' }}>
					{FEEDS.map((f, i) => (
						<div key={f.name} className="cp-feed-row">
							<div className="cp-feed-ico"><Code size={15} /></div>
							<div style={{ flex: 1, minWidth: 0 }}>
								<div style={{ fontWeight: 600, fontSize: 14 }}>{f.name}</div>
								<div style={{ fontSize: 11.5, color: 'var(--fg-muted)' }}>{f.desc}</div>
							</div>
							<button
								type="button"
								className={`cp-toggle ${feeds[i] ? 'on' : ''}`}
								aria-pressed={feeds[i]}
								onClick={() => setFeeds((prev) => prev.map((v, j) => (j === i ? !v : v)))}
							>
								<span />
							</button>
						</div>
					))}
				</div>
			</div>
		</Page>
	);
}
