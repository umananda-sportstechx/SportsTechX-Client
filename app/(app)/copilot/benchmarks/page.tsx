'use client';

import { Page, SectionHead, Tag } from '@/components/ui/atoms';
import { WorkspaceHeader, FitBar } from '@/components/copilot/workspace-ui';

/**
 * FounderBenchmarks (f-benchmarks) — ported from
 * ui_design/app/copilot-screens.jsx. Demo-grade sample data.
 */

const METRICS = [
	{ metric: 'ARR', you: '$4.2M', cohort: 'vs $3.1M median', pct: 72 },
	{ metric: 'YoY growth', you: '+148%', cohort: 'vs +96% median', pct: 81 },
	{ metric: 'Net revenue retention', you: '124%', cohort: 'vs 111% median', pct: 76 },
	{ metric: 'Burn multiple', you: '1.4x', cohort: 'vs 1.9x median', pct: 68 },
	{ metric: 'Target round size', you: '$25M', cohort: 'vs $18M median', pct: 70 },
];

const COMPETITORS = [
	{ name: 'Fanatiq', stage: 'Series B', loc: 'United States', raised: '$32M' },
	{ name: 'Roar Fan', stage: 'Series A', loc: 'United Kingdom', raised: '$14M' },
	{ name: 'Tifo', stage: 'Series B', loc: 'Germany', raised: '$28M' },
	{ name: 'MatchdayAI', stage: 'Seed', loc: 'Spain', raised: '$6M' },
];

const EXITS = [
	{ target: 'Buzzer', acquirer: 'The Athletic', date: '2025', value: '$95M' },
	{ target: 'Greenfly', acquirer: 'Genius Sports', date: '2025', value: '—' },
	{ target: 'StatMuse', acquirer: 'DAZN', date: '2024', value: '$120M' },
	{ target: 'FanAI', acquirer: 'Endeavor', date: '2024', value: '—' },
];

export default function FounderBenchmarksPage() {
	return (
		<Page>
			<WorkspaceHeader
				eyebrow="Fundraising Copilot · Benchmarks"
				title="Benchmarks"
				sub="Where you sit against the Series B fan-engagement cohort — and the comps investors will pull up in the room."
			/>

			<div className="card" style={{ marginBottom: 'var(--space-5)' }}>
				<SectionHead title="Your metrics vs cohort" meta="Series B · fan engagement · n=34" />
				<div style={{ padding: 'var(--space-4)' }}>
					{METRICS.map((b) => (
						<div key={b.metric} className="bm-row bm-row-lg">
							<div className="bm-metric">{b.metric}</div>
							<div className="bm-vals"><b>{b.you}</b><span>{b.cohort}</span></div>
							<div className="bm-bar"><FitBar pct={b.pct} /></div>
							<div className="bm-pct">{b.pct}<small>pct</small></div>
						</div>
					))}
				</div>
			</div>

			<div className="grid-2">
				<div className="card">
					<SectionHead title="Competitor benchmarking" meta="same sub-sector" />
					<table className="data-table">
						<thead>
							<tr><th>Company</th><th>Stage</th><th>Location</th><th style={{ textAlign: 'right' }}>Raised</th></tr>
						</thead>
						<tbody>
							{COMPETITORS.map((c) => (
								<tr key={c.name}>
									<td style={{ fontWeight: 700 }}>{c.name}</td>
									<td><Tag variant="pos">{c.stage}</Tag></td>
									<td>{c.loc}</td>
									<td className="num" style={{ textAlign: 'right', fontWeight: 700 }}>{c.raised}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>

				<div className="card">
					<SectionHead title="Exit comps" meta="recent M&A in sector" />
					<table className="data-table">
						<thead>
							<tr><th>Target</th><th>Acquirer</th><th>Date</th><th style={{ textAlign: 'right' }}>Value</th></tr>
						</thead>
						<tbody>
							{EXITS.map((e) => (
								<tr key={e.target}>
									<td style={{ fontWeight: 700 }}>{e.target}</td>
									<td style={{ color: 'var(--fg-muted)' }}>{e.acquirer}</td>
									<td className="num">{e.date}</td>
									<td className="num" style={{ textAlign: 'right', fontWeight: 700 }}>{e.value}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>
		</Page>
	);
}
