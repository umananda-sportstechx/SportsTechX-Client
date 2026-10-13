'use client';

/**
 * "Walk the Pitch" pre-signup preview — a logged-out visitor runs the exact
 * same guided tour (components/features/walkthrough/*) over the exact same
 * product pages, under `/preview/[product]/*` (app/preview/) instead of the
 * real `/home`, `/deck`, etc.
 *
 * Deliberately stateless: `previewBasePath()` derives the answer fresh from
 * `window.location.pathname` on every call, rather than a flag set once by
 * app/preview/[product]/layout.tsx and read later. An earlier version did the
 * latter — a plain mutable module variable — and it went stale under
 * Turbopack's hot-reload: editing *any* file this module depends on can cause
 * the module itself to be re-evaluated (resetting the variable to its initial
 * `null`) without forcing the layout that had set it to re-render, so every
 * `router.push()` after that silently fell back to the real, ungated path.
 * Deriving from the URL means there is no stored state to go stale.
 *
 * Everything that normally requires a real signed-in Explore profile to run
 * Walk the Pitch (lib/sandbox/eligibility.ts, use-practice-access.ts,
 * lib/routes.ts's path builders) checks this instead, and the interceptor
 * (lib/sandbox/interceptor.ts) uses it to make sure an anonymous visitor's
 * browser never reaches the real backend. Outside `/preview/*` this is always
 * `null` — zero behaviour change for the real, authenticated app.
 */
const PRODUCTS = ['raise', 'scout'] as const;
type PreviewProduct = (typeof PRODUCTS)[number];

/** The product segment of `/preview/<product>/...`, or null outside preview. */
export function previewProduct(): PreviewProduct | null {
	if (typeof window === 'undefined') return null;
	const { pathname } = window.location;
	return PRODUCTS.find((p) => {
		const base = `/preview/${p}`;
		return pathname === base || pathname.startsWith(`${base}/`);
	}) ?? null;
}

/** e.g. "/preview/raise", or null outside preview. */
export function previewBasePath(): string | null {
	const product = previewProduct();
	return product ? `/preview/${product}` : null;
}

export const isPreviewMode = (): boolean => previewBasePath() !== null;

/**
 * Prefixes a raw path for preview — for the one class of link `lib/routes.ts`'s
 * own `hrefOf()`/`companyHref()`/`pathOf()` can't cover: hrefs that arrive
 * already-built as plain strings from sandbox mock data (e.g.
 * lib/sandbox/raise-routes.ts / scout-routes.ts's home "attention" cards,
 * `cta_href: '/recommended'`), rather than being constructed from a route id
 * at render time. A no-op outside preview, same as `hrefOf()`.
 */
export function previewHref(path: string): string {
	const base = previewBasePath();
	return base ? `${base}${path}` : path;
}
