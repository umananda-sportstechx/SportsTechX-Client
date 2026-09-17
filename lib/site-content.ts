/**
 * Reads the CMS-managed imagery and testimonials for this site.
 *
 * Contract, lifted from landing/lib/newsletter.ts: a failure NEVER blanks the
 * page. Any error, timeout or non-200 returns `{}`, and every consumer falls
 * back to the placeholder array it already shipped with. The same rule covers
 * an empty section — an array with one item renders exactly one card, never one
 * plus five placeholders.
 *
 * Fetched server-side once per revalidation window, not once per visitor, so
 * the public asset URLs come out of Next's cache rather than Supabase.
 */
const SITE = 'atlas';
const REVALIDATE_SEC = 300;

export interface SiteItem {
	url: string | null;
	alt: string;
	logoUrl: string | null;
	logoAlt: string;
	title: string | null;
	subtitle: string | null;
	body: string | null;
}

export interface SiteSections {
	gallery?: SiteItem[];
	team?: SiteItem[];
	dashboard?: SiteItem[];
	testimonials?: SiteItem[];
}

export async function siteContent(): Promise<SiteSections> {
	// BACKEND_URL is the same server-side variable next.config.ts rewrites with.
	// A relative /api path cannot be used here: this runs on the server, where
	// the rewrite does not apply.
	//
	// No fallback port on purpose. Guessing one means an unset BACKEND_URL
	// fetches whatever else happens to be on that port, the catch below hides
	// it, and the site looks like a CMS nobody has filled in yet.
	const base = process.env.BACKEND_URL;
	if (!base) return {};
	try {
		const res = await fetch(`${base}/api/public/site-content?site=${SITE}`, {
			next: { revalidate: REVALIDATE_SEC },
			signal: AbortSignal.timeout(8000),
		});
		if (!res.ok) return {};
		const json = (await res.json()) as { sections?: SiteSections };
		return json.sections ?? {};
	} catch {
		return {};
	}
}
