'use client';

import { useEffect, useRef } from 'react';
import { matchPath } from '@/lib/sandbox/match-path';
import { PRACTICE_REQUEST_EVENT, type PracticeRequestDetail } from '@/lib/sandbox/events';
import type { TourStep } from '@/lib/sandbox/tour-types';
import { tourSelector } from './use-tour-target';

/**
 * Wires a step's `advance` condition to `onDone`:
 *   - click   — a click (or change, for selects) on or inside the target;
 *   - request — a practice request matching method + pattern (lib/sandbox/events.ts);
 *   - path    — the pathname matches the pattern, after having not matched
 *               (so going Back onto a page that already matches doesn't skip ahead);
 *   - next    — nothing here; the coach's Next button.
 */
export function useTourAdvance(step: TourStep | null, pathname: string, onDone: () => void) {
	const done = useRef(onDone);
	useEffect(() => { done.current = onDone; }, [onDone]);

	const adv = step?.advance;
	const target = step?.target;

	// click
	useEffect(() => {
		if (adv?.kind !== 'click' || !target) return;
		const selector = tourSelector(target);
		const onEvent = (e: Event) => {
			const el = e.target instanceof Element ? e.target : null;
			// A <select>'s 'click' just opens the native dropdown — it fires before a
			// value is actually picked. Wait for 'change' there so the step doesn't
			// advance while the step's own instruction ("pick X") isn't done yet.
			if (e.type === 'click' && el?.tagName === 'SELECT') return;
			if (!el?.closest(selector)) return;
			// The target can be a real link whose destination is sample data, not the
			// tour's own script (e.g. Raise home's "attention" card — whatever's most
			// urgent in the sample pipeline, not necessarily the deck). The coach's own
			// effect is about to navigate to the next step's page; letting this link's
			// navigation fire too is a race it can win, stranding the step on the wrong
			// page. Only the coach drives navigation once a step has advanced.
			const link = el.closest('a');
			if (e.type === 'click' && link) e.preventDefault();
			done.current();
		};
		document.addEventListener('click', onEvent, true);
		document.addEventListener('change', onEvent, true);
		return () => {
			document.removeEventListener('click', onEvent, true);
			document.removeEventListener('change', onEvent, true);
		};
	}, [adv, target]);

	// request
	const reqMethod = adv?.kind === 'request' ? adv.method.toUpperCase() : null;
	const reqPattern = adv?.kind === 'request' ? adv.pattern : null;
	useEffect(() => {
		if (!reqMethod || !reqPattern) return;
		const onRequest = (e: Event) => {
			const d = (e as CustomEvent<PracticeRequestDetail>).detail;
			if (d && d.method.toUpperCase() === reqMethod && matchPath(reqPattern, d.path)) done.current();
		};
		window.addEventListener(PRACTICE_REQUEST_EVENT, onRequest);
		return () => window.removeEventListener(PRACTICE_REQUEST_EVENT, onRequest);
	}, [reqMethod, reqPattern]);

	// path
	const pathPattern = adv?.kind === 'path' ? adv.pattern : null;
	const armed = useRef<{ id: string; armed: boolean }>({ id: '', armed: false });
	const stepId = step?.id ?? '';
	useEffect(() => {
		if (!pathPattern) return;
		if (armed.current.id !== stepId) armed.current = { id: stepId, armed: false };
		if (!matchPath(pathPattern, pathname)) { armed.current.armed = true; return; }
		if (armed.current.armed) done.current();
	}, [pathPattern, pathname, stepId]);
}
