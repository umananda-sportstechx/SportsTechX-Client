'use client';

import { useCallback, useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

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
 * Keep the query string in sync with `state`. Writes use `replace` (no history
 * spam per keystroke/filter change); the entry the user navigates away from
 * still carries the latest state, which is all Back needs.
 *
 * Pass only the keys that should appear in the URL, already reduced to their
 * "non-default" form (e.g. `page: page > 1 ? page : undefined`,
 * `sort: sort !== DEFAULT ? sort : undefined`) so defaults stay out of the URL.
 */
export function useUrlSync(state: Record<string, ParamVal>): void {
	const router = useRouter();
	const pathname = usePathname();
	const sp = useSearchParams();
	const qs = merge(sp, state);
	const current = sp.toString();
	useEffect(() => {
		if (qs === current) return;
		router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
	}, [qs, current, pathname, router]);
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
	const pathname = usePathname();
	const validate = opts?.validate ?? isSafeId;
	const raw = sp.get(key);
	const value = raw != null && validate(raw) ? raw : null;
	const set = useCallback((v: string | null) => {
		const next = new URLSearchParams(Array.from(sp.entries()));
		// Only valid values ever reach the URL; an invalid one clears the param.
		if (v && validate(v)) next.set(key, v); else next.delete(key);
		const qs = next.toString();
		const url = qs ? `${pathname}?${qs}` : pathname;
		if (v && validate(v)) router.push(url, { scroll: false });
		else router.replace(url, { scroll: false });
	}, [sp, router, pathname, key, validate]);
	return [value, set];
}
