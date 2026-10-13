'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { AlertTriangle, ArrowLeft, ArrowUpRight, Check, ChevronDown, FileText, HelpCircle, RefreshCw } from 'lucide-react';
import { apiRequest, getAuthHeaders } from '@/lib/query-client';
import { isInsufficientCreditsError } from '@/lib/credit-events';
import { consumeDeckStream, stripScorecardJson, type DeckScorecard } from '@/lib/deck-analysis';
import { Markdown } from '@/components/markdown';
import { Screen, Card, Button, Loading, Logo, StagedLoader } from '@/components/atlas';
import { companyHref, hrefOf } from '@/lib/routes';
import { rating } from './score-tone';
import { DECK_ANALYSIS_STAGES } from './deck-stages';

/**
 * Deck analysis — full analysis (canvas: deckAnalysis), shared by Raise "Pitch
 * Deck" and Scout "Deck Screener". Reads GET /api/deck-analysis/:id (structured
 * scorecard + markdown); streams on first run for a not-yet-analysed deck.
 * Rendered from the structured scorecard; markdown is the fallback.
 */
interface DeckRow { status: string; analysis_md: string | null; result_json: DeckScorecard | null; filename?: string | null; created_at?: string | null; overall_score?: number | null }

const TOPIC_GROUPS: { h: string; labels: string[] }[] = [
	{ h: 'Story', labels: ['problem', 'solution', 'market', 'product'] },
	{ h: 'Business and traction', labels: ['business model', 'competition', 'go-to-market', 'traction'] },
	{ h: 'Numbers and team', labels: ['financials', 'team', 'the ask'] },
];

export interface DeckDetailCopy { back: string; fallbackName: string; recommendations: string; strengths: string; concerns: string }
export const FOUNDER_DETAIL_COPY: DeckDetailCopy = {
	back: 'Back to pitch deck summary', fallbackName: 'Pitch deck',
	recommendations: 'Specific recommendations', strengths: 'Strengths', concerns: 'Main investor concerns',
};

export function DeckAnalysisDetail({ id, copy = FOUNDER_DETAIL_COPY }: { id: string; copy?: DeckDetailCopy }) {
	const basePath = hrefOf('deck');
	const router = useRouter();
	const [row, setRow] = useState<DeckRow | null>(null);
	const [md, setMd] = useState('');
	const [scorecard, setScorecard] = useState<DeckScorecard | null>(null);
	const [streaming, setStreaming] = useState(true);
	const [busy, setBusy] = useState<'file' | 'rerun' | null>(null);
	// Bumped by "Run it again". The effect below already does
	// fetch-row-then-stream, and `reanalyze` resets the row to `pending`
	// server-side, so re-running the effect is the whole implementation.
	const [reload, setReload] = useState(0);
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
	}, [id, streamAnalysis, reload]);

	/**
	 * Open the deck itself. The endpoint hands back a 1-hour signed URL, and
	 * until now nothing called it — you could read an analysis of a deck you
	 * had no way to look at.
	 *
	 * The tab is opened synchronously on the click and only then pointed at the
	 * URL: opening it after the await is what popup blockers stop.
	 */
	const viewDeck = async () => {
		if (busy) return;
		setBusy('file');
		const tab = window.open('about:blank', '_blank');
		try {
			const res = await apiRequest('GET', `/api/deck-analysis/${id}/file`);
			if (!res.ok) throw new Error(String(res.status));
			const { url } = (await res.json()) as { url: string };
			if (tab) tab.location.href = url; else window.open(url, '_blank', 'noopener');
		} catch {
			tab?.close();
			toast.error('Could not open the deck. Try again.');
		} finally { setBusy(null); }
	};

	/** Re-run the analysis on the same file. Credit-metered server-side. */
	const rerun = async () => {
		if (busy || streaming) return;
		setBusy('rerun');
		try {
			const res = await apiRequest('POST', `/api/deck-analysis/${id}/reanalyze`);
			if (!res.ok) throw new Error(String(res.status));
			setReload((n) => n + 1);
		} catch (e) {
			// A credit or tier refusal already raised its own modal with the
			// explanation — a toast on top would just be noise.
			if (!isInsufficientCreditsError(e)) toast.error((e as Error).message ?? 'Could not re-run the analysis.');
		} finally { setBusy(null); }
	};

	// Investor-mode screens carry a snapshot / thesis fit / diligence questions;
	// a founder critique carries `suggestions`. The UI follows the data, so a
	// screen always renders as what it actually is, whichever page opened it.
	const isInvestor = !!scorecard && (
		scorecard.snapshot !== undefined || scorecard.thesis_fit !== undefined || scorecard.diligence_questions !== undefined
	);
	const overall = scorecard?.overall_score ?? row?.overall_score ?? null;
	const sectionsByLabel = (labels: string[]) => (scorecard?.sections ?? []).filter((s) => labels.some((l) => s.label.toLowerCase().includes(l)));
	const suggestionsFor = (label: string) => (scorecard?.suggestions ?? []).filter((sg) => sg.area.toLowerCase().includes(label.toLowerCase()));

	return (
		<Screen>
			<button onClick={() => router.push(basePath)} className="atlas-action"><span className="atlas-action__icon"><ArrowLeft /></span>{copy.back}</button>

			<div className="atlas-pagehead" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 20, flexWrap: 'wrap', marginTop: 28 }}>
				<div>
					<h1 className="atlas-h1" style={{ fontSize: 28 }}>{row?.filename ?? copy.fallbackName}</h1>
					{row?.created_at && <div className="atlas-sub">Analysed {new Date(row.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}</div>}
				</div>
				<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
					<Button variant="outline" disabled={busy !== null} onClick={() => void viewDeck()}>
						<FileText size={13} /> {busy === 'file' ? 'Opening…' : 'View deck'}
					</Button>
					<Button variant="outline" disabled={busy !== null || streaming} onClick={() => void rerun()}>
						<RefreshCw size={13} /> {busy === 'rerun' ? 'Starting…' : 'Run it again'}
					</Button>
					<Button variant="outline" onClick={() => router.push(basePath)}>Analyse revised deck</Button>
				</div>
			</div>

			{streaming && !scorecard && (
				<StagedLoader
					title={`Analysing ${row?.filename ?? 'the deck'}`}
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

				{isInvestor && scorecard?.snapshot && (scorecard.snapshot.one_liner || scorecard.snapshot.sector) && (
					<Card style={{ marginTop: 20, padding: '20px 24px' }}>
						<div className="atlas-eyebrow">Snapshot</div>
						{scorecard.snapshot.one_liner && <p style={{ margin: '12px 0 16px', fontSize: 14, lineHeight: 1.55, color: 'var(--a-ink-2)' }}>{scorecard.snapshot.one_liner}</p>}
						<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px 24px' }}>
							{([['Sector', scorecard.snapshot.sector], ['Geography', scorecard.snapshot.geography], ['Business model', scorecard.snapshot.business_model], ['Raising', scorecard.stage]] as [string, string | null | undefined][])
								.filter(([, v]) => v).map(([k, v]) => (
									<div key={k}>
										<div className="atlas-eyebrow" style={{ fontSize: 9 }}>{k}</div>
										<div style={{ marginTop: 5, fontSize: 14, color: 'var(--a-ink)' }}>{v}</div>
									</div>
								))}
						</div>
					</Card>
				)}

				{isInvestor && scorecard?.thesis_fit && (
					<Card glow="blue" style={{ marginTop: 20, padding: '20px 24px' }}>
						<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
							<div className="atlas-eyebrow">Thesis fit</div>
							{scorecard.thesis_fit.score != null && <span style={{ fontFamily: 'var(--a-mono)', fontSize: 13 }}>{scorecard.thesis_fit.score}/10</span>}
						</div>
						{scorecard.thesis_fit.summary && <p style={{ margin: '12px 0 0', fontSize: 13, lineHeight: 1.55, color: 'var(--a-muted)' }}>{scorecard.thesis_fit.summary}</p>}
						<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginTop: 16 }}>
							{scorecard.thesis_fit.matches.length > 0 && (
								<div>
									<div className="atlas-eyebrow" style={{ fontSize: 9, color: 'var(--a-ok)' }}>Fits</div>
									<div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 7 }}>
										{scorecard.thesis_fit.matches.map((m, i) => <span key={i} style={{ display: 'flex', gap: 8, fontSize: 13, color: 'var(--a-muted)' }}><Check size={13} style={{ color: 'var(--a-ok)', flexShrink: 0, marginTop: 2 }} />{m}</span>)}
									</div>
								</div>
							)}
							{scorecard.thesis_fit.misses.length > 0 && (
								<div>
									<div className="atlas-eyebrow" style={{ fontSize: 9, color: 'var(--a-danger)' }}>Doesn&rsquo;t fit</div>
									<div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 7 }}>
										{scorecard.thesis_fit.misses.map((m, i) => <span key={i} style={{ display: 'flex', gap: 8, fontSize: 13, color: 'var(--a-muted)' }}><AlertTriangle size={12} style={{ color: 'var(--a-danger)', flexShrink: 0, marginTop: 3 }} />{m}</span>)}
									</div>
								</div>
							)}
						</div>
					</Card>
				)}

				{isInvestor && scorecard && scorecard.thesis_fit === null && (
					<Card style={{ marginTop: 20, padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 10 }}>
						<HelpCircle size={15} style={{ color: 'var(--a-muted)', flexShrink: 0 }} />
						<p style={{ margin: 0, fontSize: 13, color: 'var(--a-muted)' }}>
							Set up your <a href={hrefOf('thesis')} style={{ color: 'var(--a-ink)', textDecoration: 'underline', textUnderlineOffset: 3 }}>investment thesis</a> and future screens will be judged against it.
						</p>
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
						{isInvestor ? <>
							<FlaggedCol title="Red flags" items={scorecard.red_flags ?? []} tone="danger" icon={<AlertTriangle size={13} />} />
							<FlaggedCol title="Diligence questions" items={scorecard.diligence_questions ?? []} tone="muted" icon={<HelpCircle size={13} />} />
							<Col title={copy.strengths} items={scorecard.strengths} />
						</> : <>
							<Col title={copy.recommendations} items={scorecard.suggestions.map((s) => s.suggestion)} firstTour="deck-top-fix" />
							<Col title={copy.strengths} items={scorecard.strengths} />
							<Col title={copy.concerns} items={scorecard.risks} />
						</>}
					</div>

					{isInvestor && (scorecard.comparables?.length ?? 0) > 0 && <>
						<div className="atlas-eyebrow" style={{ margin: '34px 0 12px' }}>Comparable companies in Atlas</div>
						<Card style={{ padding: '6px 23px' }}>
							{scorecard.comparables!.map((c, i) => (
								<a
									key={c.id}
									href={companyHref(c.slug ?? c.id)}
									style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 0', borderBottom: i < scorecard.comparables!.length - 1 ? '1px solid var(--a-border)' : 'none', textDecoration: 'none', color: 'inherit' }}
								>
									<Logo co={{ name: c.name, website: c.website, custom_logo_url: c.custom_logo_url }} size={34} radius={7} />
									<span style={{ flex: 1, minWidth: 0 }}>
										<span style={{ display: 'block', fontSize: 14, fontWeight: 700, color: 'var(--a-ink)' }}>{c.name}</span>
										{c.description && <span style={{ display: 'block', fontSize: 12, color: 'var(--a-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.description}</span>}
									</span>
									<span className="atlas-action__icon" aria-hidden="true"><ArrowUpRight /></span>
								</a>
							))}
						</Card>
					</>}
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

function Col({ title, items, firstTour }: { title: string; items: string[]; firstTour?: string }) {
	return (
		<div>
			<div className="atlas-eyebrow">{title}</div>
			<div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12, lineHeight: 1.55, color: 'var(--a-muted)' }}>
				{items.length ? items.map((t, i) => <span key={i} data-tour={i === 0 ? firstTour : undefined}>{t}</span>) : <span style={{ color: 'var(--a-faint)' }}>—</span>}
			</div>
		</div>
	);
}

function FlaggedCol({ title, items, tone, icon }: { title: string; items: string[]; tone: 'danger' | 'muted'; icon: React.ReactNode }) {
	const color = tone === 'danger' ? 'var(--a-danger)' : 'var(--a-muted)';
	return (
		<div>
			<div className="atlas-eyebrow" style={{ display: 'flex', alignItems: 'center', gap: 6, color }}>{icon}{title}</div>
			<div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12.5, lineHeight: 1.5, color: 'var(--a-muted)' }}>
				{items.length ? items.map((t, i) => <span key={i} style={{ display: 'flex', gap: 7 }}><span style={{ color, flexShrink: 0 }}>{tone === 'danger' ? '!' : (i + 1) + '.'}</span>{t}</span>) : <span style={{ color: 'var(--a-faint)' }}>None noted.</span>}
			</div>
		</div>
	);
}
