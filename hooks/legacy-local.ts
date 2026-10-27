/**
 * One-time carry-over of values the retired `usePlaceholderState` kept in
 * localStorage (deal watches, thesis chips) before they had a server home.
 * Read, push to the API, then clear — only after the push succeeds.
 * ponytail: delete this file once those browsers have all visited (~a release).
 */
const PREFIX = 'stx:scout-placeholder:';

export function readLegacy<T>(key: string): T | null {
	try {
		const raw = localStorage.getItem(PREFIX + key);
		return raw ? (JSON.parse(raw) as T) : null;
	} catch { return null; }
}

export function clearLegacy(key: string): void {
	try { localStorage.removeItem(PREFIX + key); } catch { /* storage unavailable */ }
}
