'use client';

import { useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import useSWR from 'swr';
import { toast } from 'sonner';
import { Upload, Loader2, ArrowLeft, Lightbulb, FileText, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Markdown } from '@/components/markdown';
import type { DeckHighlight } from '@/components/deck-viewer';
import { getSupabaseBrowser } from '@/lib/supabase/client';
import { apiRequest, getAuthHeaders } from '@/lib/query-client';
import { qk } from '@/lib/query-keys';

// PDF viewer is client-only (pdf.js) — load it without SSR.
const DeckViewer = dynamic(() => import('@/components/deck-viewer').then((m) => m.DeckViewer), {
	ssr: false,
	loading: () => <div className="flex h-full items-center justify-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading viewer…</div>,
});

/**
 * Pitch Deck Analyzer — side-by-side: the real deck PDF on the left, a streamed
 * investor-grade analysis on the right (8 scored dimensions + suggestions).
 * Clicking a dimension or suggestion jumps the PDF to the cited page. Paid feature.
 */
const BUCKET = 'user-uploads';
const MAX_BYTES = 25 * 1024 * 1024;
// PDF is analyzed natively; Office formats are converted to PDF server-side.
const ALLOWED_EXT = ['pdf', 'ppt', 'pptx', 'doc', 'docx'];
const ACCEPT = 'application/pdf,.pdf,.ppt,.pptx,.doc,.docx';

interface Section { key: string; label: string; score: number | null; page_refs: number[]; quote: string | null }
interface Suggestion { area: string; suggestion: string; page_ref: number | null; quote: string | null }
interface Scorecard {
	overall_score: number | null;
	verdict: string | null;
	sections: Section[];
	strengths: string[];
	risks: string[];
	suggestions: Suggestion[];
}
interface ListItem { id: string; filename: string | null; status: string; overall_score: number | null; created_at: string }

export default function PitchAnalyzerPage() {
	const { data: list, mutate } = useSWR<ListItem[]>(qk.deckAnalysis.list(), { dedupingInterval: 10_000 });
	const fileInputRef = useRef<HTMLInputElement>(null);
	const abortRef = useRef<AbortController | null>(null);

	const [uploading, setUploading] = useState(false);
	const [dragOver, setDragOver] = useState(false);

	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [pdfUrl, setPdfUrl] = useState<string | null>(null);
	const [highlight, setHighlight] = useState<DeckHighlight | null>(null);
	const nonceRef = useRef(0);
	const [md, setMd] = useState('');
	const [scorecard, setScorecard] = useState<Scorecard | null>(null);
	const [streaming, setStreaming] = useState(false);
	const [showSug, setShowSug] = useState(false);

	const jump = (page?: number | null, quote?: string | null) => {
		if (!page) return;
		nonceRef.current += 1;
		setHighlight({ page, quote, nonce: nonceRef.current });
	};

	const openAnalysis = async (id: string) => {
		abortRef.current?.abort();
		const ac = new AbortController();
		abortRef.current = ac;
		setSelectedId(id);
		setMd('');
		setScorecard(null);
		setShowSug(false);
		setHighlight(null);
		setPdfUrl(null);
		setStreaming(true);
		try {
			// Signed URL for the PDF (left pane) + the analysis stream (right pane).
			const fileRes = await apiRequest('GET', `/api/deck-analysis/${id}/file`);
			if (fileRes.ok) setPdfUrl(((await fileRes.json()) as { url?: string }).url ?? null);

			const auth = await getAuthHeaders();
			const res = await fetch(`/api/deck-analysis/${id}/stream`, {
				method: 'POST',
				headers: { Accept: 'text/event-stream', ...auth },
				credentials: 'include',
				signal: ac.signal,
			});
			if (!res.ok || !res.body) {
				setMd(`⚠️ ${await res.text().catch(() => 'Failed to start analysis')}`);
				return;
			}
			await consumeStream(res.body, {
				onDelta: (t) => setMd((prev) => prev + t),
				onDone: (sc) => setScorecard(sc),
				onError: (m) => toast.error(m),
			}, ac.signal);
		} catch (e) {
			if ((e as Error).name !== 'AbortError') toast.error((e as Error).message ?? 'Analysis failed');
		} finally {
			setStreaming(false);
			await mutate();
		}
	};

	const analyze = async (file: File) => {
		if (uploading) return;
		const ext = (file.name.split('.').pop() ?? '').toLowerCase();
		if (!ALLOWED_EXT.includes(ext)) { toast.error('Upload a PDF, PPT/PPTX, or DOC/DOCX.'); return; }
		if (file.size > MAX_BYTES) { toast.error(`File too large (max 25 MB).`); return; }
		setUploading(true);
		try {
			const supabase = getSupabaseBrowser();
			const { data: auth } = await supabase.auth.getUser();
			const uid = auth.user?.id;
			if (!uid) throw new Error('Not signed in');
			const key = `${uid}/decks/${crypto.randomUUID()}.${ext}`;
			const { error } = await supabase.storage.from(BUCKET).upload(key, file, { upsert: false, contentType: file.type || 'application/octet-stream' });
			if (error) throw error;

			const res = await apiRequest('POST', '/api/deck-analysis', { storage_path: key, filename: file.name });
			if (!res.ok) {
				const body = await res.json().catch(() => null);
				const msg = (body?.error?.message as string | undefined);
				if (res.status === 403) throw new Error(msg ?? 'Pitch deck analysis is a paid feature.');
				if (res.status === 402) throw new Error(msg ?? 'Not enough credits.');
				throw new Error(msg ?? 'Could not start analysis');
			}
			const { id } = (await res.json()) as { id: string };
			await mutate();
			void openAnalysis(id);
		} catch (e) {
			toast.error((e as Error).message ?? 'Upload failed');
		} finally {
			setUploading(false);
		}
	};

	const onPick = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) void analyze(f); e.target.value = ''; };
	const onDrop = (e: React.DragEvent) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) void analyze(f); };

	// ─── Analysis view (side-by-side) ───────────────────────────────────────
	if (selectedId) {
		const overall = scorecard?.overall_score ?? null;
		const canImprove = overall != null && overall < 80 && (scorecard?.suggestions.length ?? 0) > 0;
		return (
			<div className="flex h-[calc(100vh-110px)] flex-col p-4">
				<div className="mb-3 flex items-center gap-3">
					<button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground" onClick={() => { abortRef.current?.abort(); setSelectedId(null); }}>
						<ArrowLeft className="h-4 w-4" /> Back
					</button>
					{overall != null && <ScorePill value={overall} />}
					{streaming && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Analyzing…</span>}
					{canImprove && (
						<button className="ml-auto flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground" onClick={() => setShowSug((v) => !v)}>
							<Lightbulb className="h-4 w-4" /> How to improve ({scorecard!.suggestions.length})
						</button>
					)}
				</div>

				<div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-2">
					{/* Left: the deck (pdf.js viewer with quote highlights) */}
					<div className="min-h-0 overflow-hidden rounded-lg border border-border">
						{pdfUrl ? (
							<DeckViewer fileUrl={pdfUrl} highlight={highlight} />
						) : (
							<div className="flex h-full items-center justify-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading deck…</div>
						)}
					</div>

					{/* Right: streamed analysis + scorecard */}
					<div className="min-h-0 overflow-y-auto rounded-lg border border-border p-4">
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
							<div className="mb-4 rounded-md border border-primary/40 bg-primary/5 p-3">
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

						<Markdown text={md} />
						{streaming && <span className="ml-0.5 inline-block h-4 w-2 animate-pulse bg-primary align-middle" />}
					</div>
				</div>
			</div>
		);
	}

	// ─── List + upload view ─────────────────────────────────────────────────
	return (
		<div className="mx-auto max-w-3xl p-6">
			<h1 className="text-xl font-semibold">Pitch Deck Analyzer</h1>
			<p className="mt-1 text-sm text-muted-foreground">
				Upload your deck (PDF, PPT/PPTX, or DOC/DOCX) for a streamed, investor-grade read: 8 scored dimensions, claims vs evidence,
				risks, and how to improve — shown side-by-side with your deck. Paid feature; each analysis uses credits.
			</p>

			<div
				onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
				onDragLeave={() => setDragOver(false)}
				onDrop={onDrop}
				className={`mt-6 flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 text-center transition-colors ${dragOver ? 'border-primary bg-muted/50' : 'border-border'}`}
			>
				<Upload className="h-6 w-6 text-muted-foreground" />
				<div className="text-sm text-muted-foreground">Drag &amp; drop your deck, or</div>
				<Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
					{uploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading…</> : 'Choose file'}
				</Button>
				<input ref={fileInputRef} type="file" accept={ACCEPT} className="hidden" onChange={onPick} />
				<div className="text-xs text-muted-foreground">PDF, PPT/PPTX, DOC/DOCX · up to 25 MB</div>
			</div>

			<div className="mt-8">
				{(list?.length ?? 0) === 0 ? (
					<div className="text-sm text-muted-foreground">No analyses yet.</div>
				) : (
					<ul className="divide-y divide-border rounded-lg border border-border">
						{list!.map((a) => (
							<li key={a.id}>
								<button className="flex w-full items-center gap-3 p-3 text-left hover:bg-muted" onClick={() => void openAnalysis(a.id)}>
									<FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
									<div className="min-w-0 flex-1">
										<div className="truncate text-sm font-medium">{a.filename ?? 'Pitch deck'}</div>
										<div className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</div>
									</div>
									{a.overall_score != null && a.status === 'done' && <ScorePill value={a.overall_score} />}
									<span className="text-xs capitalize text-muted-foreground">{a.status}</span>
									<ChevronRight className="h-4 w-4 text-muted-foreground" />
								</button>
							</li>
						))}
					</ul>
				)}
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

interface StreamHandlers { onDelta: (t: string) => void; onDone: (sc: Scorecard | null) => void; onError: (m: string) => void }

async function consumeStream(stream: ReadableStream<Uint8Array>, h: StreamHandlers, signal: AbortSignal): Promise<void> {
	const reader = stream.getReader();
	signal.addEventListener('abort', () => { void reader.cancel().catch(() => { /* ignore */ }); });
	const decoder = new TextDecoder();
	let buffer = '';
	while (true) {
		if (signal.aborted) return;
		const { value, done } = await reader.read();
		if (done) break;
		buffer += decoder.decode(value, { stream: true });
		let sep: number;
		while ((sep = buffer.indexOf('\n\n')) !== -1) {
			const raw = buffer.slice(0, sep);
			buffer = buffer.slice(sep + 2);
			let event = 'message';
			let data = '';
			for (const line of raw.split('\n')) {
				if (line.startsWith('event:')) event = line.slice(6).trim();
				else if (line.startsWith('data:')) data += line.slice(5).trim();
			}
			if (!data) continue;
			try {
				const parsed = JSON.parse(data);
				if (event === 'delta' && typeof parsed.text === 'string') h.onDelta(parsed.text);
				else if (event === 'done') h.onDone((parsed.scorecard ?? null) as Scorecard | null);
				else if (event === 'error') h.onError(parsed.message ?? 'Analysis failed');
			} catch { /* skip malformed */ }
		}
	}
}
