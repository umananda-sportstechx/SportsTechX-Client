'use client';

import { useEffect, useRef } from 'react';
import { apiRequest } from '@/lib/query-client';
import { useDebouncedValue } from './use-debounced-value';

/**
 * Feeds catalog searches into the behavioural personalization profile — the
 * same pipeline chat prompts already use (`POST /api/personalization/signal`,
 * `kind:'search'`). A background LLM pass later turns accumulated signals into
 * inferred sector/sport/region interests (see `user-personalization`).
 *
 * Fire-and-forget: debounced ~1.2s so a term is captured once the user pauses
 * (not per keystroke), deduped so holding a query doesn't re-send it, and
 * best-effort so a failed signal never affects the search itself. Terms under
 * two characters are ignored, matching the server schema's minimum.
 */
export function useSearchSignal(query: string | undefined): void {
	const debounced = useDebouncedValue((query ?? '').trim(), 1200);
	const lastSent = useRef('');
	useEffect(() => {
		if (debounced.length < 2 || debounced === lastSent.current) return;
		lastSent.current = debounced;
		void apiRequest('POST', '/api/personalization/signal', { kind: 'search', text: debounced.slice(0, 600) })
			.catch(() => { /* best-effort; the search must never depend on this */ });
	}, [debounced]);
}
