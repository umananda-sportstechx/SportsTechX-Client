'use client';

const MARGIN = 8;

/**
 * The window edge isn't the real obstruction on desktop: `.atlas-rail` is a
 * sticky sidebar that occupies its own grid column (72px collapsed, 261px
 * expanded) but paints above page content, so a menu whose box technically
 * sits a few px past the window edge can still render hidden underneath it.
 * Clamp against the rail's actual right edge when it's on screen.
 */
function leftBound(): number {
	const rail = document.querySelector('.atlas-rail');
	const railRight = rail ? rail.getBoundingClientRect().right : 0;
	return Math.max(railRight, 0) + MARGIN;
}

function place(el: HTMLElement) {
	el.style.transform = '';
	const r = el.getBoundingClientRect();
	const overflowRight = r.right - (window.innerWidth - MARGIN);
	const overflowLeft = leftBound() - r.left;
	if (overflowRight > 0) el.style.transform = `translateX(-${overflowRight}px)`;
	else if (overflowLeft > 0) el.style.transform = `translateX(${overflowLeft}px)`;
}

/**
 * Ref callback for an `.atlas-menu` popover: keeps it fully inside the
 * viewport, shifting it horizontally if its anchored edge would overflow —
 * e.g. an `.atlas-menu--end` menu whose anchor sits near a narrow column's
 * left edge (columns narrow during Walk the Pitch, or on any small window).
 * A plain ref callback rather than a hook, so it drops onto a menu rendered
 * inside a `.map()` with no extra component needed.
 */
export function menuEdgeRef(el: HTMLDivElement | null) {
	if (!el) return;
	place(el);
	const onResize = () => place(el);
	window.addEventListener('resize', onResize);
	return () => window.removeEventListener('resize', onResize);
}
