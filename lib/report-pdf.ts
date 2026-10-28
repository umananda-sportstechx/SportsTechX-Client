import { toast } from 'sonner';
import { apiRequest } from '@/lib/query-client';

/**
 * Download a report's PDF. (Viewing happens in-app at /reports/:slug — see
 * pdf-report-view — so a raw storage link is never shown.)
 *
 * The URL has to be minted per request: self-hosted PDFs get a fresh signed
 * URL from `/api/reports/versions/:id/pdf-url` (tier-gated with the caller's
 * own token), so nothing here can be a plain href. The `download=1` URL
 * carries a Content-Disposition, so an anchor click saves the file in place.
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

async function pdfUrl(versionId: string): Promise<string | null> {
	const res = await apiRequest('GET', `/api/reports/versions/${versionId}/pdf-url?download=1`);
	if (!res.ok) return null;
	return ((await res.json()) as { url?: string }).url ?? null;
}

export async function downloadReport(slug: string, versionId?: string): Promise<void> {
	try {
		const id = await versionFor(slug, versionId);
		const url = id ? await pdfUrl(id) : null;
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
