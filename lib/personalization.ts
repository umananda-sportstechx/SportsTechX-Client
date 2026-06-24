'use client';

import { apiRequest } from '@/lib/query-client';

/**
 * Fire-and-forget: record a deliberate platform search as a personalization
 * signal. The catalog search endpoints are public (no user), so authenticated
 * intent is captured here. Best-effort — never throws into the caller, and short
 * queries are ignored (the server batches + analyzes these in the background).
 */
export function recordSearchSignal(text: string): void {
	const t = text.trim();
	if (t.length < 3) return;
	void apiRequest('POST', '/api/personalization/signal', { kind: 'search', text: t }).catch(() => {});
}
