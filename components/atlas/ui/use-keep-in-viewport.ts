'use client';

import { useLayoutEffect, type RefObject } from 'react';

const MARGIN = 8;
const GAP = 6;

/**
 * Keeps an open dropdown inside the viewport while it stays anchored to its
 * button:
 *  - sideways: shifted back when it would spill past either edge;
 *  - vertically: if it does not fit below the button but there is more room
 *    above, it opens upwards; otherwise its height is capped to the room below
 *    and it scrolls.
 * Phones are where this bites — a menu under a right-edge or bottom-row button
 * ran off-screen, which is why menus used to become bottom sheets there; this
 * keeps them next to the control the user tapped instead.
 *
 * `open` is any value that changes when the menu opens or changes view (falsy =
 * closed); a ResizeObserver re-fits it when its content swaps size (the filter
 * menu's drill-down, a list that finishes loading). `anchorRef` is the control
 * the menu hangs from — default the menu's parent, which is the anchor for
 * every inline menu; a portalled menu must pass it.
 */
export function useKeepInViewport(ref: RefObject<HTMLElement | null>, open: unknown, anchorRef?: RefObject<HTMLElement | null>) {
	useLayoutEffect(() => {
		const el = ref.current;
		if (!open || !el) return;
		const fit = () => {
			el.style.translate = '';
			el.style.maxHeight = '';
			el.style.overflowY = '';
			const r = el.getBoundingClientRect();
			const vw = document.documentElement.clientWidth, vh = window.innerHeight;
			const dx = r.left < MARGIN ? MARGIN - r.left : r.right > vw - MARGIN ? vw - MARGIN - r.right : 0;
			let dy = 0, cap: number | null = null;
			if (r.bottom > vh - MARGIN) {
				const below = vh - MARGIN - r.top;
				const a = (anchorRef?.current ?? el.parentElement)?.getBoundingClientRect();
				const above = a ? a.top - GAP - MARGIN : 0;
				if (a && above > below) {
					// Open upwards: bottom edge just above the anchor.
					const h = Math.min(r.height, above);
					if (h < r.height) cap = h;
					dy = a.top - GAP - h - r.top;
				} else {
					cap = Math.max(160, Math.floor(below));
				}
			}
			if (dx || dy) el.style.translate = `${Math.round(dx)}px ${Math.round(dy)}px`;
			if (cap != null) {
				el.style.maxHeight = `${cap}px`;
				// Only phones give menus a scrolling inner list (CSS); without this a
				// capped desktop menu cut its box short and its rows spilled past it.
				el.style.overflowY = 'auto';
			}
		};
		fit();
		const ro = new ResizeObserver(fit);
		ro.observe(el);
		return () => ro.disconnect();
	}, [ref, open, anchorRef]);
}
