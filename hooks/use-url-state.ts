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

/** Read the current params once (for seeding state on mount). */
export function useUrlReader() {
	const sp = useSearchParams();
	return {
		str: (key: string, fallback = ''): string => sp.get(key) ?? fallback,
		num: (key: string, fallback: number): number => {
			const n = Number(sp.get(key));
			return Number.isFinite(n) && n > 0 ? n : fallback;
		},
		bool: (key: string): boolean => sp.get(key) === '1',
	};
}

/**
 * A modal/drawer whose open state is a query param. Returns the param value
 * (the open entity id, or null when closed) and a setter. Opening pushes a
 * history entry so Back closes the modal; closing replaces.
 */
export function useUrlModal(key: string): [string | null, (value: string | null) => void] {
	const sp = useSearchParams();
	const router = useRouter();
	const pathname = usePathname();
	const value = sp.get(key);
	const set = useCallback((v: string | null) => {
		const next = new URLSearchParams(Array.from(sp.entries()));
		if (v) next.set(key, v); else next.delete(key);
		const qs = next.toString();
		const url = qs ? `${pathname}?${qs}` : pathname;
		if (v) router.push(url, { scroll: false });
		else router.replace(url, { scroll: false });
	}, [sp, router, pathname, key]);
	return [value, set];
}
