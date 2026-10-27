/**
 * One rule for every pitch-deck upload (Add your company, Deck analysis, Share a
 * deal). Matches the storage buckets (`claim-decks`, `user-uploads`: 50 MB) — a
 * file is checked here when it's picked, so it never fails later at "Submit"
 * with a raw storage error.
 */
export const MAX_DECK_MB = 50;
export const MAX_DECK_BYTES = MAX_DECK_MB * 1024 * 1024;

const mb = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

/** A specific reason to refuse `file`, or null if it can be uploaded. `exts` like ['pdf', 'pptx']. */
export function deckFileError(file: File, exts: string[]): string | null {
	const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
	if (!exts.includes(ext)) return `“${file.name}” isn’t a supported format. Upload a ${listOf(exts)} file.`;
	if (file.size === 0) return `“${file.name}” is empty. Choose the file again.`;
	if (file.size > MAX_DECK_BYTES) return `Your pitch deck is ${mb(file.size)} — the maximum is ${MAX_DECK_MB} MB. Compress it (e.g. export the PDF at a smaller size) and try again.`;
	return null;
}

/** Storage's raw upload error → what actually went wrong, in words a founder can act on. */
export function deckUploadError(message: string | undefined, file: File, exts: string[]): string {
	const m = (message ?? '').toLowerCase();
	if (m.includes('maximum allowed size') || m.includes('payload too large') || m.includes('413')) {
		return `Your pitch deck is ${mb(file.size)} — the maximum is ${MAX_DECK_MB} MB.`;
	}
	if (m.includes('mime') || m.includes('not supported') || m.includes('invalid file type')) {
		return `“${file.name}” isn’t a supported format. Upload a ${listOf(exts)} file.`;
	}
	if (m.includes('network') || m.includes('failed to fetch')) {
		return 'The pitch deck upload was interrupted. Check your connection and try again.';
	}
	return `Couldn’t upload your pitch deck${message ? ` (${message})` : ''}. Please try again.`;
}

function listOf(exts: string[]): string {
	const up = exts.map((e) => e.toUpperCase());
	return up.length > 1 ? `${up.slice(0, -1).join(', ')} or ${up[up.length - 1]}` : up[0] ?? '';
}

const MIME_BY_EXT: Record<string, string> = {
	pdf: 'application/pdf',
	ppt: 'application/vnd.ms-powerpoint',
	pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
	doc: 'application/msword',
	docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

/** The upload's content type. Some browsers report '' for .pptx/.docx, and the
 *  buckets allow-list real types only — 'application/octet-stream' is refused. */
export function deckContentType(file: File): string {
	const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
	return file.type || MIME_BY_EXT[ext] || 'application/octet-stream';
}
