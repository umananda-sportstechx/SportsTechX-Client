'use client';

/**
 * Sandbox request interceptor. Installed once in the browser (app/providers.tsx).
 *
 * While a sandbox is active, every same-origin `/api/*` request — SWR fetcher,
 * apiRequest, and the direct fetch()es used for chat and deck-analysis streams —
 * is first offered to the sandbox routes for that product (raise-routes.ts /
 * scout-routes.ts, then core-routes.ts). A handler returns a Response or JSON
 * value to answer locally, or undefined to let the request reach the real
 * backend (public data). Outside a sandbox the wrapper passes everything through.
 */
import { activeSandbox, readSandboxData, writeSandboxData } from './store';
import { isSandboxEligible } from './eligibility';
import { coreSandboxRoutes } from './core-routes';
import { raiseSandboxRoutes } from './raise-routes';
import { scoutSandboxRoutes } from './scout-routes';
import { json, type SandboxProduct, type SandboxRoute } from './types';

declare global {
	interface Window { __stxSandboxFetch?: boolean }
}

const ROUTES: Record<SandboxProduct, SandboxRoute[]> = {
	raise: [...raiseSandboxRoutes, ...coreSandboxRoutes],
	scout: [...scoutSandboxRoutes, ...coreSandboxRoutes],
};

const STORAGE_UPLOAD = /\/storage\/v1\/object\/(?!sign\/|public\/|authenticated\/)/;

const compiled = new Map<string, { re: RegExp; names: string[] }>();
function matchPath(pattern: string, pathname: string): Record<string, string> | null {
	let c = compiled.get(pattern);
	if (!c) {
		const names: string[] = [];
		const re = new RegExp('^' + pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/:(\w+)/g, (_, n: string) => { names.push(n); return '([^/]+)'; }) + '/?$');
		c = { re, names };
		compiled.set(pattern, c);
	}
	const m = c.re.exec(pathname);
	if (!m) return null;
	return Object.fromEntries(c.names.map((n, i) => [n, decodeURIComponent(m[i + 1])]));
}

export function installSandboxInterceptor() {
	if (typeof window === 'undefined' || window.__stxSandboxFetch) return;
	window.__stxSandboxFetch = true;
	const realFetch = window.fetch.bind(window);

	window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
		const product = activeSandbox();
		if (!product || !isSandboxEligible()) return realFetch(input, init);
		const raw = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
		const url = new URL(raw, window.location.origin);
		const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();

		// File uploads to Supabase Storage (deck upload, claim documents) never
		// leave the browser in a sandbox: report success so the flow reaches its
		// API step, which the sandbox then answers (usually with the upgrade prompt).
		if (STORAGE_UPLOAD.test(url.pathname) && (method === 'POST' || method === 'PUT')) {
			const key = url.pathname.split('/storage/v1/object/')[1] ?? 'sandbox';
			return json({ Key: key, Id: 'sandbox', path: key.split('/').slice(1).join('/') });
		}
		if (url.origin !== window.location.origin || !url.pathname.startsWith('/api/')) return realFetch(input, init);

		for (const [m, pattern, handler] of ROUTES[product]) {
			if (m !== method) continue;
			const params = matchPath(pattern, url.pathname);
			if (!params) continue;
			let body: unknown;
			if (typeof init?.body === 'string') { try { body = JSON.parse(init.body); } catch { body = init.body; } }
			const state = readSandboxData(product);
			const out = await handler({
				method, url, params, body, product, state,
				save: () => writeSandboxData(product, state),
				passthrough: () => realFetch(input, init),
			});
			if (out === undefined) break; // handler declined → real backend
			return out instanceof Response ? out : json(out);
		}
		return realFetch(input, init);
	};
}
