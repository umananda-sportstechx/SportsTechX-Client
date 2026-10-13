'use client';

/**
 * Practice ("Walk the Pitch") request interceptor. Installed once in the
 * browser (app/providers.tsx).
 *
 * While practice is active, every same-origin `/api/*` request — SWR fetcher,
 * apiRequest, and the direct fetch()es used for chat and deck-analysis streams —
 * is first offered to the sandbox routes for that product (raise-routes.ts /
 * scout-routes.ts, then core-routes.ts). A handler returns a Response or JSON
 * value to answer locally, or undefined to let the request reach the real
 * backend (public data) — EXCEPT in the pre-signup preview (app/preview/,
 * lib/preview-mode.ts), which has no session to make that call with: there,
 * `backendFetch` answers an unhandled request with an empty `json([])`
 * instead of ever calling the real backend. Outside practice the wrapper
 * passes everything through.
 *
 * In the `view` phase (after the tour) every write is refused with the upgrade
 * prompt, except the few read-only POSTs in VIEW_ALLOWED.
 *
 * After each `/api/*` request it handles, it dispatches PRACTICE_REQUEST_EVENT (events.ts)
 * so the tour coach can advance on "the user did X" steps.
 */
import { isPreviewMode } from '@/lib/preview-mode';
import { activeSandbox, practicePhase, readSandboxData, writeSandboxData } from './store';
import { isSandboxEligible } from './eligibility';
import { coreSandboxRoutes } from './core-routes';
import { raiseSandboxRoutes } from './raise-routes';
import { scoutSandboxRoutes } from './scout-routes';
import { matchPath } from './match-path';
import { PRACTICE_REQUEST_EVENT, type PracticeRequestDetail } from './events';
import { gated, json, type SandboxProduct, type SandboxRoute } from './types';

declare global {
	interface Window { __stxSandboxFetch?: boolean }
}

const ROUTES: Record<SandboxProduct, SandboxRoute[]> = {
	raise: [...raiseSandboxRoutes, ...coreSandboxRoutes],
	scout: [...scoutSandboxRoutes, ...coreSandboxRoutes],
};

const PRODUCT_NAME = { raise: 'Raise', scout: 'Scout' } as const;

/** Non-GET requests that still go through in view-only practice: they read, not write. */
const VIEW_ALLOWED: Array<[method: string, pattern: string]> = [
	['POST', '/api/deck-analysis/:id/stream'],
];
/** Session plumbing (sign-in bookkeeping) is never blocked. */
const AUTH_PREFIX = '/api/auth/';

const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const STORAGE_UPLOAD = /\/storage\/v1\/object\/(?!sign\/|public\/|authenticated\/)/;

function isViewBlocked(method: string, pathname: string): boolean {
	if (READ_METHODS.has(method) || pathname.startsWith(AUTH_PREFIX)) return false;
	return !VIEW_ALLOWED.some(([m, p]) => m === method && matchPath(p, pathname));
}

function notify(method: string, path: string) {
	window.dispatchEvent(new CustomEvent<PracticeRequestDetail>(PRACTICE_REQUEST_EVENT, { detail: { method, path } }));
}

function parseBody(init?: RequestInit): unknown {
	if (typeof init?.body !== 'string') return undefined;
	try { return JSON.parse(init.body); } catch { return init.body; }
}

export function installSandboxInterceptor() {
	if (typeof window === 'undefined' || window.__stxSandboxFetch) return;
	window.__stxSandboxFetch = true;
	const realFetch = window.fetch.bind(window);
	// In preview (app/preview/) the visitor has no session at all. Every other
	// `/api/*` path below is answered locally or gated; these two are the only
	// spots that would otherwise still reach the real backend ("public data",
	// per the route() doc above) — never do that for an anonymous visitor.
	// `[]` rather than `{}`: every GET this app leaves unmocked and lets fall
	// through — api-keys, webhooks, chat history, the feature matrix — is a
	// list, so an empty list degrades a lot more of them to "nothing here" than
	// an empty object would, which only one of them (feature-grants) tolerates.
	const backendFetch = (input: RequestInfo | URL, init?: RequestInit) =>
		isPreviewMode() ? Promise.resolve(json([])) : realFetch(input, init);

	/** Offer the request to the product's routes; undefined = nobody answered. */
	async function route(product: SandboxProduct, method: string, url: URL, input: RequestInfo | URL, init?: RequestInit): Promise<Response | undefined> {
		for (const [m, pattern, handler] of ROUTES[product]) {
			if (m !== method) continue;
			const params = matchPath(pattern, url.pathname);
			if (!params) continue;
			const state = readSandboxData(product);
			const out = await handler({
				method, url, params, body: parseBody(init), product, state,
				save: () => writeSandboxData(product, state),
				passthrough: () => backendFetch(input, init),
			});
			if (out === undefined) return undefined; // handler declined → real backend
			return out instanceof Response ? out : json(out);
		}
		return undefined;
	}

	window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
		const product = activeSandbox();
		if (!product || !isSandboxEligible()) return realFetch(input, init);
		const raw = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
		const url = new URL(raw, window.location.origin);
		const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();

		// File uploads to Supabase Storage (deck upload, claim documents) never
		// leave the browser in practice: report success so the flow reaches its
		// API step, which practice then answers (usually with the upgrade prompt).
		if (STORAGE_UPLOAD.test(url.pathname) && (method === 'POST' || method === 'PUT')) {
			const key = url.pathname.split('/storage/v1/object/')[1] ?? 'sandbox';
			return json({ Key: key, Id: 'sandbox', path: key.split('/').slice(1).join('/') });
		}
		if (url.origin !== window.location.origin || !url.pathname.startsWith('/api/')) return realFetch(input, init);

		let res: Response;
		if (practicePhase() === 'view' && isViewBlocked(method, url.pathname)) {
			res = gated(product, `Practice mode is view-only — get Atlas ${PRODUCT_NAME[product]} to do this for real.`);
		} else {
			const local = await route(product, method, url, input, init);
			// A write no practice route answers would change the user's REAL account
			// (favourites, profile, interests…). Practice never writes for real, so
			// unanswered writes get the upgrade prompt in the tour phase too.
			res = local ?? (method !== 'GET' && isViewBlocked(method, url.pathname)
				? gated(product, `That's not part of the practice run — get Atlas ${PRODUCT_NAME[product]} to do this for real.`)
				: await backendFetch(input, init));
		}
		notify(method, url.pathname);
		return res;
	};
}
