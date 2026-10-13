'use client';

import { useEffect, useState } from 'react';

/** How long a step waits for its element to render before offering "Next". */
const FIND_TIMEOUT_MS = 5000;

export interface TargetBox { top: number; left: number; width: number; height: number }
interface TargetState { key: string; box: TargetBox | null; missing: boolean }

export const tourSelector = (target: string) => `[data-tour="${CSS.escape(target)}"]`;

function visibleBox(el: Element | null): TargetBox | null {
	if (!el) return null;
	const r = el.getBoundingClientRect();
	return r.width === 0 && r.height === 0 ? null : { top: r.top, left: r.left, width: r.width, height: r.height };
}

/**
 * Tracks the on-screen box of `[data-tour="<target>"]` for the current step.
 *
 * One rAF loop re-queries the element every frame: pages render late (SWR),
 * re-render the node, scroll, resize and reflow, and a per-frame read covers all
 * of those with no observers to keep in sync. State only changes when the box
 * does. The first time it is found it is scrolled into view; if it is absent for
 * FIND_TIMEOUT_MS the step reports `missing` (the coach then offers "Next").
 *
 * `stepKey` resets the search whenever the step changes.
 */
export function useTourTarget(target: string | undefined, stepKey: string): { box: TargetBox | null; missing: boolean } {
	const [state, setState] = useState<TargetState>({ key: '', box: null, missing: false });

	useEffect(() => {
		if (!target) return;
		const selector = tourSelector(target);
		let lastSeen = performance.now();
		let scrolled = false;
		let sig = '';
		let raf = 0;
		const tick = () => {
			const el = document.querySelector(selector);
			const box = visibleBox(el);
			const now = performance.now();
			if (box && el) {
				lastSeen = now;
				if (!scrolled) { scrolled = true; el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
			}
			const missing = !box && now - lastSeen > FIND_TIMEOUT_MS;
			const next = box ? `${box.top}|${box.left}|${box.width}|${box.height}` : missing ? 'missing' : 'searching';
			if (next !== sig) {
				sig = next;
				setState({ key: stepKey, box, missing });
			}
			raf = requestAnimationFrame(tick);
		};
		raf = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(raf);
	}, [target, stepKey]);

	return state.key === stepKey && target ? state : { box: null, missing: false };
}
