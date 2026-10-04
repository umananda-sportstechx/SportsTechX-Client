'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, ChevronDown } from 'lucide-react';
import { apiRequest, getAuthHeaders } from '@/lib/query-client';
import { consumeDeckStream, stripScorecardJson, type DeckScorecard } from '@/lib/deck-analysis';
import { Markdown } from '@/components/markdown';
import { Screen, Card, Badge, Button, Loading, StagedLoader } from '@/components/atlas';
import { rating } from '@/components/raise/score-tone';
import { DECK_ANALYSIS_STAGES } from '@/components/raise/deck-stages';

/**
 * Atlas Raise — Pitch deck full analysis (canvas: deckAnalysis). Same backend as
 * the retired /pitch-analyzer/[id]: reads GET /api/deck-analysis/:id (structured
 * scorecard + markdown); streams on first run for a not-yet-analysed deck. Rendered
 * from the structured scorecard to match the design; markdown is the fallback.
 */
interface DeckRow { status: string; analysis_md: string | null; result_json: DeckScorecard | null; filename?: string | null; created_at?: string | null; overall_score?: number | null }

const TOPIC_GROUPS: { h: string; labels: string[] }[] = [
	{ h: 'Story', labels: ['problem', 'solution', 'market', 'product'] },
	{ h: 'Business and traction', labels: ['business model', 'competition', 'go-to-market', 'traction'] },
	{ h: 'Numbers and team', labels: ['financials', 'team', 'the ask'] },
];

export default function PitchAnalysisPage() {
	const id = String(useParams().id);
	const router = useRouter();
	const [row, setRow] = useState<DeckRow | null>(null);
	const [md, setMd] = useState('');
	const [scorecard, setScorecard] = useState<DeckScorecard | null>(null);
	const [streaming, setStreaming] = useState(true);
	const abortRef = useRef<AbortController | null>(null);

	const streamAnalysis = useCallback(async (ac: AbortController, cancelled: () => boolean) => {
		const auth = await getAuthHeaders();
		const res = await fetch(`/api/deck-analysis/${id}/stream`, { method: 'POST', headers: { Accept: 'text/event-stream', ...auth }, credentials: 'include', signal: ac.signal });
		if (!res.ok || !res.body) { if (!cancelled()) setMd('⚠️ Failed to start analysis.'); return; }
		await consumeDeckStream(res.body, { onDelta: (t) => setMd((p) => p + t), onDone: (sc) => setScorecard(sc), onError: (m) => toast.error(m) }, ac.signal);
	}, [id]);

	useEffect(() => {
		const ac = new AbortController(); abortRef.current = ac; let cancelled = false;
		(async () => {
			setMd(''); setScorecard(null); setStreaming(true); setRow(null);
			try {
				const res = await apiRequest('GET', `/api/deck-analysis/${id}`);
				const r = res.ok ? ((await res.json()) as DeckRow) : null;
				if (cancelled) return;
				setRow(r);
				if (r && r.status === 'done') {
					setMd(r.analysis_md ?? '');
					setScorecard(r.result_json ?? null);
					return;
				}
				await streamAnalysis(ac, () => cancelled);
			} catch (e) {
				if ((e as Error).name !== 'AbortError') toast.error((e as Error).message ?? 'Analysis failed');
			} finally { if (!cancelled) setStreaming(false); }
		})();
		return () => { cancelled = true; ac.abort(); };
	}, [id, streamAnalysis]);

	const overall = scorecard?.overall_score ?? row?.overall_score ?? null;
	const sectionsByLabel = (labels: string[]) => (scorecard?.sections ?? []).filter((s) => labels.some((l) => s.label.toLowerCase().includes(l)));
	const suggestionsFor = (label: string) => (scorecard?.suggestions ?? []).filter((sg) => sg.area.toLowerCase().includes(label.toLowerCase()));

	return (
		<Screen>
			<button onClick={() => router.push('/raise/pitch')} className="atlas-action"><span className="atlas-action__icon"><ArrowLeft /></span>Back to pitch deck summary</button>

			<div className="atlas-pagehead" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 20, flexWrap: 'wrap', marginTop: 28 }}>
				<div>
					<h1 className="atlas-h1" style={{ fontSize: 28 }}>{row?.filename ?? 'Pitch deck'}</h1>
					{row?.created_at && <div className="atlas-sub">Analysed {new Date(row.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}</div>}
				</div>
				<Button variant="outline" onClick={() => router.push('/raise/pitch')}>Analyse revised deck</Button>
			</div>

			{streaming && !scorecard && (
				<StagedLoader
					title={`Analysing ${row?.filename ?? 'your deck'}`}
					stages={DECK_ANALYSIS_STAGES}
					note="This usually takes about a minute. Keep this tab open — the full analysis appears here as soon as it's ready."
				/>
			)}

			{overall != null && (
				<Card glow="blue" style={{ padding: '24px 28px', display: 'flex', gap: 36, alignItems: 'center', flexWrap: 'wrap' }}>
					<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
						<div style={{ width: 68, height: 68, borderRadius: '50%', border: `5px solid ${rating(overall).ring}`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box', fontFamily: 'var(--a-mono)', fontSize: 19 }}>{overall}</div>
						<span style={{ background: rating(overall).bg, color: rating(overall).fg, border: `1px solid color-mix(in srgb, ${rating(overall).ring} 25%, transparent)`, borderRadius: 3, padding: '4px 12px 3px', fontFamily: 'var(--a-mono)', fontSize: 9, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{rating(overall).label}</span>
					</div>
					{scorecard?.verdict && <p style={{ margin: 0, flex: 1, minWidth: 240, fontSize: 13, color: 'var(--a-muted)', lineHeight: 1.5 }}>{scorecard.verdict}</p>}
				</Card>
			)}

			{scorecard && scorecard.sections.length > 0 && <>
				<div className="atlas-eyebrow" style={{ margin: '32px 0 12px' }}>Scores by topic</div>
				<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 24 }}>
					{TOPIC_GROUPS.map((g) => {
						const secs = sectionsByLabel(g.labels);
						if (secs.length === 0) return null;
						return (
							<Card key={g.h}>
								<div style={{ fontSize: 12, fontWeight: 700 }}>{g.h}</div>
								<div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 9, fontSize: 13 }}>
									{secs.map((s) => (
										<span key={s.key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}><span style={{ color: 'var(--a-muted)' }}>{s.label}</span><span style={{ fontFamily: 'var(--a-mono)', fontSize: 11 }}>{s.score ?? '—'}</span></span>
									))}
								</div>
							</Card>
						);
					})}
				</div>

				<div className="atlas-eyebrow" style={{ margin: '32px 0 12px' }}>Area-by-area detail</div>
				<Card style={{ padding: '4px 23px' }}>
					{scorecard.sections.map((s, i) => (
						<Area key={s.key} label={s.label} score={s.score} shows={s.quote} missing={suggestionsFor(s.label).map((x) => x.suggestion)} defaultOpen={i < 2} last={i === scorecard.sections.length - 1} />
					))}
				</Card>

				<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 24, marginTop: 34 }}>
					<Col title="Specific recommendations" items={scorecard.suggestions.map((s) => s.suggestion)} />
					<Col title="Strengths" items={scorecard.strengths} />
					<Col title="Main investor concerns" items={scorecard.risks} />
				</div>
			</>}

			{!scorecard && !streaming && md && (
				<Card style={{ marginTop: 24 }}><Markdown text={stripScorecardJson(md)} /></Card>
			)}
			{!row && !streaming && <Loading />}
		</Screen>
	);
}

function Area({ label, score, shows, missing, defaultOpen, last }: { label: string; score: number | null; shows: string | null; missing: string[]; defaultOpen?: boolean; last?: boolean }) {
	const [open, setOpen] = useState(!!defaultOpen);
	return (
		<div style={{ padding: '18px 0', borderBottom: last ? 'none' : '1px solid var(--a-border)' }}>
			<button onClick={() => setOpen((v) => !v)} style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 0 }}>
				<span style={{ fontSize: 15, fontFamily: 'var(--a-font)', fontWeight: 700, color: 'var(--a-ink)' }}>{label} <span style={{ fontFamily: 'var(--a-mono)', fontSize: 11, color: 'var(--a-faint)', fontWeight: 400, marginLeft: 6 }}>{score != null ? `${score}/10` : ''}</span></span>
				<span className={`atlas-caret-pill${open ? ' open' : ''}`} aria-hidden="true"><ChevronDown size={12} /></span>
			</button>
			{open && (
				<div style={{ marginTop: 12 }}>
					{shows && <p style={{ margin: 0, fontSize: 13, lineHeight: 1.45, color: 'var(--a-muted)' }}><span style={{ color: 'var(--a-ok)', marginRight: 8 }}>✓</span><strong style={{ fontWeight: 500, color: 'var(--a-ink)' }}>What the deck shows:</strong> {shows}</p>}
					{missing.length > 0 && <p style={{ margin: '10px 0 0', fontSize: 13, lineHeight: 1.45, color: 'var(--a-muted)' }}><span style={{ color: 'var(--a-danger)', marginRight: 8 }}>✕</span><strong style={{ fontWeight: 500, color: 'var(--a-ink)' }}>Missing / unproven:</strong> {missing.join('; ')}</p>}
					{!shows && missing.length === 0 && <p style={{ margin: 0, fontSize: 13, color: 'var(--a-faint)' }}>No detail recorded for this area.</p>}
				</div>
			)}
		</div>
	);
}

function Col({ title, items }: { title: string; items: string[] }) {
	return (
		<div>
			<div className="atlas-eyebrow">{title}</div>
			<div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12, lineHeight: 1.55, color: 'var(--a-muted)' }}>
				{items.length ? items.map((t, i) => <span key={i}>{t}</span>) : <span style={{ color: 'var(--a-faint)' }}>—</span>}
			</div>
		</div>
	);
}
