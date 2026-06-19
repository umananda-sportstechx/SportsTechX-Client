'use client';

import { useRef, useState } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { Upload, Trash2, Loader2, FileText, Image as ImageIcon, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getSupabaseBrowser } from '@/lib/supabase/client';
import { apiRequest } from '@/lib/query-client';
import { qk } from '@/lib/query-keys';

/**
 * "My Documents" — upload PDFs / images that get embedded into the user's
 * private knowledge base and become searchable in the AI chat (the agent's
 * `search_knowledge` tool, scoped to the owner). The browser uploads straight
 * to the private `user-uploads` bucket; the server records it and a background
 * worker extracts + embeds it.
 */

const BUCKET = 'user-uploads';
const MAX_BYTES = 25 * 1024 * 1024;
const ALLOWED = new Set(['application/pdf', 'image/png', 'image/jpeg', 'image/webp']);

interface UserUpload {
	id: string;
	filename: string | null;
	mime_type: string | null;
	kind: 'document' | 'image' | string;
	status: 'pending' | 'processing' | 'done' | 'failed' | 'unsupported' | string;
	error: string | null;
	created_at: string;
}

export default function DocumentsPage() {
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [uploading, setUploading] = useState(false);
	const [dragOver, setDragOver] = useState(false);

	const { data: uploads, mutate, isLoading } = useSWR<UserUpload[]>(qk.uploads.list(), {
		// Poll while anything is still being processed so statuses live-update.
		refreshInterval: (data) =>
			(data ?? []).some((u) => u.status === 'pending' || u.status === 'processing') ? 4000 : 0,
	});

	const doUpload = async (file: File) => {
		if (uploading) return;
		if (!ALLOWED.has(file.type)) {
			toast.error(`Unsupported type ${file.type || '(unknown)'}. Allowed: PDF, PNG, JPEG, WebP.`);
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

			const ext = (file.name.match(/\.([a-zA-Z0-9]+)$/)?.[1] ?? 'bin').toLowerCase();
			const key = `${uid}/${crypto.randomUUID()}.${ext}`;
			const { error } = await supabase.storage.from(BUCKET).upload(key, file, {
				upsert: false,
				contentType: file.type,
			});
			if (error) throw error;

			const res = await apiRequest('POST', '/api/uploads', {
				storage_path: key,
				filename: file.name,
				mime_type: file.type,
				kind: file.type.startsWith('image/') ? 'image' : 'document',
			});
			if (!res.ok) throw new Error((await res.text().catch(() => '')) || 'Failed to register upload');

			toast.success('Uploaded — processing…');
			await mutate();
		} catch (e) {
			toast.error((e as Error).message || 'Upload failed');
		} finally {
			setUploading(false);
		}
	};

	const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
		const f = e.target.files?.[0];
		if (f) void doUpload(f);
		e.target.value = '';
	};

	const onDrop = (e: React.DragEvent) => {
		e.preventDefault();
		setDragOver(false);
		const f = e.dataTransfer.files?.[0];
		if (f) void doUpload(f);
	};

	const remove = async (id: string) => {
		if (!confirm('Delete this document and its embeddings? This cannot be undone.')) return;
		try {
			const res = await apiRequest('DELETE', `/api/uploads/${id}`);
			if (!res.ok) throw new Error('Delete failed');
			await mutate();
		} catch (e) {
			toast.error((e as Error).message || 'Delete failed');
		}
	};

	return (
		<div className="mx-auto max-w-3xl p-6">
			<h1 className="text-xl font-semibold">My Documents</h1>
			<p className="mt-1 text-sm text-muted-foreground">
				Upload PDFs or images to your private knowledge base. Once processed, the AI chat can search them.
			</p>

			{/* Dropzone */}
			<div
				onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
				onDragLeave={() => setDragOver(false)}
				onDrop={onDrop}
				className={`mt-6 flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
					dragOver ? 'border-primary bg-muted/50' : 'border-border'
				}`}
			>
				<Upload className="h-6 w-6 text-muted-foreground" />
				<div className="text-sm text-muted-foreground">Drag &amp; drop a PDF or image, or</div>
				<Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
					{uploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading…</> : 'Choose file'}
				</Button>
				<input
					ref={fileInputRef}
					type="file"
					accept=".pdf,image/png,image/jpeg,image/webp"
					className="hidden"
					onChange={onPick}
				/>
				<div className="text-xs text-muted-foreground">PDF, PNG, JPEG, WebP · up to 25 MB</div>
			</div>

			{/* List */}
			<div className="mt-8">
				{isLoading ? (
					<div className="flex items-center gap-2 text-sm text-muted-foreground">
						<Loader2 className="h-4 w-4 animate-spin" /> Loading…
					</div>
				) : (uploads?.length ?? 0) === 0 ? (
					<div className="text-sm text-muted-foreground">No documents yet.</div>
				) : (
					<ul className="divide-y divide-border rounded-lg border border-border">
						{uploads!.map((u) => (
							<li key={u.id} className="flex items-center gap-3 p-3">
								{u.kind === 'image' ? <ImageIcon className="h-5 w-5 shrink-0 text-muted-foreground" /> : <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />}
								<div className="min-w-0 flex-1">
									<div className="truncate text-sm font-medium">{u.filename ?? '(untitled)'}</div>
									<div className="text-xs text-muted-foreground">{new Date(u.created_at).toLocaleString()}</div>
									{u.error && <div className="mt-0.5 truncate text-xs text-destructive" title={u.error}>{u.error}</div>}
								</div>
								<StatusBadge status={u.status} />
								<button onClick={() => remove(u.id)} aria-label="Delete" className="shrink-0 rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive">
									<Trash2 className="h-4 w-4" />
								</button>
							</li>
						))}
					</ul>
				)}
			</div>
		</div>
	);
}

function StatusBadge({ status }: { status: string }) {
	const map: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
		pending: { label: 'Queued', cls: 'text-muted-foreground', icon: <Clock className="h-3.5 w-3.5" /> },
		processing: { label: 'Processing', cls: 'text-amber-600', icon: <Loader2 className="h-3.5 w-3.5 animate-spin" /> },
		done: { label: 'Ready', cls: 'text-emerald-600', icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
		failed: { label: 'Failed', cls: 'text-destructive', icon: <AlertCircle className="h-3.5 w-3.5" /> },
		unsupported: { label: 'Unsupported', cls: 'text-destructive', icon: <AlertCircle className="h-3.5 w-3.5" /> },
	};
	const s = map[status] ?? map.pending!;
	return (
		<span className={`flex shrink-0 items-center gap-1 text-xs font-medium ${s.cls}`}>
			{s.icon} {s.label}
		</span>
	);
}
