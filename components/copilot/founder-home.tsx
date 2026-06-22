'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import useSWR from 'swr';
import { ArrowRight, Sparkles, Zap, Building2, Heart } from 'lucide-react';
import { Stat, SectionHead, Tag } from '@/components/ui/atoms';
import { qk } from '@/lib/query-keys';
import { WorkspaceHeader, FitBar } from './workspace-ui';
import { ScoreRing, MiniBars, genSpark } from './workspace-charts';

interface InvestorMatch { id: string; name: string; slug: string | null; category: string | null; score: number; match_reasons: string[] }
interface MatchResponse { company: { id: string; name: string } | null; results: InvestorMatch[] }
interface DeckRow { status: string; overall_score: number | null }

/**
 * FounderHome — the Fundraising Copilot home (persona = founder). Ported from
 * ui_design/app/copilot.jsx `FounderHome`. Persona screens are demo-grade: the
 * raise / match / benchmark figures are representative sample data (there is no
 * backend for investor-fit scores or raise progress yet).
 */

const BENCHMARKS = [
	{ metric: 'ARR', you: '$4.2M', cohort: 'vs $3.1M median', pct: 72 },
	{ metric: 'YoY growth', you: '+148%', cohort: 'vs +96% median', pct: 81 },
	{ metric: 'Net revenue retention', you: '124%', cohort: 'vs 111% median', pct: 76 },
	{ metric: 'Burn multiple', you: '1.4x', cohort: 'vs 1.9x median', pct: 68 },
	{ metric: 'Target round size', you: '$25M', cohort: 'vs $18M median', pct: 70 },
];

const PROGRAMS = [
	{ name: 'Techstars Sports', meta: 'New York · $120K · 13 wks', color: '#A855F7' },
	{ name: 'leAD Sports', meta: 'Berlin · €100K · 6 mo', color: '#0EA5E9' },
	{ name: 'Stadia Ventures', meta: 'St. Louis · $100K · 14 wks', color: '#22D3EE' },
];

export function FounderHome() {
	const router = useRouter();
	const { data: matchData } = useSWR<MatchResponse>(qk.investorMatches(4));
	const { data: decks } = useSWR<DeckRow[]>(qk.deckAnalysis.list(), { dedupingInterval: 60_000 });
	const matches = matchData?.results ?? [];
	const hasCompany = !!matchData?.company;
	const deckScore = (decks ?? []).find((d) => d.status === 'done' && d.overall_score != null)?.overall_score ?? null;
	return (
		<>
			<WorkspaceHeader
				eyebrow="Fundraising Copilot · Hoopers"
				title="Your Series B, in motion."
				sub="Everything we track on the ecosystem, focused on closing your round — matched investors, warm paths, benchmarks and the market climate around you."
				action={
					<button className="btn" onClick={() => router.push('/copilot/matches')}>
						Find investors <ArrowRight size={14} />
					</button>
				}
			/>

			<div className="grid-4" style={{ marginBottom: 'var(--space-5)' }}>
				<div className="card feature" style={{ padding: 'var(--space-4)' }}>
					<Stat label="Investor matches" value={hasCompany ? String(matches.length) : '—'} delta={hasCompany ? 'ranked by fit' : 'claim your company'} deltaDir="pos" spark={genSpark(36, 42)} />
				</div>
				<div className="card feature" style={{ padding: 'var(--space-4)' }}>
					<Stat label="Warm intro paths" value="11" delta="4 not yet asked" deltaDir="pos" spark={genSpark(6, 11)} />
				</div>
				<div className="card feature" style={{ padding: 'var(--space-4)' }}>
					<Stat label="Benchmark rank" value="Top 18%" delta="vs Series B cohort" deltaDir="pos" spark={genSpark(70, 82)} />
				</div>
				<div className="card feature" style={{ padding: 'var(--space-4)' }}>
					<Stat label="Days in market" value="24" delta="Median 96" deltaDir="pos" spark={genSpark(0, 24)} />
				</div>
			</div>

			<div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 16, marginBottom: 'var(--space-5)' }}>
				<div className="card">
					<SectionHead title="Top investor matches" meta="ranked by fit" action={<button className="btn ghost" onClick={() => router.push('/copilot/matches')}>View all <ArrowRight size={12} /></button>} />
					{!hasCompany ? (
						<div style={{ padding: 'var(--space-4)', fontSize: 13, color: 'var(--fg-2)' }}>
							Claim and verify your company to see investor matches. <Link href="/get-verified" className="ai-link">Get verified</Link>
						</div>
					) : matches.length === 0 ? (
						<div style={{ padding: 'var(--space-4)', fontSize: 13, color: 'var(--fg-2)' }}>No strong matches yet — check back as more investor theses are added.</div>
					) : (
						<div className="match-list">
							{matches.map((m) => {
								const fit = Math.min(100, m.score);
								return (
									<div key={m.id} className="match-row" role="button" tabIndex={0} onClick={() => router.push(`/investors/${m.slug ?? m.id}`)}>
										<div className="match-main">
											<div className="match-name">{m.name}</div>
											<div className="match-sub">{m.category ?? '—'}</div>
											<div className="match-why">{m.match_reasons.slice(0, 3).map((w) => <span key={w} className="match-chip">{w}</span>)}</div>
										</div>
										<div className="match-fit">
											<div className="match-fit-num">{fit}<span>%</span></div>
											<FitBar pct={fit} />
										</div>
									</div>
								);
							})}
						</div>
					)}
				</div>

				<div className="card" style={{ display: 'flex', flexDirection: 'column', padding: 'var(--space-4)' }}>
					<SectionHead title="Raise snapshot" meta="Series B" />
					<div className="cp-raise-top">
						<div>
							<div className="cp-raise-amt">$14.2M</div>
							<div className="cp-raise-lbl">committed of $25M target</div>
						</div>
						<div className="cp-raise-pct">57%</div>
					</div>
					<div className="cp-raise-bar"><div style={{ width: '57%' }} /></div>
					<div className="cp-raise-grid">
						<div><span>Pre-money</span><b>$120M</b></div>
						<div><span>Stage</span><b>Series B</b></div>
						<div><span>Status</span><b className="cp-raise-status">Term sheet in review</b></div>
						<div><span>In market</span><b>24 days</b></div>
					</div>
					<button className="btn ghost cp-full" onClick={() => router.push('/copilot/company')}>Manage raise <ArrowRight size={12} /></button>
				</div>
			</div>

			<div className="grid-2" style={{ marginBottom: 'var(--space-5)' }}>
				<div className="card">
					<SectionHead title="How your raise compares" meta="Series B · fan engagement" action={<button className="btn ghost" onClick={() => router.push('/copilot/benchmarks')}>Benchmarks <ArrowRight size={12} /></button>} />
					<div style={{ padding: 'var(--space-4)' }}>
						{BENCHMARKS.map((b) => (
							<div key={b.metric} className="bm-row">
								<div className="bm-metric">{b.metric}</div>
								<div className="bm-vals"><b>{b.you}</b><span>{b.cohort}</span></div>
								<div className="bm-bar"><FitBar pct={b.pct} /></div>
								<div className="bm-pct">{b.pct}<small>pct</small></div>
							</div>
						))}
					</div>
				</div>

				<div className="card">
					<SectionHead title="Funding momentum" meta="your sector" action={<button className="btn ghost" onClick={() => router.push('/copilot/market')}>Market <ArrowRight size={12} /></button>} />
					<div style={{ padding: 'var(--space-4)' }}>
						<div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
							<span style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 800 }}>$486M</span>
							<Tag variant="pos">+31% YoY</Tag>
						</div>
						<p style={{ fontSize: 12.5, color: 'var(--fg-2)', lineHeight: 1.5, marginBottom: 12 }}>
							Capital into fan-engagement startups, TTM. Series B activity accelerating into 2026.
						</p>
						<MiniBars values={[68, 82, 74, 96]} labels={['Q1', 'Q2', 'Q3', 'Q4']} />
						<div className="cp-momentum-tags">
							<Tag>12 active investors in sector</Tag>
							<Tag>Median Series B $24M</Tag>
						</div>
					</div>
				</div>
			</div>

			<div className="grid-3">
				<div className="card cp-mini" role="button" tabIndex={0} onClick={() => router.push('/copilot/toolkit')}>
					<div className="cp-mini-head"><Sparkles size={16} /> Deck evaluator</div>
					<ScoreRing score={deckScore ?? 0} />
					<div className="cp-mini-note">Strong problem &amp; traction. <em>Tighten your use-of-funds slide</em> to lift the score.</div>
					<button className="btn ghost" style={{ marginTop: 'auto' }}>Open toolkit <ArrowRight size={12} /></button>
				</div>

				<div className="card cp-mini" role="button" tabIndex={0} onClick={() => router.push('/copilot/toolkit')}>
					<div className="cp-mini-head"><Zap size={16} /> Accelerator &amp; grant matches</div>
					<div className="cp-prog-list">
						{PROGRAMS.map((p) => (
							<div key={p.name} className="cp-prog">
								<span className="cp-prog-dot" style={{ background: p.color }} />
								<div style={{ flex: 1, minWidth: 0 }}>
									<div className="cp-prog-name">{p.name}</div>
									<div className="cp-prog-meta">{p.meta}</div>
								</div>
								<Tag variant="pos">Open</Tag>
							</div>
						))}
					</div>
					<button className="btn ghost" style={{ marginTop: 'auto' }}>See 9 matches <ArrowRight size={12} /></button>
				</div>

				<div className="card cp-mini" role="button" tabIndex={0} onClick={() => router.push('/copilot/company')}>
					<div className="cp-mini-head"><Building2 size={16} /> My company</div>
					<div className="cp-co-row">
						<div style={{ width: 44, height: 44, background: 'var(--accent)', color: 'var(--accent-fg)', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 16 }}>HO</div>
						<div>
							<div className="cp-co-name">Hoopers <Heart size={12} style={{ color: 'var(--accent)', fill: 'currentColor' }} /></div>
							<div className="cp-co-meta">London, UK · Series B</div>
						</div>
					</div>
					<div className="cp-locker">
						<div className="cp-locker-head"><Sparkles size={13} /> Locker Room</div>
						<p>Your single shareable, diligence-ready link — traction, cap table, team and market position.</p>
					</div>
					<button className="btn ghost" style={{ marginTop: 'auto' }}>Open Locker Room <ArrowRight size={12} /></button>
				</div>
			</div>
		</>
	);
}
