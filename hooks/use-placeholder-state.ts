'use client';

import { useCallback, useMemo, useSyncExternalStore } from 'react';

/**
 * Browser-only state for placeholder screens (Backend Not Connected) in Scout
 * and Explore — e.g. Scout's thesis and board stages, Explore's interests.
 * Kept in localStorage so the screens behave like the design across reloads;
 * none of it reaches the API. Replace each key with a real endpoint as it lands.
 */
const PREFIX = 'stx:scout-placeholder:';
const EVENT = 'stx:placeholder';

function read<T>(key: string, fallback: T): T {
	try {
		const raw = localStorage.getItem(PREFIX + key);
		return raw ? (JSON.parse(raw) as T) : fallback;
	} catch { return fallback; }
}
function subscribe(cb: () => void) {
	window.addEventListener(EVENT, cb);
	window.addEventListener('storage', cb);
	return () => { window.removeEventListener(EVENT, cb); window.removeEventListener('storage', cb); };
}

/** [value, set] for one placeholder key; `set` takes a value or an updater. */
export function usePlaceholderState<T>(key: string, fallback: T): [T, (next: T | ((prev: T) => T)) => void] {
	// Snapshot is the raw string so React can compare it cheaply between renders.
	const raw = useSyncExternalStore(subscribe, () => { try { return localStorage.getItem(PREFIX + key); } catch { return null; } }, () => null);
	const value = useMemo(() => {
		if (!raw) return fallback;
		try { return JSON.parse(raw) as T; } catch { return fallback; }
	}, [raw, fallback]);
	const set = useCallback((next: T | ((prev: T) => T)) => {
		const prev = read(key, fallback);
		const v = typeof next === 'function' ? (next as (p: T) => T)(prev) : next;
		try { localStorage.setItem(PREFIX + key, JSON.stringify(v)); } catch { /* storage unavailable */ }
		window.dispatchEvent(new Event(EVENT));
	}, [key, fallback]);
	return [value, set];
}
