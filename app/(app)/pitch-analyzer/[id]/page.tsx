'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, Lightbulb, ChevronRight, RefreshCw } from 'lucide-react';
import { Markdown } from '@/components/markdown';
import type { DeckHighlight } from '@/components/deck-viewer';
import { apiRequest, getAuthHeaders } from '@/lib/query-client';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { consumeDeckStream, stripScorecardJson, type DeckScorecard } from '@/lib/deck-analysis';

const DeckViewer = dynamic(() => import('@/components/deck-viewer').then((m) => m.DeckViewer), {
	ssr: false,
	loading: () => <div className="flex h-full items-center justify-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading viewer…</div>,
});

export default function DeckAnalysisPage() {
	const confirm = useConfirm();
	const router = useRouter();
	const params = useParams();
	const id = String(params.id);

	const abortRef = useRef<AbortController | null>(null);
	const nonceRef = useRef(0);
	const sugRef = useRef<HTMLDivElement>(null);
	const [pdfUrl, setPdfUrl] = useState<string | null>(null);
	const [highlight, setHighlight] = useState<DeckHighlight | null>(null);
	const [md, setMd] = useState('');
	const [scorecard, setScorecard] = useState<DeckScorecard | null>(null);
	const [streaming, setStreaming] = useState(true);
	const [showSug, setShowSug] = useState(false);
	const [ready, setReady] = useState(false);

	const jump = (page?: number | null, quote?: string | null) => {
		if (!page) return;
		nonceRef.current += 1;
		setHighlight({ page, quote, nonce: nonceRef.current });
	};

	// Open the SSE stream and consume it (used for first-run + re-analyze).
	const streamAnalysis = useCallback(async (ac: AbortController, isCancelled: () => boolean) => {
		const auth = await getAuthHeaders();
		const res = await fetch(`/api/deck-analysis/${id}/stream`, {
			method: 'POST', headers: { Accept: 'text/event-stream', ...auth }, credentials: 'include', signal: ac.signal,
		});
		if (!res.ok || !res.body) { if (!isCancelled()) setMd('⚠️ Failed to start analysis.'); return; }
		await consumeDeckStream(res.body, {
			onDelta: (t) => setMd((p) => p + t),
			onDone: (sc) => setScorecard(sc),
			onError: (m) => toast.error(m),
		}, ac.signal);
	}, [id]);

	useEffect(() => {
		const ac = new AbortController();
		abortRef.current = ac;
		let cancelled = false;
		(async () => {
			setMd(''); setScorecard(null); setStreaming(true); setHighlight(null); setPdfUrl(null); setShowSug(false); setReady(false);
			try {
				const fileRes = await apiRequest('GET', `/api/deck-analysis/${id}/file`);
				if (!cancelled && fileRes.ok) setPdfUrl(((await fileRes.json()) as { url?: string }).url ?? null);

				// Load the stored row first. A finished analysis is rendered straight
				// from the DB — we do NOT re-stream/re-charge on revisit or refresh.
				const rowRes = await apiRequest('GET', `/api/deck-analysis/${id}`);
				const row = rowRes.ok ? ((await rowRes.json()) as { status: string; analysis_md: string | null; result_json: unknown }) : null;
				if (cancelled) return;

				if (row && row.status === 'done' && row.analysis_md) {
					setMd(row.analysis_md);
					setScorecard((row.result_json as DeckScorecard | null) ?? null);
					return;
				}

				// Not yet analyzed (pending / processing / failed) → run it.
				await streamAnalysis(ac, () => cancelled);
			} catch (e) {
				if ((e as Error).name !== 'AbortError') toast.error((e as Error).message ?? 'Analysis failed');
			} finally {
				if (!cancelled) { setStreaming(false); setReady(true); }
			}
		})();
		// Abort the live controller (may have been swapped by re-analyze), plus this one.
		return () => { cancelled = true; ac.abort(); abortRef.current?.abort(); };
	}, [id, streamAnalysis]);

	// Re-run the analysis from scratch on demand (charges credits again).
	const reanalyze = useCallback(async () => {
		if (streaming) return;
		if (!(await confirm({
			title: 'Re-analyze this deck?',
			description: 'This runs a fresh analysis from scratch and uses credits.',
			confirmLabel: 'Re-analyze',
		}))) return;
		abortRef.current?.abort();
		const ac = new AbortController();
		abortRef.current = ac;
		setMd(''); setScorecard(null); setHighlight(null); setShowSug(false); setStreaming(true);
		try {
			const res = await apiRequest('POST', `/api/deck-analysis/${id}/reanalyze`);
			if (!res.ok) {
				const body = await res.json().catch(() => null) as { error?: { message?: string } } | null;
				toast.error(body?.error?.message ?? 'Could not start re-analysis.');
				setStreaming(false);
				return;
			}
			await streamAnalysis(ac, () => false);
		} catch (e) {
			if ((e as Error).name !== 'AbortError') toast.error((e as Error).message ?? 'Re-analysis failed');
		} finally {
			setStreaming(false);
		}
	}, [id, streaming, streamAnalysis, confirm]);

	// When the suggestions panel opens, scroll it into view (it renders at the top
	// of the analysis column, which may be scrolled down).
	useEffect(() => {
		if (showSug) sugRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}, [showSug]);

	// Click an analysis section heading ("Problem (5.5/10)") → scroll PDF to its
	// cited page + highlight the quote.
	const onHeadingClick = (heading: string) => {
		const sec = scorecard?.sections.find((s) => heading.toLowerCase().startsWith(s.label.toLowerCase()));
		if (sec) jump(sec.page_refs[0], sec.quote);
	};

	const overall = scorecard?.overall_score ?? null;
	const canImprove = overall != null && overall < 80 && (scorecard?.suggestions.length ?? 0) > 0;
	const visibleMd = stripScorecardJson(md);

	return (
		<div className="flex h-[calc(100vh-110px)] flex-col p-4">
			<div className="mb-3 flex items-center gap-3">
				<button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground" onClick={() => router.push('/pitch-analyzer')}>
					<ArrowLeft className="h-4 w-4" /> Back
				</button>
				{overall != null && <ScorePill value={overall} />}
				{streaming && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Analyzing…</span>}
				<div className="ml-auto flex items-center gap-2">
					{canImprove && (
						<button className="flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground" onClick={() => setShowSug((v) => !v)}>
							<Lightbulb className="h-4 w-4" /> How to improve ({scorecard!.suggestions.length})
						</button>
					)}
					{ready && !streaming && (
						<button className="flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground" onClick={reanalyze} title="Re-run the analysis (uses credits)">
							<RefreshCw className="h-4 w-4" /> Re-analyze
						</button>
					)}
				</div>
			</div>

			<div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-2">
				<div className="min-h-0 overflow-hidden rounded-lg border border-border">
					{pdfUrl ? (
						<DeckViewer fileUrl={pdfUrl} highlight={highlight} />
					) : (
						<div className="flex h-full items-center justify-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading deck…</div>
					)}
				</div>

				<div className="ai-thin-scroll min-h-0 overflow-y-auto rounded-lg border border-border p-4">
					{scorecard && scorecard.sections.length > 0 && (
						<div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
							{scorecard.sections.map((s) => (
								<button key={s.key} className="rounded-md border border-border p-2 text-left hover:bg-muted" title={s.page_refs.length ? `Jump to p.${s.page_refs[0]}` : undefined}
									onClick={() => jump(s.page_refs[0], s.quote)}>
									<div className="text-[10px] uppercase tracking-wide text-muted-foreground">{s.label}</div>
									<div className={`text-lg font-bold ${scoreColor10(s.score)}`}>{s.score ?? '—'}<span className="text-xs font-normal text-muted-foreground">/10</span></div>
								</button>
							))}
						</div>
					)}

					{showSug && scorecard && (
						<div ref={sugRef} className="mb-4 rounded-md border border-primary/40 bg-primary/5 p-3">
							<div className="mb-2 flex items-center gap-1 text-sm font-semibold"><Lightbulb className="h-4 w-4" /> How to improve</div>
							<ul className="space-y-2">
								{scorecard.suggestions.map((sg, i) => (
									<li key={i} className="text-sm">
										<button className="flex w-full items-start gap-2 text-left hover:text-primary" onClick={() => jump(sg.page_ref, sg.quote)}>
											<ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
											<span><span className="font-medium capitalize">{sg.area}:</span> {sg.suggestion}{sg.page_ref ? <span className="text-muted-foreground"> (p.{sg.page_ref})</span> : null}</span>
										</button>
									</li>
								))}
							</ul>
						</div>
					)}

					<Markdown text={visibleMd} onHeadingClick={scorecard ? onHeadingClick : undefined} />
					{streaming && <span className="ml-0.5 inline-block h-4 w-2 animate-pulse bg-primary align-middle" />}
				</div>
			</div>
		</div>
	);
}

function ScorePill({ value }: { value: number }) {
	const c = value >= 70 ? 'text-emerald-600' : value >= 50 ? 'text-amber-600' : 'text-destructive';
	return <span className={`shrink-0 text-sm font-bold ${c}`}>{value}<span className="text-xs font-normal text-muted-foreground">/100</span></span>;
}

function scoreColor10(s: number | null): string {
	if (s == null) return 'text-muted-foreground';
	return s >= 7 ? 'text-emerald-600' : s >= 5 ? 'text-amber-600' : 'text-destructive';
}
