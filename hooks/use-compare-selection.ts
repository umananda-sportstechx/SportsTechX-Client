'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Comparison selection state — small, scoped, URL-launchable.
 *
 * Each kind (companies | investors | deals) has its own bucket so users can
 * accumulate a set on one list page and the bar persists across navigation
 * via localStorage. The bar links to `/compare/<kind>?ids=a,b,c`. We cap at
 * 4 entries — beyond that the side-by-side table would not fit comfortably.
 */
export type CompareKind = 'companies' | 'investors' | 'deals';

const MAX = 4;
const KEY = (kind: CompareKind) => `cmp:${kind}`;

function read(kind: CompareKind): string[] {
	if (typeof window === 'undefined') return [];
	try {
		const raw = window.localStorage.getItem(KEY(kind));
		if (!raw) return [];
		const arr = JSON.parse(raw) as unknown;
		return Array.isArray(arr) ? arr.filter((x) => typeof x === 'string').slice(0, MAX) : [];
	} catch {
		return [];
	}
}

function write(kind: CompareKind, ids: string[]): void {
	try {
		window.localStorage.setItem(KEY(kind), JSON.stringify(ids));
		// Trigger same-tab listeners — `storage` event only fires cross-tab.
		window.dispatchEvent(new CustomEvent('cmp:change', { detail: { kind } }));
	} catch {
		// localStorage full / disabled — selection just won't persist.
	}
}

export function useCompareSelection(kind: CompareKind) {
	const [ids, setIds] = useState<string[]>([]);

	useEffect(() => {
		setIds(read(kind));
		const onChange = (e: Event) => {
			if ((e as CustomEvent<{ kind: CompareKind }>).detail?.kind === kind) {
				setIds(read(kind));
			}
		};
		const onStorage = () => setIds(read(kind));
		window.addEventListener('cmp:change', onChange);
		window.addEventListener('storage', onStorage);
		return () => {
			window.removeEventListener('cmp:change', onChange);
			window.removeEventListener('storage', onStorage);
		};
	}, [kind]);

	const toggle = useCallback((id: string) => {
		const current = read(kind);
		const next = current.includes(id)
			? current.filter((x) => x !== id)
			: current.length >= MAX
				? current
				: [...current, id];
		write(kind, next);
		setIds(next);
		return next.length;
	}, [kind]);

	const clear = useCallback(() => {
		write(kind, []);
		setIds([]);
	}, [kind]);

	const has = useCallback((id: string) => ids.includes(id), [ids]);

	return { ids, count: ids.length, has, toggle, clear, max: MAX };
}
