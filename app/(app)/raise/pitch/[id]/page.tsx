'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, ArrowLeft } from 'lucide-react';
import { apiRequest, getAuthHeaders } from '@/lib/query-client';
import { consumeDeckStream, stripScorecardJson, type DeckScorecard } from '@/lib/deck-analysis';
import { Markdown } from '@/components/markdown';
import { Screen, Card, Badge, Button, Loading } from '@/components/atlas/kit';

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

function rating(score: number): { label: string; ring: string; bg: string; fg: string } {
	if (score < 50) return { label: 'Early Stage', ring: '#C0392B', bg: '#FCEBEB', fg: '#791F1F' };
	if (score < 70) return { label: 'Developing', ring: '#EF9F27', bg: '#FAEEDA', fg: '#854F0B' };
	if (score < 83) return { label: 'Investor Ready', ring: '#9B9A93', bg: '#F2F1EC', fg: '#6B6A64' };
	if (score < 93) return { label: 'Strong', ring: '#3B6D11', bg: '#EAF3DE', fg: '#27500A' };
	return { label: 'Exceptional', ring: '#27500A', bg: '#EAF3DE', fg: '#27500A' };
}

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
			<button onClick={() => router.push('/raise/pitch')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--a-muted)', fontSize: 13, padding: 0, display: 'inline-flex', alignItems: 'center', gap: 6 }}><ArrowLeft size={14} /> Back to pitch deck summary</button>

			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20, marginTop: 22 }}>
				<div>
					<div style={{ fontSize: 20, fontWeight: 600 }}>{row?.filename ?? 'Pitch deck'}</div>
					{row?.created_at && <div style={{ fontSize: 14, color: 'var(--a-muted)', marginTop: 8 }}>Analysed {new Date(row.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}</div>}
				</div>
				<Button variant="outline" onClick={() => router.push('/raise/pitch')}>Analyse revised deck</Button>
			</div>

			{streaming && !scorecard && (
				<Card focus style={{ marginTop: 24, padding: 32, display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center' }}>
					<Loader2 className="spin" size={20} /> <span style={{ fontSize: 14, color: 'var(--a-muted)' }}>Analysing your deck…</span>
				</Card>
			)}

			{overall != null && (
				<Card focus style={{ marginTop: 24, padding: '24px 28px', display: 'flex', gap: 36, alignItems: 'center', flexWrap: 'wrap' }}>
					<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
						<div style={{ width: 68, height: 68, borderRadius: '50%', border: `5px solid ${rating(overall).ring}`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box', fontSize: 17, fontWeight: 600 }}>{overall}</div>
						<span style={{ background: rating(overall).bg, color: rating(overall).fg, borderRadius: 6, padding: '3px 16px', fontSize: 11 }}>{rating(overall).label}</span>
					</div>
					{scorecard?.verdict && <p style={{ margin: 0, flex: 1, minWidth: 420, fontSize: 13, color: 'var(--a-muted)', lineHeight: 1.5 }}>{scorecard.verdict}</p>}
				</Card>
			)}

			{scorecard && scorecard.sections.length > 0 && <>
				<div style={{ margin: '28px 0 12px', fontSize: 13, fontWeight: 600 }}>Scores by topic</div>
				<div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 24 }}>
					{TOPIC_GROUPS.map((g) => {
						const secs = sectionsByLabel(g.labels);
						if (secs.length === 0) return null;
						return (
							<Card key={g.h} variant="cream">
								<div style={{ fontSize: 12, fontWeight: 600 }}>{g.h}</div>
								<div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 9, fontSize: 13 }}>
									{secs.map((s) => (
										<span key={s.key} style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--a-muted)' }}>{s.label}</span><span>{s.score ?? '—'}</span></span>
									))}
								</div>
							</Card>
						);
					})}
				</div>

				<div style={{ margin: '28px 0 12px', fontSize: 13, fontWeight: 600 }}>Area-by-area detail</div>
				<Card variant="cream" style={{ padding: '8px 24px' }}>
					{scorecard.sections.map((s, i) => (
						<Area key={s.key} label={s.label} score={s.score} shows={s.quote} missing={suggestionsFor(s.label).map((x) => x.suggestion)} defaultOpen={i < 2} last={i === scorecard.sections.length - 1} />
					))}
				</Card>

				<div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 24, marginTop: 34 }}>
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
				<span style={{ fontSize: 14, fontWeight: 600, color: 'var(--a-ink)' }}>{label} <span style={{ color: 'var(--a-faint)', fontWeight: 400 }}>{score != null ? `${score}/10` : ''}</span></span>
				<span style={{ fontSize: 16, color: 'var(--a-faint)' }}>{open ? '–' : '+'}</span>
			</button>
			{open && (
				<div style={{ marginTop: 12 }}>
					{shows && <p style={{ margin: 0, fontSize: 13, lineHeight: 1.45, color: 'var(--a-muted)' }}><span style={{ color: '#3B6D11', marginRight: 8 }}>✓</span><strong style={{ fontWeight: 500, color: 'var(--a-ink)' }}>What the deck shows:</strong> {shows}</p>}
					{missing.length > 0 && <p style={{ margin: '10px 0 0', fontSize: 13, lineHeight: 1.45, color: 'var(--a-muted)' }}><span style={{ color: '#A32D2D', marginRight: 8 }}>✕</span><strong style={{ fontWeight: 500, color: 'var(--a-ink)' }}>Missing / unproven:</strong> {missing.join('; ')}</p>}
					{!shows && missing.length === 0 && <p style={{ margin: 0, fontSize: 13, color: 'var(--a-faint)' }}>No detail recorded for this area.</p>}
				</div>
			)}
		</div>
	);
}

function Col({ title, items }: { title: string; items: string[] }) {
	return (
		<div>
			<div style={{ fontSize: 13, fontWeight: 600 }}>{title}</div>
			<div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, color: 'var(--a-muted)' }}>
				{items.length ? items.map((t, i) => <span key={i}>{t}</span>) : <span style={{ color: 'var(--a-faint)' }}>—</span>}
			</div>
		</div>
	);
}
