'use client';

import useSWR from 'swr';
import { FileText, Upload } from 'lucide-react';
import { qk } from '@/lib/query-keys';
import { Page, SectionHead, Tag, Flag, Empty } from '@/components/ui/atoms';
import { WorkspaceHeader, FitBar } from '@/components/copilot/workspace-ui';
import { ScoreRing } from '@/components/copilot/workspace-charts';

/**
 * FounderToolkit (f-toolkit) — deck evaluator (sample scoring) + accelerator /
 * grant matcher (wired to the real programs endpoint).
 */

interface ProgramEntity {
	id: string; name: string; status?: string | null;
	hq_city?: string | null; hq_country?: string | null;
	investment_label?: string | null; duration_label?: string | null;
}
interface ProgramsResponse { data: ProgramEntity[] }

const DECK_CATEGORIES = [
	{ label: 'Problem & market', score: 88 },
	{ label: 'Traction', score: 84 },
	{ label: 'Team', score: 80 },
	{ label: 'Business model', score: 72 },
	{ label: 'Ask & use of funds', score: 66 },
];

const scoreColor = (s: number) => (s >= 80 ? 'var(--pos)' : s >= 70 ? 'oklch(70% 0.16 60)' : 'var(--neg)');

export default function FounderToolkitPage() {
	const { data } = useSWR<ProgramsResponse>(qk.ecosystem.listByType('program', { limit: 5 }), { dedupingInterval: 5 * 60_000 });
	const programs = data?.data ?? [];

	return (
		<Page>
			<WorkspaceHeader
				eyebrow="Fundraising Copilot · Toolkit"
				title="Raise toolkit"
				sub="The tools that turn a stack of data into a fundable raise — deck evaluator, accelerator and grant matcher."
			/>

			<div className="grid-2">
				<div className="card">
					<SectionHead title="Deck evaluator" meta="last upload · 2 days ago" />
					<div style={{ padding: 'var(--space-4)' }}>
						<div style={{ display: 'flex', gap: 20, alignItems: 'center', marginBottom: 16 }}>
							<ScoreRing score={78} />
							<div style={{ flex: 1, minWidth: 0 }}>
								{DECK_CATEGORIES.map((c) => (
									<div key={c.label} className="bm-row">
										<div className="bm-metric" style={{ width: 150 }}>{c.label}</div>
										<div className="bm-bar"><FitBar pct={c.score} color={scoreColor(c.score)} /></div>
										<div className="bm-pct" style={{ color: scoreColor(c.score) }}>{c.score}</div>
									</div>
								))}
							</div>
						</div>
						<div className="cp-upload">
							<FileText size={18} />
							<span>Drop a new deck to re-score, or evaluate a fresh version.</span>
							<button className="btn ghost"><Upload size={12} /> Upload deck</button>
						</div>
					</div>
				</div>

				<div className="card">
					<SectionHead title="Accelerator & grant matcher" meta={`${programs.length} open matches`} />
					<div style={{ padding: 'var(--space-4)' }}>
						{programs.length === 0 ? (
							<Empty msg="No matching programs yet." />
						) : (
							programs.map((p, i) => {
								const loc = [p.hq_city, p.hq_country].filter(Boolean).join(', ');
								const meta = [loc, p.investment_label, p.duration_label].filter(Boolean).join(' · ');
								const open = (p.status ?? '').toLowerCase() === 'open';
								return (
									<div key={p.id} className="cp-prog cp-prog-lg">
										<span className="cp-prog-dot" style={{ background: PROG_COLORS[i % PROG_COLORS.length] }} />
										<div style={{ flex: 1, minWidth: 0 }}>
											<div className="cp-prog-name">{p.name}</div>
											<div className="cp-prog-meta">
												{p.hq_country && <Flag cc={countryCode(p.hq_country)} />}
												{meta || '—'}
											</div>
										</div>
										<Tag variant={open ? 'pos' : ''}>{p.status ? capitalize(p.status) : 'Open'}</Tag>
									</div>
								);
							})
						)}
					</div>
				</div>
			</div>
		</Page>
	);
}

const PROG_COLORS = ['#A855F7', '#0EA5E9', '#22D3EE', '#15803D', '#F59E0B'];

function capitalize(s: string): string { return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' '); }

function countryCode(name: string): string {
	const map: Record<string, string> = {
		'United States': 'US', USA: 'US', 'United Kingdom': 'GB', UK: 'GB',
		Germany: 'DE', France: 'FR', Italy: 'IT', Spain: 'ES', Netherlands: 'NL',
		Sweden: 'SE', Switzerland: 'CH', India: 'IN', China: 'CN', Japan: 'JP',
		Singapore: 'SG', Australia: 'AU', Brazil: 'BR', Canada: 'CA', Portugal: 'PT',
	};
	return map[name] ?? name.slice(0, 2).toUpperCase();
}
