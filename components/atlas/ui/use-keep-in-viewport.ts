'use client';

import { useLayoutEffect, type RefObject } from 'react';

const MARGIN = 8;

/**
 * Keeps an open dropdown inside the viewport while it stays anchored under its
 * button: shifts it sideways when it would spill past either edge and caps its
 * height to the room below its top. Phones are where this bites — a menu under
 * a right-edge button ran off-screen, which is why menus used to become bottom
 * sheets there; this keeps them where the user tapped instead.
 *
 * `open` is any value that changes when the menu opens or changes view (falsy =
 * closed); a ResizeObserver re-fits it when its content swaps size (the
 * filter menu's drill-down, a list that finishes loading).
 */
export function useKeepInViewport(ref: RefObject<HTMLElement | null>, open: unknown) {
	useLayoutEffect(() => {
		const el = ref.current;
		if (!open || !el) return;
		const fit = () => {
			el.style.translate = '';
			el.style.maxHeight = '';
			const r = el.getBoundingClientRect();
			const vw = document.documentElement.clientWidth;
			const dx = r.left < MARGIN ? MARGIN - r.left : r.right > vw - MARGIN ? vw - MARGIN - r.right : 0;
			if (dx) el.style.translate = `${Math.round(dx)}px 0`;
			if (r.bottom > window.innerHeight - MARGIN) el.style.maxHeight = `${Math.max(200, Math.floor(window.innerHeight - r.top - MARGIN))}px`;
		};
		fit();
		const ro = new ResizeObserver(fit);
		ro.observe(el);
		return () => ro.disconnect();
	}, [ref, open]);
}
