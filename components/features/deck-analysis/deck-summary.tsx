'use client';

import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { toast } from 'sonner';
import { Loader2, ArrowUpRight } from 'lucide-react';
import { getSupabaseBrowser } from '@/lib/supabase/client';
import { apiRequest } from '@/lib/query-client';
import { qk } from '@/lib/query-keys';
import { isInsufficientCreditsError } from '@/lib/credit-events';
import type { DeckListItem, DeckScorecard } from '@/lib/deck-analysis';
import { Screen, Card, Button, Badge, Loading, StagedLoader } from '@/components/atlas';
import { rating } from './score-tone';
import { DECK_ANALYSIS_STAGES } from './deck-stages';

/**
 * Deck analysis — upload + latest summary (canvas: deckEmpty / deckProcessing /
 * deckSummary). Shared by Raise "Pitch Deck" and Scout "Deck Screener": same
 * backend (upload → /api/deck-analysis → stream), product-specific copy. The
 * full analysis lives at `${basePath}/[id]` (DeckAnalysisDetail).
 */
const BUCKET = 'user-uploads';
const MAX_BYTES = 25 * 1024 * 1024;
const ALLOWED_EXT = ['pdf', 'ppt', 'pptx', 'doc', 'docx'];
const ACCEPT = 'application/pdf,.pdf,.ppt,.pptx,.doc,.docx';
const AREAS = [
	{ h: 'Story', items: ['Problem', 'Solution', 'Market', 'Product'] },
	{ h: 'Business and traction', items: ['Business model', 'Competition', 'Go-to-market', 'Traction'] },
	{ h: 'Numbers and team', items: ['Financials', 'Team', 'The ask'] },
];

export interface DeckSummaryCopy {
	emptyTitle: string;
	emptyBody: string;
	emptyCta: string;
	/** Name used when a deck has no filename. */
	fallbackName: string;
	/** Optional extra block on the empty card (e.g. Scout's "What you'll get"). */
	emptyExtra?: ReactNode;
}

export const FOUNDER_DECK_COPY: DeckSummaryCopy = {
	emptyTitle: 'See how investors will read your deck',
	emptyBody: "Upload your current pitch deck and Atlas will score it, flag what's missing or unproven, and tell you the highest-priority fixes before you send it to investors.",
	emptyCta: 'Analyse your pitch deck',
	fallbackName: 'Pitch deck',
};

export function DeckSummary({ basePath, header, copy = FOUNDER_DECK_COPY }: {
	/** Route of this page; the full analysis opens at `${basePath}/${id}`. */
	basePath: string;
	/** Page header; receives the "Upload new deck" action once a deck exists. */
	header: (actions?: ReactNode) => ReactNode;
	copy?: DeckSummaryCopy;
}) {
	const router = useRouter();
	const { data: list, mutate } = useSWR<DeckListItem[]>(qk.deckAnalysis.list(), { dedupingInterval: 10_000, refreshInterval: (d) => (d?.[0] && d[0].status !== 'done' ? 4000 : 0) });
	const latest = list?.[0] ?? null;
	const fileRef = useRef<HTMLInputElement>(null);
	const [uploading, setUploading] = useState(false);

	// Latest scorecard (verdict + top improvements) once analysis is done. The
	// deck-analysis detail returns the structured scorecard under `result_json`.
	const { data: detail } = useSWR<{ result_json: DeckScorecard | null }>(
		latest && latest.status === 'done' ? qk.deckAnalysis.detail(latest.id) : null,
	);
	const card: DeckScorecard | null = detail?.result_json ?? null;

	const analyze = async (file: File) => {
		if (uploading) return;
		const ext = (file.name.split('.').pop() ?? '').toLowerCase();
		if (!ALLOWED_EXT.includes(ext)) { toast.error('Upload a PDF, PPT/PPTX, or DOC/DOCX.'); return; }
		if (file.size > MAX_BYTES) { toast.error('File too large (max 25 MB).'); return; }
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
				throw new Error((body?.error?.message as string) ?? (res.status === 403 ? 'Pitch deck analysis is a paid feature.' : 'Could not start analysis'));
			}
			const { id } = (await res.json()) as { id: string };
			await mutate();
			router.push(`${basePath}/${id}`);
		} catch (e) {
			if (!isInsufficientCreditsError(e)) toast.error((e as Error).message ?? 'Upload failed');
		} finally { setUploading(false); }
	};
	const onPick = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) void analyze(f); e.target.value = ''; };
	const trigger = () => fileRef.current?.click();

	const head = header(latest ? <Button variant="outline" onClick={trigger} disabled={uploading}>{uploading ? <Loader2 className="animate-spin" size={13} /> : 'Upload new deck'}</Button> : undefined);
	const fileInput = <input ref={fileRef} type="file" accept={ACCEPT} className="hidden" onChange={onPick} />;

	if (!list) return <Screen><Loading /></Screen>;

	// Uploading state — covers the upload → analysis-start gap (then we navigate
	// to the streaming detail page, which shows the analysis loader).
	if (uploading) return (
		<Screen>{head}{fileInput}
			<StagedLoader title="Uploading your deck" stages={['Uploading your file…', 'Starting the analysis…']} note="Hang tight — we'll open your analysis as soon as the upload finishes." />
		</Screen>
	);

	// Empty state
	if (!latest) return (
		<Screen>{head}{fileInput}
			<Card glow="blue" style={{ padding: '21px 21px 30px' }}>
				<div className="atlas-h2">{copy.emptyTitle}</div>
				<p style={{ margin: '12px 0 0', fontSize: 12, color: 'var(--a-muted)', lineHeight: '19px', maxWidth: 632 }}>{copy.emptyBody}</p>
				{copy.emptyExtra}
				<hr className="atlas-divider" style={{ margin: '33px 0 37px' }} />
				<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 24, maxWidth: 880 }}>
					{AREAS.map((a) => (
						<div key={a.h}><div style={{ fontSize: 12, fontWeight: 700 }}>{a.h}</div>
							<div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', fontSize: 12, lineHeight: '19px', color: 'var(--a-muted)' }}>{a.items.map((it) => <span key={it}>{it}</span>)}</div></div>
					))}
				</div>
				<hr className="atlas-divider" style={{ margin: '48px 0 30px' }} />
				<Button onClick={trigger} disabled={uploading}>{uploading ? <Loader2 className="animate-spin" size={14} /> : <>{copy.emptyCta} <ArrowUpRight /></>}</Button>
			</Card>
		</Screen>
	);

	// Processing state — a prior analysis is still running (e.g. user navigated back here).
	if (latest.status !== 'done') return (
		<Screen>{head}{fileInput}
			<StagedLoader
				title={`Analysing ${latest.filename ?? 'the deck'}`}
				stages={DECK_ANALYSIS_STAGES}
				note="This usually takes about a minute. Feel free to keep working elsewhere — we'll update this page when it's ready."
			/>
			<div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
				<Button variant="outline" size="sm" onClick={() => router.push(`${basePath}/${latest.id}`)}>View live progress</Button>
			</div>
		</Screen>
	);

	// Summary state
	const score = latest.overall_score ?? 0;
	const r = rating(score);
	const improvements = (card?.suggestions ?? []).slice(0, 3);
	return (
		<Screen>{head}{fileInput}
			<Card glow="blue" style={{ padding: '21px 23px 28px' }}>
				<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
					<div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
						<Badge>latest</Badge><span style={{ fontSize: 15, fontFamily: 'var(--a-font)', fontWeight: 700 }}>{latest.filename ?? copy.fallbackName}</span>
					</div>
					<span style={{ fontFamily: 'var(--a-mono)', fontSize: 10, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--a-muted)' }}>Analysed {new Date(latest.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
				</div>
				<div style={{ display: 'flex', gap: 40, marginTop: 26, alignItems: 'flex-start', flexWrap: 'wrap' }}>
					<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
						<div style={{ width: 92, height: 92, borderRadius: '50%', border: `6px solid ${r.ring}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>
							<span style={{ fontSize: 25, fontFamily: 'var(--a-mono)', lineHeight: 1 }}>{score}</span><span style={{ fontFamily: 'var(--a-mono)', fontSize: 9, color: 'var(--a-faint)', marginTop: 4 }}>/100</span>
						</div>
						<span style={{ background: r.bg, color: r.fg, border: `1px solid color-mix(in srgb, ${r.ring} 25%, transparent)`, borderRadius: 3, padding: '4px 12px 3px', fontFamily: 'var(--a-mono)', fontSize: 9, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{r.label}</span>
					</div>
					<p style={{ margin: '6px 0 0', flex: 1, minWidth: 240, fontSize: 13, color: 'var(--a-muted)', lineHeight: 1.5 }}>{card?.verdict ?? 'Your deck has been analysed. Open the full analysis for the detailed area-by-area read.'}</p>
				</div>
				{improvements.length > 0 && <>
					<hr className="atlas-divider" style={{ margin: '28px 0 22px' }} />
					<div className="atlas-eyebrow">Top priority improvements</div>
					<div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 9, fontSize: 13, color: 'var(--a-muted)' }}>
						{improvements.map((s, i) => <span key={i}>{i + 1}. {s.suggestion}</span>)}
					</div>
				</>}
				<hr className="atlas-divider" style={{ margin: '26px 0 24px' }} />
				<div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
					<Button onClick={() => router.push(`${basePath}/${latest.id}`)}>View full analysis <ArrowUpRight /></Button>
					<Button variant="outline" onClick={trigger} disabled={uploading}>{uploading ? <Loader2 className="animate-spin" size={13} /> : 'Analyse revised deck'}</Button>
				</div>
			</Card>

			{list.length > 1 && <>
				<div className="atlas-eyebrow" style={{ margin: '32px 0 12px' }}>Previous analyses</div>
				<Card style={{ padding: '6px 23px' }}>
					{list.map((d, i) => (
						<div key={d.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,3fr) 120px 90px 90px', gap: 16, fontSize: 13, padding: '12px 0', borderBottom: i < list.length - 1 ? '1px solid var(--a-border)' : 'none', alignItems: 'center' }}>
							<span>{d.filename ?? copy.fallbackName}</span>
							<span style={{ color: 'var(--a-muted)' }}>{new Date(d.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span>
							<span style={{ textAlign: 'right' }}>{d.overall_score ?? '—'}</span>
							<a href={`${basePath}/${d.id}`} className="atlas-action" style={{ justifySelf: 'end' }}><span className="atlas-action__icon"><ArrowUpRight /></span>Open</a>
						</div>
					))}
				</Card>
			</>}
		</Screen>
	);
}
