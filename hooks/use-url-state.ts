'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

/**
 * URL-as-state helpers. Two jobs:
 *
 *  • `useUrlSync` mirrors a page's view-state (pagination, filters, search, sort)
 *    into the query string so Back/Forward restore it and the URL is shareable.
 *    This is the fix for "Companies page 15 → open a profile → Back → page 1":
 *    the list component unmounts on navigation, so its React state is gone on the
 *    way back; the URL is the only thing the browser restores, so the state has
 *    to live there.
 *
 *  • `useUrlModal` makes a modal/drawer addressable by a query param, so pasting
 *    the URL reopens the same modal. Opening pushes a history entry (Back closes
 *    the modal); closing replaces (no dead entry left behind).
 *
 * Both MERGE with the existing query string rather than replacing it, so a list's
 * filters and a drawer's `?company=` coexist on the same URL without fighting.
 */

type ParamVal = string | number | boolean | null | undefined;

/** Merge `state` over the current params, dropping empty/false/zero so the URL
 *  stays short. `true` serializes to `1`. */
function merge(current: URLSearchParams, state: Record<string, ParamVal>): string {
	const next = new URLSearchParams(Array.from(current.entries()));
	for (const [k, v] of Object.entries(state)) {
		if (v === undefined || v === null || v === '' || v === false || v === 0) next.delete(k);
		else next.set(k, v === true ? '1' : String(v));
	}
	return next.toString();
}

/**
 * Keep the query string in sync with `state` using the native History API
 * (`history.replaceState`), NOT `router.replace`.
 *
 * Why not the router: `router.replace` on every debounced keystroke is a Next
 * soft-navigation — it re-renders (and, with a loading boundary, remounts) the
 * list, which reset the controlled search input back to the shorter, debounced
 * URL value and cut off whatever was typed after the debounce. `replaceState`
 * updates the address bar and the current history entry WITHOUT any navigation,
 * so typing is never interrupted; Next still reflects the change in
 * `useSearchParams`, and Back/Forward restore the URL (and the list remounts
 * reading it) exactly as before.
 *
 * It MERGES over the live `window.location.search`, so a drawer's `?company=`
 * (written by `useUrlModal` via the router) is preserved.
 *
 * Pass only the keys that should appear in the URL, already reduced to their
 * "non-default" form (e.g. `page: page > 1 ? page : undefined`,
 * `sort: sort !== DEFAULT ? sort : undefined`) so defaults stay out of the URL.
 */
/**
 * The last query string this page wrote ITSELF (filter sync / drawer open-close).
 * Next mirrors even native `replaceState` into `useSearchParams`, so without this
 * a page couldn't tell "I just synced my own search box" from "the user followed
 * a deep link" — see useDeepLinkKey.
 */
let selfWritten: string | null = null;

/**
 * A React `key` for a list that must REMOUNT on a genuine deep link (e.g.
 * /companies?sector=x followed while already on /companies) so its filters
 * re-read the URL — but NOT when the URL changed because the list synced its
 * own state or opened a drawer. Keying on `useSearchParams()` directly remounted
 * the list (and its search input) on every debounced keystroke, dropping focus
 * the moment results loaded.
 */
export function useDeepLinkKey(ignore: readonly string[] = []): string {
	// `ignore` = params that never affect the list (e.g. a drawer's `?company=`),
	// so opening/closing a drawer — including via Back — doesn't remount it either.
	const strip = (qs: string | null) => {
		if (qs == null) return null;
		const p = new URLSearchParams(qs);
		for (const k of ignore) p.delete(k);
		return p.toString();
	};
	const sp = strip(useSearchParams().toString())!;
	const key = useRef(sp);
	if (sp !== key.current && sp !== strip(selfWritten)) key.current = sp; // idempotent: safe under StrictMode double-render
	return key.current;
}

export function useUrlSync(state: Record<string, ParamVal>): void {
	// Re-run only when the managed state changes (not on unrelated re-renders).
	const serialized = JSON.stringify(state);
	useEffect(() => {
		if (typeof window === 'undefined') return;
		const live = new URLSearchParams(window.location.search);
		const qs = merge(live, state);
		if (qs === live.toString()) return;
		// Relative URL keeps the current pathname; null state lets Next's patched
		// replaceState inject its own router state.
		selfWritten = qs;
		window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname);
		// `state` is captured through `serialized`; that is the intended dep.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [serialized]);
}

// Query-string values are attacker-controllable (anyone can hand-craft a link),
// so everything read back out is validated here rather than trusted. These feed
// component state and SWR keys → API requests, so a bad value must degrade to a
// safe default, never flow through raw.
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/g;
const clean = (v: string, max: number): string => v.replace(CONTROL_CHARS, '').trim().slice(0, max);
// A slug or opaque id: letters/digits/._- , bounded length. Rejects anything
// that could be a path, script, or injection payload.
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isSafeId = (v: string | null | undefined): v is string => !!v && ID_RE.test(v);
export const isUuid = (v: string | null | undefined): v is string => !!v && UUID_RE.test(v);

/** Read + validate the current params once (for seeding state on mount). */
export function useUrlReader() {
	const sp = useSearchParams();
	return {
		/** A free-text value, stripped of control chars and length-capped. */
		str: (key: string, fallback = '', max = 120): string => {
			const v = sp.get(key);
			return v == null ? fallback : clean(v, max);
		},
		/** A positive integer within [1, max]; anything else → fallback. */
		num: (key: string, fallback: number, max = 100_000): number => {
			const n = Number(sp.get(key));
			return Number.isInteger(n) && n >= 1 && n <= max ? n : fallback;
		},
		bool: (key: string): boolean => sp.get(key) === '1',
		/** A value constrained to a known set (sort keys, enums); else fallback. */
		oneOf: <T extends string>(key: string, allowed: readonly T[], fallback: T): T => {
			const v = sp.get(key);
			return v != null && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
		},
		/** A slug/opaque id in the safe charset, or null. */
		id: (key: string): string | null => {
			const v = sp.get(key);
			return isSafeId(v) ? v : null;
		},
	};
}

/**
 * A modal/drawer whose open state is a query param. Returns the param value
 * (the open entity id, or null when closed/invalid) and a setter. Opening pushes
 * a history entry so Back closes the modal; closing replaces.
 *
 * `validate` gates what counts as "open": a hand-crafted `?company=<junk>` fails
 * it and the modal stays shut rather than firing a request for a bogus id. It
 * defaults to the safe-id check.
 */
export function useUrlModal(
	key: string,
	opts?: { validate?: (value: string) => boolean },
): [string | null, (value: string | null) => void] {
	const sp = useSearchParams();
	const router = useRouter();
	const validate = opts?.validate ?? isSafeId;
	const raw = sp.get(key);
	const value = raw != null && validate(raw) ? raw : null;
	const set = useCallback((v: string | null) => {
		if (typeof window === 'undefined') return;
		// Merge over the LIVE query string, not the (possibly stale) router
		// snapshot: list filters are written by useUrlSync via history.replaceState,
		// so reading window.location.search is what preserves them here.
		const next = new URLSearchParams(window.location.search);
		const open = !!(v && validate(v));
		if (open) next.set(key, v!); else next.delete(key);
		const qs = next.toString();
		selfWritten = qs; // an in-page drawer toggle, not a deep link
		const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
		// The router (not history API) so the modal actually opens/closes: it
		// re-renders useSearchParams consumers. Opening pushes (Back closes it),
		// closing replaces (no dead entry).
		// Closing goes through the history API: `router.replace` silently drops a
		// navigation that only REMOVES query params (verified live on Next 16 — the
		// URL and the drawer stayed put), while native replaceState is mirrored into
		// useSearchParams, so the modal closes. Opening still pushes (Back closes it).
		if (open) router.push(url, { scroll: false });
		else window.history.replaceState(null, '', url);
	}, [router, key, validate]);
	return [value, set];
}
