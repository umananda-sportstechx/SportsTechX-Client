'use client';

import { useRef, useState } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { Upload, Loader2, CheckCircle2, AlertCircle, Clock, ChevronDown, ChevronRight, TrendingUp, Users, Target, Banknote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getSupabaseBrowser } from '@/lib/supabase/client';
import { apiRequest } from '@/lib/query-client';
import { qk } from '@/lib/query-keys';

/**
 * Founder-facing pitch-deck analyzer. Upload a PDF deck → Claude reads it
 * natively (no pre-extraction) → structured score, stage, traction/team/market
 * summary, strengths, and risks. Paid-tier feature; each analysis costs credits.
 * The deck PDF is uploaded to the private user-uploads bucket; a background
 * worker runs the analysis.
 */

const BUCKET = 'user-uploads';
const MAX_BYTES = 25 * 1024 * 1024;

interface DeckAnalysis {
	id: string;
	filename: string | null;
	status: 'pending' | 'processing' | 'done' | 'failed' | 'unsupported' | string;
	error: string | null;
	stage: string | null;
	raise_amount_usd: string | null;
	traction_summary: string | null;
	team_summary: string | null;
	market_summary: string | null;
	business_model: string | null;
	strengths: string[] | null;
	risks: string[] | null;
	overall_score: number | null;
	score_rationale: string | null;
	market_context: string | null;
	created_at: string;
}

export default function PitchAnalyzerPage() {
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [uploading, setUploading] = useState(false);
	const [dragOver, setDragOver] = useState(false);

	const { data: analyses, mutate, isLoading } = useSWR<DeckAnalysis[]>(qk.deckAnalysis.list(), {
		refreshInterval: (data) =>
			(data ?? []).some((a) => a.status === 'pending' || a.status === 'processing') ? 4000 : 0,
	});

	const analyze = async (file: File) => {
		if (uploading) return;
		if (file.type !== 'application/pdf') {
			toast.error('Pitch decks must be PDF. Export your deck as PDF and try again.');
			return;
		}
		if (file.size > MAX_BYTES) {
			toast.error(`File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max 25 MB.`);
			return;
		}
		setUploading(true);
		try {
			const supabase = getSupabaseBrowser();
			const { data: auth } = await supabase.auth.getUser();
			const uid = auth.user?.id;
			if (!uid) throw new Error('Not signed in');

			const key = `${uid}/decks/${crypto.randomUUID()}.pdf`;
			const { error } = await supabase.storage.from(BUCKET).upload(key, file, { upsert: false, contentType: file.type });
			if (error) throw error;

			const res = await apiRequest('POST', '/api/deck-analysis', { storage_path: key, filename: file.name });
			if (!res.ok) {
				const body = await res.json().catch(() => null);
				const msg = body?.error?.message as string | undefined;
				if (res.status === 403) throw new Error(msg ?? 'Pitch deck analysis is available on paid plans.');
				if (res.status === 402) throw new Error(msg ?? 'Not enough credits for a deck analysis.');
				throw new Error(msg ?? 'Could not start analysis');
			}
			toast.success('Deck uploaded — analyzing…');
			await mutate();
		} catch (e) {
			toast.error((e as Error).message || 'Upload failed');
		} finally {
			setUploading(false);
		}
	};

	const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
		const f = e.target.files?.[0];
		if (f) void analyze(f);
		e.target.value = '';
	};
	const onDrop = (e: React.DragEvent) => {
		e.preventDefault();
		setDragOver(false);
		const f = e.dataTransfer.files?.[0];
		if (f) void analyze(f);
	};

	return (
		<div className="mx-auto max-w-3xl p-6">
			<h1 className="text-xl font-semibold">Pitch Deck Analyzer</h1>
			<p className="mt-1 text-sm text-muted-foreground">
				Upload your pitch deck (PDF) for an instant investor-style read: stage, raise, traction, team,
				market, strengths, risks, and an investability score. Paid feature — each analysis uses credits.
			</p>

			<div
				onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
				onDragLeave={() => setDragOver(false)}
				onDrop={onDrop}
				className={`mt-6 flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
					dragOver ? 'border-primary bg-muted/50' : 'border-border'
				}`}
			>
				<Upload className="h-6 w-6 text-muted-foreground" />
				<div className="text-sm text-muted-foreground">Drag &amp; drop your deck PDF, or</div>
				<Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
					{uploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading…</> : 'Choose PDF'}
				</Button>
				<input ref={fileInputRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={onPick} />
				<div className="text-xs text-muted-foreground">PDF only · up to 25 MB</div>
			</div>

			<div className="mt-8">
				{isLoading ? (
					<div className="flex items-center gap-2 text-sm text-muted-foreground">
						<Loader2 className="h-4 w-4 animate-spin" /> Loading…
					</div>
				) : (analyses?.length ?? 0) === 0 ? (
					<div className="text-sm text-muted-foreground">No deck analyses yet.</div>
				) : (
					<div className="flex flex-col gap-3">
						{analyses!.map((a) => <AnalysisCard key={a.id} a={a} />)}
					</div>
				)}
			</div>
		</div>
	);
}

function AnalysisCard({ a }: { a: DeckAnalysis }) {
	const [open, setOpen] = useState(a.status === 'done');
	const done = a.status === 'done';
	return (
		<div className="rounded-lg border border-border">
			<button
				className="flex w-full items-center gap-3 p-3 text-left"
				onClick={() => done && setOpen((v) => !v)}
				disabled={!done}
			>
				{done ? (open ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />) : <span className="w-4" />}
				<div className="min-w-0 flex-1">
					<div className="truncate text-sm font-medium">{a.filename ?? 'Pitch deck'}</div>
					<div className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</div>
					{a.error && <div className="mt-0.5 truncate text-xs text-destructive" title={a.error}>{a.error}</div>}
				</div>
				{done && a.overall_score != null && <ScoreBadge score={a.overall_score} />}
				<StatusBadge status={a.status} />
			</button>

			{done && open && (
				<div className="border-t border-border p-4 text-sm">
					<div className="grid grid-cols-2 gap-3">
						<Field icon={<Banknote className="h-3.5 w-3.5" />} label="Stage" value={a.stage} />
						<Field icon={<Banknote className="h-3.5 w-3.5" />} label="Raise" value={a.raise_amount_usd ? `$${Number(a.raise_amount_usd).toLocaleString()}` : null} />
					</div>
					<Para icon={<TrendingUp className="h-3.5 w-3.5" />} label="Traction" value={a.traction_summary} />
					<Para icon={<Users className="h-3.5 w-3.5" />} label="Team" value={a.team_summary} />
					<Para icon={<Target className="h-3.5 w-3.5" />} label="Market" value={a.market_summary} />
					<Para label="Business model" value={a.business_model} />
					<Para label="Market context" value={a.market_context} />
					{a.score_rationale && <Para label="Why this score" value={a.score_rationale} />}
					<TwoCols
						left={{ label: 'Strengths', items: Array.isArray(a.strengths) ? a.strengths : [], tone: 'pos' }}
						right={{ label: 'Risks', items: Array.isArray(a.risks) ? a.risks : [], tone: 'neg' }}
					/>
				</div>
			)}
		</div>
	);
}

function ScoreBadge({ score }: { score: number }) {
	const color = score >= 70 ? 'text-emerald-600' : score >= 45 ? 'text-amber-600' : 'text-destructive';
	return <span className={`shrink-0 text-sm font-bold ${color}`}>{score}<span className="text-xs font-normal text-muted-foreground">/100</span></span>;
}

function Field({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string | null }) {
	if (!value) return null;
	return (
		<div>
			<div className="flex items-center gap-1 text-xs uppercase tracking-wide text-muted-foreground">{icon} {label}</div>
			<div className="mt-0.5 font-medium">{value}</div>
		</div>
	);
}

function Para({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string | null }) {
	if (!value) return null;
	return (
		<div className="mt-3">
			<div className="flex items-center gap-1 text-xs uppercase tracking-wide text-muted-foreground">{icon} {label}</div>
			<div className="mt-0.5 text-muted-foreground">{value}</div>
		</div>
	);
}

function TwoCols({ left, right }: { left: { label: string; items: string[]; tone: 'pos' | 'neg' }; right: { label: string; items: string[]; tone: 'pos' | 'neg' } }) {
	if (left.items.length === 0 && right.items.length === 0) return null;
	return (
		<div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
			{[left, right].map((col) => (
				<div key={col.label}>
					<div className="text-xs uppercase tracking-wide text-muted-foreground">{col.label}</div>
					<ul className="mt-1 space-y-1">
						{col.items.map((it, i) => (
							<li key={i} className="flex gap-2 text-sm">
								<span className={col.tone === 'pos' ? 'text-emerald-600' : 'text-destructive'}>{col.tone === 'pos' ? '+' : '–'}</span>
								<span className="text-muted-foreground">{it}</span>
							</li>
						))}
					</ul>
				</div>
			))}
		</div>
	);
}

function StatusBadge({ status }: { status: string }) {
	const map: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
		pending: { label: 'Queued', cls: 'text-muted-foreground', icon: <Clock className="h-3.5 w-3.5" /> },
		processing: { label: 'Analyzing', cls: 'text-amber-600', icon: <Loader2 className="h-3.5 w-3.5 animate-spin" /> },
		done: { label: 'Done', cls: 'text-emerald-600', icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
		failed: { label: 'Failed', cls: 'text-destructive', icon: <AlertCircle className="h-3.5 w-3.5" /> },
		unsupported: { label: 'Unsupported', cls: 'text-destructive', icon: <AlertCircle className="h-3.5 w-3.5" /> },
	};
	const s = map[status] ?? map.pending!;
	return <span className={`flex shrink-0 items-center gap-1 text-xs font-medium ${s.cls}`}>{s.icon} {s.label}</span>;
}
