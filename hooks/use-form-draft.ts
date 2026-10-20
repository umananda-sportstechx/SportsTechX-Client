'use client';

import { useCallback, useEffect, useRef } from 'react';

/**
 * Draft cache for forms inside modals. If a modal is dismissed by accident
 * (Escape, click-outside) the typed input is kept so reopening restores it —
 * no re-fetch, just a better recovery. Per-tab (`sessionStorage`), so a draft
 * never outlives the browser session or leaks to another tab; cleared on a
 * successful submit via the returned `clear()`.
 *
 * `value` must be JSON-serializable: strip `File`/`Blob` fields before passing
 * them in (they stringify to `{}`), and merge them back yourself on restore.
 *
 * Restore runs once on mount, before the first persist, so an empty form never
 * clobbers a saved draft.
 */
export function useFormDraft<T>(
	key: string,
	value: T,
	onRestore: (draft: T) => void,
	opts?: { enabled?: boolean; validate?: (raw: unknown) => T | null },
): { clear: () => void } {
	const enabled = opts?.enabled ?? true;
	const validate = opts?.validate;
	const storeKey = `stx:draft:${key}`;
	const restored = useRef(false);

	// Restore once, before anything is persisted. The stored blob is untrusted
	// (user-writable storage, possibly from an older schema or hand-edited), so a
	// `validate` is given the parsed value and must return a typed object or null;
	// an invalid/foreign draft is dropped instead of flowing into form state.
	useEffect(() => {
		if (!enabled || restored.current) return;
		restored.current = true;
		try {
			const raw = sessionStorage.getItem(storeKey);
			if (!raw) return;
			const parsed: unknown = JSON.parse(raw);
			const draft = validate ? validate(parsed) : (parsed as T);
			if (draft != null) onRestore(draft);
			else sessionStorage.removeItem(storeKey);
		} catch {
			// private mode / corrupt JSON — start blank, and bin the bad entry.
			try { sessionStorage.removeItem(storeKey); } catch { /* ignore */ }
		}
		// onRestore/validate intentionally not deps: restore is a one-shot on mount.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [enabled, storeKey]);

	// Persist on every change, but only after the restore pass has run, so the
	// initial blank render can't overwrite a saved draft.
	useEffect(() => {
		if (!enabled || !restored.current) return;
		try { sessionStorage.setItem(storeKey, JSON.stringify(value)); } catch { /* quota / private mode */ }
	}, [enabled, storeKey, value]);

	const clear = useCallback(() => {
		try { sessionStorage.removeItem(storeKey); } catch { /* ignore */ }
	}, [storeKey]);

	return { clear };
}
