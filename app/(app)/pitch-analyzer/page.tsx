'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { toast } from 'sonner';
import { Upload, Loader2, FileText, ChevronRight, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getSupabaseBrowser } from '@/lib/supabase/client';
import { apiRequest } from '@/lib/query-client';
import { qk } from '@/lib/query-keys';
import { useConfirm } from '@/components/ui/confirm-dialog';
import type { DeckListItem } from '@/lib/deck-analysis';

const BUCKET = 'user-uploads';
const MAX_BYTES = 25 * 1024 * 1024;
const ALLOWED_EXT = ['pdf', 'ppt', 'pptx', 'doc', 'docx'];
const ACCEPT = 'application/pdf,.pdf,.ppt,.pptx,.doc,.docx';

export default function PitchAnalyzerPage() {
	const confirm = useConfirm();
	const router = useRouter();
	const { data: list, mutate } = useSWR<DeckListItem[]>(qk.deckAnalysis.list(), { dedupingInterval: 10_000 });
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [uploading, setUploading] = useState(false);
	const [dragOver, setDragOver] = useState(false);
	const [deleting, setDeleting] = useState<string | null>(null);

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
				const msg = body?.error?.message as string | undefined;
				if (res.status === 403) throw new Error(msg ?? 'Pitch deck analysis is a paid feature.');
				if (res.status === 402) throw new Error(msg ?? 'Not enough credits.');
				throw new Error(msg ?? 'Could not start analysis');
			}
			const { id } = (await res.json()) as { id: string };
			await mutate();
			router.push(`/pitch-analyzer/${id}`);
		} catch (e) {
			toast.error((e as Error).message ?? 'Upload failed');
		} finally {
			setUploading(false);
		}
	};

	const remove = async (e: React.MouseEvent, id: string) => {
		e.stopPropagation();
		if (!(await confirm({
			title: 'Delete analysis?',
			description: 'This analysis will be permanently deleted. This cannot be undone, and the credits spent on it are not refunded.',
			confirmLabel: 'Delete',
			destructive: true,
		}))) return;
		setDeleting(id);
		try {
			const res = await apiRequest('DELETE', `/api/deck-analysis/${id}`);
			if (!res.ok) throw new Error('Delete failed');
			await mutate();
		} catch (err) {
			toast.error((err as Error).message ?? 'Delete failed');
		} finally {
			setDeleting(null);
		}
	};

	const onPick = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) void analyze(f); e.target.value = ''; };
	const onDrop = (e: React.DragEvent) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) void analyze(f); };

	return (
		<div className="mx-auto max-w-3xl p-6">
			<h1 className="text-xl font-semibold">Pitch Deck Analyzer</h1>
			<p className="mt-1 text-sm text-muted-foreground">
				Upload your deck (PDF, PPT/PPTX, or DOC/DOCX) for a streamed, investor-grade read: 8 scored dimensions,
				claims vs evidence, risks, and how to improve — shown side-by-side with your deck. Paid feature; each analysis uses credits.
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
							<li key={a.id} className="flex items-center gap-3 p-3 hover:bg-muted">
								<button className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => router.push(`/pitch-analyzer/${a.id}`)}>
									<FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
									<div className="min-w-0 flex-1">
										<div className="truncate text-sm font-medium">{a.filename ?? 'Pitch deck'}</div>
										<div className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</div>
									</div>
									{a.overall_score != null && a.status === 'done' && <ScorePill value={a.overall_score} />}
									<span className="text-xs capitalize text-muted-foreground">{a.status}</span>
								</button>
								<button onClick={(e) => void remove(e, a.id)} disabled={deleting === a.id} aria-label="Delete" className="shrink-0 rounded p-1.5 text-muted-foreground hover:bg-background hover:text-destructive">
									{deleting === a.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
								</button>
								<ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
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
