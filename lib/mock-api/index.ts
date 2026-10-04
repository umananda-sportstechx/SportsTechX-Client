/**
 * Mock API (see lib/mock-api/README.md). Inert unless NEXT_PUBLIC_MOCK_API=1.
 *
 * When NEXT_PUBLIC_MOCK_API=1 (in .env.local), every same-origin `/api/*`
 * request made by the browser is answered from fixtures instead of the backend,
 * so UI work can continue while the shared server/DB is in flux. Supabase login
 * is untouched. Off (unset) = the app behaves exactly as normal.
 *
 * Installed by instrumentation-client.ts (repo root), which runs before the app.
 */

declare global {
	interface Window { __stxMockApi?: boolean }
}

export const MOCK_API_ENABLED = process.env.NEXT_PUBLIC_MOCK_API === '1';

if (MOCK_API_ENABLED && typeof window !== 'undefined' && !window.__stxMockApi) {
	window.__stxMockApi = true;
	const realFetch = window.fetch.bind(window);
	console.info('%c[mock-api] ON — /api/* is served from lib/mock-api fixtures (NEXT_PUBLIC_MOCK_API=1)', 'color:#F32163;font-weight:bold');

	window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
		const raw = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
		const url = new URL(raw, window.location.origin);
		if (url.origin !== window.location.origin || !url.pathname.startsWith('/api/')) return realFetch(input, init);

		const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();
		let body: unknown;
		if (typeof init?.body === 'string') { try { body = JSON.parse(init.body); } catch { body = init.body; } }

		// Loaded on demand so the mock routes/fixtures never ship in the normal bundle path.
		const { resolveMock } = await import('./routes');
		const res = await resolveMock(method, url, body);
		if (res) return res;
		console.warn(`[mock-api] not mocked: ${method} ${url.pathname}${url.search} — returning 404`);
		return new Response(JSON.stringify({ error: { code: 'NOT_MOCKED', message: `Mock API has no fixture for ${method} ${url.pathname}` } }), {
			status: 404, headers: { 'Content-Type': 'application/json' },
		});
	};
}
