'use client';

import { useEffect } from 'react';
import type { RefObject } from 'react';

/** Close a popover on outside mousedown or Escape while `active` is true. */
export function useDismiss(ref: RefObject<HTMLElement | null>, active: boolean, close: () => void) {
	useEffect(() => {
		if (!active) return;
		const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) close(); };
		const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
		document.addEventListener('mousedown', onDown);
		document.addEventListener('keydown', onKey);
		return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
	}, [ref, active, close]);
}
