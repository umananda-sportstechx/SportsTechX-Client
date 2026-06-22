'use client';

import useSWR from 'swr';
import Link from 'next/link';
import { FileText, Upload, ArrowRight } from 'lucide-react';
import { qk } from '@/lib/query-keys';
import { Page, SectionHead, Tag, Flag, Empty } from '@/components/ui/atoms';
import { WorkspaceHeader, FitBar } from '@/components/copilot/workspace-ui';
import { ScoreRing } from '@/components/copilot/workspace-charts';

/**
 * FounderToolkit (f-toolkit) — deck evaluator (wired to the pitch-deck analyzer)
 * + accelerator / grant matcher (wired to the real programs endpoint).
 */

interface ProgramEntity {
	id: string; name: string; status?: string | null;
	hq_city?: string | null; hq_country?: string | null;
	investment_label?: string | null; duration_label?: string | null;
}
interface ProgramsResponse { data: ProgramEntity[] }

interface DeckSection { label: string; score: number | null }
interface DeckRow {
	id: string; status: string; filename: string | null;
	overall_score: number | null; created_at: string;
	result_json: { sections?: DeckSection[] } | null;
}

const scoreColor = (s: number) => (s >= 80 ? 'var(--pos)' : s >= 70 ? 'oklch(70% 0.16 60)' : 'var(--neg)');

export default function FounderToolkitPage() {
	const { data } = useSWR<ProgramsResponse>(qk.ecosystem.listByType('program', { limit: 5 }), { dedupingInterval: 5 * 60_000 });
	const { data: decks } = useSWR<DeckRow[]>(qk.deckAnalysis.list(), { dedupingInterval: 60_000 });
	const programs = data?.data ?? [];

	const latest = (decks ?? []).find((d) => d.status === 'done' && d.overall_score != null) ?? null;
	const categories = (latest?.result_json?.sections ?? [])
		.filter((s) => s.score != null)
		.slice(0, 6)
		.map((s) => ({ label: s.label, score: Math.round((s.score ?? 0) * 10) }));

	return (
		<Page>
			<WorkspaceHeader
				eyebrow="Fundraising Copilot · Toolkit"
				title="Raise toolkit"
				sub="The tools that turn a stack of data into a fundable raise — deck evaluator, accelerator and grant matcher."
			/>

			<div className="grid-2">
				<div className="card">
					<SectionHead
						title="Deck evaluator"
						meta={latest ? `last upload · ${new Date(latest.created_at).toLocaleDateString()}` : 'no decks yet'}
						action={<Link className="btn ghost" href="/pitch-analyzer">Open analyzer <ArrowRight size={12} /></Link>}
					/>
					<div style={{ padding: 'var(--space-4)' }}>
						{!latest ? (
							<div className="cp-upload">
								<FileText size={18} />
								<span>Upload a pitch deck to get an investor-grade score and section-by-section feedback.</span>
								<Link href="/pitch-analyzer" className="btn ghost"><Upload size={12} /> Upload deck</Link>
							</div>
						) : (
							<>
								<div style={{ display: 'flex', gap: 20, alignItems: 'center', marginBottom: 16 }}>
									<ScoreRing score={latest.overall_score ?? 0} />
									<div style={{ flex: 1, minWidth: 0 }}>
										{categories.length === 0 ? (
											<Empty msg="Open the analysis to see the section breakdown." />
										) : categories.map((c) => (
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
									<span>{latest.filename ?? 'Latest deck'} · scored {latest.overall_score}/100.</span>
									<Link href={`/pitch-analyzer/${latest.id}`} className="btn ghost">View analysis <ArrowRight size={12} /></Link>
								</div>
							</>
						)}
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
