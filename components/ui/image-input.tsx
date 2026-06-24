'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Upload, Link2, Trash2, Loader2, Image as ImageIcon, Check } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getSupabaseBrowser } from '@/lib/supabase/client';
import { useConfirm } from '@/components/ui/confirm-dialog';

/**
 * Image picker with two modes:
 *   • URL — paste a URL.
 *   • Upload — pick / drag-drop a file, lands in Supabase Storage.
 *
 * `onChange` fires only at commit boundaries (URL blur/Enter, upload success,
 * reset) — never on individual keystrokes — so auto-save parents don't write
 * partial URLs to the DB.
 *
 * Reset button: deletes the file from Storage when the current value lives
 * in our bucket, then clears the field. External URLs are just cleared.
 *
 * RLS lives on `storage.objects` for `public-images` (see migration
 * 20260522120000_profile_avatar_and_storage.sql).
 */

const BUCKET_DEFAULT = 'public-images';
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);

interface ImageInputProps {
	value: string;
	onChange: (url: string) => void;
	pathPrefix: string;
	bucket?: string;
	placeholder?: string;
	disabled?: boolean;
}

export function ImageInput({
	value, onChange, pathPrefix, bucket = BUCKET_DEFAULT,
	placeholder = 'https://…', disabled = false,
}: ImageInputProps) {
	const confirm = useConfirm();
	const initialMode: 'url' | 'upload' =
		value && value.includes(`/storage/v1/object/public/${bucket}/`) ? 'upload' : 'url';
	const [mode, setMode] = useState<'url' | 'upload'>(initialMode);

	const [draftUrl, setDraftUrl] = useState(value);
	const [uploading, setUploading] = useState(false);
	const [resetting, setResetting] = useState(false);
	const [dragOver, setDragOver] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => { setDraftUrl(value); }, [value]);

	const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
	const uploadsDisabled =
		!supabaseUrl ||
		supabaseUrl.includes('localhost') ||
		supabaseUrl.includes('127.0.0.1');

	const commitUrl = () => {
		if (disabled) return;
		if (draftUrl === value) return;
		onChange(draftUrl);
	};

	const doUpload = async (file: File) => {
		if (disabled || uploading) return;
		if (!ALLOWED_MIME.has(file.type)) {
			toast.error(`Unsupported type ${file.type || '(unknown)'}. Allowed: PNG, JPEG, WebP, GIF.`);
			return;
		}
		if (file.size > MAX_BYTES) {
			toast.error(`File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max 5 MB.`);
			return;
		}
		setUploading(true);
		try {
			const supabase = getSupabaseBrowser();
			const ext = (file.name.match(/\.([a-zA-Z0-9]+)$/)?.[1] ?? mimeExt(file.type)).toLowerCase();
			const key = `${pathPrefix.replace(/\/$/, '')}/${crypto.randomUUID()}.${ext}`;
			const { error } = await supabase.storage.from(bucket).upload(key, file, {
				cacheControl: '31536000',
				upsert: false,
				contentType: file.type,
			});
			if (error) throw error;
			const { data: pub } = supabase.storage.from(bucket).getPublicUrl(key);
			onChange(pub.publicUrl);
			toast.success('Uploaded');
		} catch (e) {
			toast.error((e as Error).message || 'Upload failed');
		} finally {
			setUploading(false);
		}
	};

	const onFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
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

	const doReset = async () => {
		if (disabled || resetting || !value) return;
		const ourBucket = isOurBucketUrl(value, bucket);
		if (!(await confirm(ourBucket
			? {
				title: 'Delete image?',
				description: 'This image will be deleted from storage and the field cleared. This cannot be undone.',
				confirmLabel: 'Delete',
				destructive: true,
			}
			: {
				title: 'Clear image URL?',
				description: 'This only clears the field — the external link is not deleted from storage.',
				confirmLabel: 'Clear',
			}))) return;
		setResetting(true);
		try {
			if (ourBucket) {
				const key = extractStorageKey(value, bucket);
				if (key) {
					const supabase = getSupabaseBrowser();
					const { error } = await supabase.storage.from(bucket).remove([key]);
					if (error) throw error;
				}
			}
			onChange('');
			toast.success(ourBucket ? 'Image deleted' : 'Cleared');
		} catch (e) {
			toast.error(`Couldn't delete file: ${(e as Error).message}`);
		} finally {
			setResetting(false);
		}
	};

	const dirty = draftUrl !== value;

	return (
		<div className="grid gap-2">
			<Tabs value={mode} onValueChange={(v) => setMode(v as 'url' | 'upload')}>
				<TabsList>
					<TabsTrigger value="url" className="gap-1.5">
						<Link2 className="h-3 w-3" /> URL
					</TabsTrigger>
					<TabsTrigger
						value="upload"
						disabled={uploadsDisabled}
						title={uploadsDisabled ? 'Uploads disabled — Supabase Storage is remote-only in local dev.' : undefined}
						className="gap-1.5"
					>
						<Upload className="h-3 w-3" /> Upload
					</TabsTrigger>
				</TabsList>

				<TabsContent value="url" className="mt-2">
					<div className="flex gap-2">
						<Input
							type="url"
							placeholder={placeholder}
							value={draftUrl}
							onChange={(e) => setDraftUrl(e.target.value)}
							onBlur={commitUrl}
							onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commitUrl(); } }}
							disabled={disabled}
						/>
						<Button
							type="button"
							onClick={commitUrl}
							disabled={disabled || !dirty}
							title={dirty ? 'Save URL' : 'No changes'}
						>
							<Check className="h-3 w-3 mr-1" /> Save URL
						</Button>
					</div>
				</TabsContent>

				<TabsContent value="upload" className="mt-2">
					<input
						ref={fileInputRef}
						type="file"
						accept="image/png,image/jpeg,image/webp,image/gif"
						onChange={onFilePicked}
						className="hidden"
					/>
					<div
						onClick={() => !disabled && !uploading && fileInputRef.current?.click()}
						onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
						onDragLeave={() => setDragOver(false)}
						onDrop={onDrop}
						className={cn(
							'border border-dashed rounded-md flex flex-col items-center justify-center gap-1.5 py-5 px-4 text-xs text-muted-foreground transition-colors',
							dragOver ? 'border-primary bg-accent' : 'border-border bg-muted/40',
							disabled || uploading ? 'cursor-default' : 'cursor-pointer hover:bg-accent/50',
						)}
					>
						{uploading ? (
							<>
								<Loader2 className="h-5 w-5 animate-spin" />
								<div>Uploading…</div>
							</>
						) : (
							<>
								<ImageIcon className="h-5 w-5" />
								<div>Click to pick a file, or drag and drop</div>
								<div className="text-[10px]">PNG · JPEG · WebP · GIF · max 5 MB</div>
							</>
						)}
					</div>
				</TabsContent>
			</Tabs>

			{value && (
				<div className="flex items-center gap-2.5 p-1.5 bg-muted border rounded-md">
					{/* eslint-disable-next-line @next/next/no-img-element */}
					<img
						src={value}
						alt=""
						className="w-12 h-12 object-cover bg-background rounded"
						onError={(e) => { (e.currentTarget.style.opacity = '0.3'); }}
					/>
					<div className="flex-1 min-w-0 text-[11px] text-muted-foreground break-all font-mono">
						{value}
					</div>
					<Button
						type="button"
						variant="ghost"
						size="icon"
						onClick={() => void doReset()}
						title={isOurBucketUrl(value, bucket) ? 'Delete from storage + clear field' : 'Clear field'}
						disabled={disabled || resetting}
					>
						{resetting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
					</Button>
				</div>
			)}
		</div>
	);
}

function mimeExt(mime: string): string {
	if (mime === 'image/jpeg') return 'jpg';
	if (mime === 'image/png') return 'png';
	if (mime === 'image/webp') return 'webp';
	if (mime === 'image/gif') return 'gif';
	return 'bin';
}

function isOurBucketUrl(url: string, bucket: string): boolean {
	return !!url && url.includes(`/storage/v1/object/public/${bucket}/`);
}

function extractStorageKey(url: string, bucket: string): string {
	const marker = `/storage/v1/object/public/${bucket}/`;
	const idx = url.indexOf(marker);
	if (idx < 0) return '';
	return url.slice(idx + marker.length).split('?')[0]!;
}
