'use client';

import { Code, Building2 } from 'lucide-react';
import { Page, SectionHead, Flag } from '@/components/ui/atoms';
import { WorkspaceHeader, FitBar } from '@/components/copilot/workspace-ui';
import { ScoreRing } from '@/components/copilot/workspace-charts';

/**
 * InvestorDiligence (i-diligence) — auto-drafted diligence memo. Demo-grade
 * sample data (no diligence-scoring backend yet).
 */

const INVESTOR_BLUE = 'oklch(62% 0.20 255)';

const SECTIONS = [
	{ label: 'Team', score: 86, note: 'Repeat founder, ex-fan-platform; complete C-suite with two prior exits.' },
	{ label: 'Market', score: 82, note: 'Fan-engagement TAM expanding; clear pull from rights holders and clubs.' },
	{ label: 'Traction', score: 84, note: '$4.2M ARR, +148% YoY, 124% net revenue retention across 40+ teams.' },
	{ label: 'Competitive moat', score: 74, note: 'Data network effects forming; some overlap with incumbents on distribution.' },
	{ label: 'Risk flags', score: 68, note: 'Concentration in two leagues; hardware dependency on partner roadmaps.' },
];

const overall = Math.round(SECTIONS.reduce((s, x) => s + x.score, 0) / SECTIONS.length);
const scoreColor = (s: number) => (s >= 80 ? 'var(--pos)' : s >= 70 ? 'oklch(70% 0.16 60)' : 'var(--neg)');

export default function InvestorDiligencePage() {
	return (
		<Page>
			<WorkspaceHeader
				eyebrow="Dealflow Copilot · Diligence"
				title="Diligence copilot"
				sub="A diligence memo drafted from STX data — review, edit and export to your CRM or IC deck."
			/>

			<div style={{ marginBottom: 'var(--space-4)', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-2)', fontSize: 12.5, color: 'var(--fg-2)' }}>
				<b>Illustrative preview.</b> The auto-drafted diligence memo is coming soon — the scores below are sample data.
			</div>

			<div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 16 }}>
				<div className="card" style={{ padding: 'var(--space-4)' }}>
					<div className="cp-mini-head"><Building2 size={16} /> Subject</div>
					<div className="cp-dd-co">
						<div style={{ width: 48, height: 48, background: INVESTOR_BLUE, color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 800 }}>HO</div>
						<div>
							<div className="cp-co-name">Hoopers</div>
							<div className="cp-co-meta"><Flag cc="GB" /> London, UK · Series B</div>
						</div>
					</div>
					<div className="cp-dd-overall">
						<ScoreRing score={overall} label="memo" color={INVESTOR_BLUE} />
					</div>
					<p style={{ fontSize: 12, color: 'var(--fg-2)', lineHeight: 1.5, marginBottom: 14 }}>
						Composite diligence score across five sections. 82% of fields auto-filled from STX data.
					</p>
					<button className="btn ghost cp-full"><Code size={12} /> Export memo</button>
				</div>

				<div className="card">
					<SectionHead title="Memo sections" meta="auto-drafted · editable" />
					<div style={{ padding: 'var(--space-4)' }}>
						{SECTIONS.map((s) => (
							<div key={s.label} className="cp-dd-section">
								<div className="cp-dd-sec-top">
									<span className="cp-dd-sec-label">{s.label}</span>
									<span className="cp-dd-sec-score" style={{ color: scoreColor(s.score) }}>{s.score}</span>
								</div>
								<FitBar pct={s.score} color={scoreColor(s.score)} />
								<div className="cp-dd-sec-note">{s.note}</div>
							</div>
						))}
					</div>
				</div>
			</div>
		</Page>
	);
}
