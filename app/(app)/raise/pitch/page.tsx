'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { getSupabaseBrowser } from '@/lib/supabase/client';
import { apiRequest } from '@/lib/query-client';
import { qk } from '@/lib/query-keys';
import { isInsufficientCreditsError } from '@/lib/credit-events';
import type { DeckListItem, DeckScorecard } from '@/lib/deck-analysis';
import { Screen, H1, Sub, Card, Button, Badge, Loading } from '@/components/atlas/kit';
import { StagedLoader, DECK_ANALYSIS_STAGES } from '@/components/atlas/staged-loader';

/**
 * Atlas Raise — Pitch deck (canvas: deckEmpty / deckProcessing / deckSummary).
 * Reuses the deck-analysis backend (upload → /api/deck-analysis → stream). The
 * full-analysis detail stays on the existing /raise/pitch/[id] streaming view.
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

function rating(score: number): { label: string; ring: string; bg: string; fg: string } {
	if (score < 50) return { label: 'Early Stage', ring: '#C0392B', bg: '#FCEBEB', fg: '#791F1F' };
	if (score < 70) return { label: 'Developing', ring: '#EF9F27', bg: '#FAEEDA', fg: '#854F0B' };
	if (score < 83) return { label: 'Investor Ready', ring: '#9B9A93', bg: '#F2F1EC', fg: '#6B6A64' };
	if (score < 93) return { label: 'Strong', ring: '#3B6D11', bg: '#EAF3DE', fg: '#27500A' };
	return { label: 'Exceptional', ring: '#27500A', bg: '#EAF3DE', fg: '#27500A' };
}

export default function RaisePitchPage() {
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
			router.push(`/raise/pitch/${id}`);
		} catch (e) {
			if (!isInsufficientCreditsError(e)) toast.error((e as Error).message ?? 'Upload failed');
		} finally { setUploading(false); }
	};
	const onPick = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) void analyze(f); e.target.value = ''; };
	const trigger = () => fileRef.current?.click();

	const header = (
		<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20 }}>
			<div><H1>Pitch deck</H1><Sub>Analyse and improve your fundraising deck.</Sub></div>
			{latest && <Button variant="outline" onClick={trigger} disabled={uploading}>{uploading ? <Loader2 className="spin" size={13} /> : 'Upload new deck'}</Button>}
		</div>
	);
	const fileInput = <input ref={fileRef} type="file" accept={ACCEPT} className="hidden" onChange={onPick} />;

	if (!list) return <Screen><Loading /></Screen>;

	// Uploading state — covers the upload → analysis-start gap (then we navigate
	// to the streaming detail page, which shows the analysis loader).
	if (uploading) return (
		<Screen>{header}{fileInput}
			<StagedLoader title="Uploading your deck" stages={['Uploading your file…', 'Starting the analysis…']} note="Hang tight — we'll open your analysis as soon as the upload finishes." />
		</Screen>
	);

	// Empty state
	if (!latest) return (
		<Screen>{header}{fileInput}
			<Card focus style={{ marginTop: 24, padding: '28px 32px' }}>
				<div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
					<span style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--a-border)' }} />
					<div style={{ fontSize: 16, fontWeight: 600 }}>See how investors will read your deck</div>
				</div>
				<p style={{ margin: '20px 0 0', fontSize: 13, color: 'var(--a-muted)', lineHeight: 1.5, maxWidth: 940 }}>Upload your current pitch deck and Atlas will score it, flag what&apos;s missing or unproven, and tell you the highest-priority fixes before you send it to investors.</p>
				<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 24, margin: '32px 0', maxWidth: 1000 }}>
					{AREAS.map((a) => (
						<div key={a.h}><div style={{ fontSize: 12, fontWeight: 600 }}>{a.h}</div>
							<div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 9, fontSize: 13, color: 'var(--a-muted)' }}>{a.items.map((it) => <span key={it}>{it}</span>)}</div></div>
					))}
				</div>
				<Button onClick={trigger} disabled={uploading}>{uploading ? <Loader2 className="spin" size={14} /> : 'Analyse your pitch deck'}</Button>
			</Card>
		</Screen>
	);

	// Processing state — a prior analysis is still running (e.g. user navigated back here).
	if (latest.status !== 'done') return (
		<Screen>{header}{fileInput}
			<StagedLoader
				title={`Analysing ${latest.filename ?? 'your deck'}`}
				stages={DECK_ANALYSIS_STAGES}
				note="This usually takes about a minute. Feel free to keep working elsewhere — we'll update this page when it's ready."
			/>
			<div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
				<Button variant="outline" size="sm" onClick={() => router.push(`/raise/pitch/${latest.id}`)}>View live progress</Button>
			</div>
		</Screen>
	);

	// Summary state
	const score = latest.overall_score ?? 0;
	const r = rating(score);
	const improvements = (card?.suggestions ?? []).slice(0, 3);
	return (
		<Screen>{header}{fileInput}
			<Card focus style={{ marginTop: 24, padding: '22px 24px 28px' }}>
				<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
					<div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
						<Badge>latest</Badge><span style={{ fontSize: 15, fontWeight: 600 }}>{latest.filename ?? 'Pitch deck'}</span>
					</div>
					<span style={{ fontSize: 12, color: 'var(--a-faint)' }}>Analysed {new Date(latest.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
				</div>
				<div style={{ display: 'flex', gap: 40, marginTop: 26, alignItems: 'flex-start', flexWrap: 'wrap' }}>
					<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
						<div style={{ width: 92, height: 92, borderRadius: '50%', border: `6px solid ${r.ring}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>
							<span style={{ fontSize: 22, fontWeight: 600, lineHeight: 1 }}>{score}</span><span style={{ fontSize: 10, color: 'var(--a-faint)', marginTop: 3 }}>/100</span>
						</div>
						<span style={{ background: r.bg, color: r.fg, borderRadius: 6, padding: '4px 20px', fontSize: 11 }}>{r.label}</span>
					</div>
					<p style={{ margin: '6px 0 0', flex: 1, minWidth: 240, fontSize: 13, color: 'var(--a-muted)', lineHeight: 1.5 }}>{card?.verdict ?? 'Your deck has been analysed. Open the full analysis for the detailed area-by-area read.'}</p>
				</div>
				{improvements.length > 0 && <>
					<div style={{ marginTop: 28, fontSize: 13, fontWeight: 600 }}>Top priority improvements</div>
					<div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 9, fontSize: 13, color: 'var(--a-muted)' }}>
						{improvements.map((s, i) => <span key={i}>{i + 1}. {s.suggestion}</span>)}
					</div>
				</>}
				<div style={{ display: 'flex', gap: 16, marginTop: 26 }}>
					<Button onClick={() => router.push(`/raise/pitch/${latest.id}`)}>View full analysis</Button>
					<Button variant="outline" onClick={trigger} disabled={uploading}>{uploading ? <Loader2 className="spin" size={13} /> : 'Analyse revised deck'}</Button>
				</div>
			</Card>

			{list.length > 1 && <>
				<div style={{ margin: '26px 0 12px', fontSize: 13, fontWeight: 600 }}>Previous analyses</div>
				<Card variant="cream" style={{ padding: '20px 24px' }}>
					{list.map((d, i) => (
						<div key={d.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,3fr) 120px 90px 90px', gap: 16, fontSize: 13, padding: '12px 0', borderBottom: i < list.length - 1 ? '1px solid var(--a-border)' : 'none', alignItems: 'center' }}>
							<span>{d.filename ?? 'Pitch deck'}</span>
							<span style={{ color: 'var(--a-muted)' }}>{new Date(d.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span>
							<span style={{ textAlign: 'right' }}>{d.overall_score ?? '—'}</span>
							<a href={`/raise/pitch/${d.id}`} style={{ textAlign: 'right', color: 'var(--a-navy)' }}>Open</a>
						</div>
					))}
				</Card>
			</>}
		</Screen>
	);
}
