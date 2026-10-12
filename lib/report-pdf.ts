import { toast } from 'sonner';
import { apiRequest } from '@/lib/query-client';

/**
 * Open or download a report's PDF.
 *
 * The URL has to be minted per request: self-hosted PDFs get a fresh signed
 * URL from `/api/reports/versions/:id/pdf-url` (tier-gated with the caller's
 * own token), so nothing here can be a plain href.
 *
 * Viewing opens the tab *before* the await and points it afterwards — a
 * `window.open` that only happens once the fetch resolves is no longer tied to
 * the click, and popup blockers kill it. Downloading needs no tab at all: the
 * `download=1` URL carries a Content-Disposition, so an anchor click saves the
 * file in place.
 */
interface Version { id: string; language_code: string | null; access_tier: string }

async function versionFor(slug: string, versionId?: string): Promise<string | null> {
	if (versionId) return versionId;
	const res = await apiRequest('GET', `/api/reports/${encodeURIComponent(slug)}/versions`);
	if (!res.ok) return null;
	const versions = (await res.json()) as Version[];
	// English first when there is a choice; otherwise whatever this tier may open.
	return (versions.find((v) => v.language_code === 'en') ?? versions[0])?.id ?? null;
}

async function pdfUrl(versionId: string, download: boolean): Promise<string | null> {
	const res = await apiRequest('GET', `/api/reports/versions/${versionId}/pdf-url${download ? '?download=1' : ''}`);
	if (!res.ok) return null;
	return ((await res.json()) as { url?: string }).url ?? null;
}

export async function viewReport(slug: string, versionId?: string): Promise<void> {
	const tab = window.open('', '_blank');
	try {
		const id = await versionFor(slug, versionId);
		const url = id ? await pdfUrl(id, false) : null;
		if (!url) throw new Error('no pdf');
		if (tab) tab.location.href = url;
		else window.location.href = url;
	} catch {
		tab?.close();
		toast.error('This report could not be opened. It may need a higher plan.');
	}
}

export async function downloadReport(slug: string, versionId?: string): Promise<void> {
	try {
		const id = await versionFor(slug, versionId);
		const url = id ? await pdfUrl(id, true) : null;
		if (!url) throw new Error('no pdf');
		const a = document.createElement('a');
		a.href = url;
		a.rel = 'noopener';
		document.body.appendChild(a);
		a.click();
		a.remove();
	} catch {
		toast.error('This report could not be downloaded. It may need a higher plan.');
	}
}
