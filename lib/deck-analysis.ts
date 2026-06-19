/** Shared types + helpers for the pitch-deck analyzer (list page + [id] page). */

export interface DeckSection { key: string; label: string; score: number | null; page_refs: number[]; quote: string | null }
export interface DeckSuggestion { area: string; suggestion: string; page_ref: number | null; quote: string | null }
export interface DeckScorecard {
	overall_score: number | null;
	verdict: string | null;
	sections: DeckSection[];
	strengths: string[];
	risks: string[];
	suggestions: DeckSuggestion[];
}
export interface DeckListItem { id: string; filename: string | null; status: string; overall_score: number | null; created_at: string }

/**
 * Hide the trailing scorecard JSON (fenced ```json or a bare {"overall_score"…})
 * from the displayed markdown — during streaming and after. The structured data
 * is consumed from the `done` event, not the text.
 */
export function stripScorecardJson(md: string): string {
	const fence = md.search(/```json/i);
	const bare = md.search(/\{\s*"overall_score"/);
	const cuts = [fence, bare].filter((i) => i >= 0);
	if (cuts.length === 0) return md;
	return md.slice(0, Math.min(...cuts)).replace(/```\s*$/, '').trimEnd();
}

export interface DeckStreamHandlers {
	onDelta: (t: string) => void;
	onDone: (sc: DeckScorecard | null) => void;
	onError: (m: string) => void;
}

/** Consume the SSE stream from POST /api/deck-analysis/:id/stream. */
export async function consumeDeckStream(stream: ReadableStream<Uint8Array>, h: DeckStreamHandlers, signal: AbortSignal): Promise<void> {
	const reader = stream.getReader();
	signal.addEventListener('abort', () => { void reader.cancel().catch(() => { /* ignore */ }); });
	const decoder = new TextDecoder();
	let buffer = '';
	while (true) {
		if (signal.aborted) return;
		const { value, done } = await reader.read();
		if (done) break;
		buffer += decoder.decode(value, { stream: true });
		let sep: number;
		while ((sep = buffer.indexOf('\n\n')) !== -1) {
			const raw = buffer.slice(0, sep);
			buffer = buffer.slice(sep + 2);
			let event = 'message';
			let data = '';
			for (const line of raw.split('\n')) {
				if (line.startsWith('event:')) event = line.slice(6).trim();
				else if (line.startsWith('data:')) data += line.slice(5).trim();
			}
			if (!data) continue;
			try {
				const parsed = JSON.parse(data);
				if (event === 'delta' && typeof parsed.text === 'string') h.onDelta(parsed.text);
				else if (event === 'done') h.onDone((parsed.scorecard ?? null) as DeckScorecard | null);
				else if (event === 'error') h.onError(parsed.message ?? 'Analysis failed');
			} catch { /* skip malformed */ }
		}
	}
}
