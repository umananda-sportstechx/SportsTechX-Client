'use client';

import { useSyncExternalStore } from 'react';
import type { SandboxProduct } from './types';

/**
 * "Walk the Pitch" practice state, kept in this browser only.
 *
 * Front-end only by design: the flag changes what the UI shows and which
 * requests are answered locally — it grants nothing on the server, where the
 * user stays on Explore. No time limit; a walkthrough can be replayed any time.
 *
 * Two phases per run:
 *   - `tour`  — the guided steps (lib/sandbox/tours/*), writes work on sample data;
 *   - `view`  — after the tour (or a skip): the same workspace, view-only.
 */
export type PracticePhase = 'tour' | 'view';

export interface PracticeState {
	/** Product open in practice right now, or null when outside it. */
	active: SandboxProduct | null;
	phase: PracticePhase;
	/** Current tour step (index into the tour's steps; === steps.length is the finale). */
	step: number;
}

const KEY = 'stx:sandbox:v2';
/** The retired 7-day "Try Sandbox" record; dropped on the next write. */
const LEGACY_KEY = 'stx:sandbox:v1';
const EVENT = 'stx:sandbox';

const EMPTY: PracticeState = { active: null, phase: 'tour', step: 0 };

function parse(raw: string | null): PracticeState {
	if (!raw) return EMPTY;
	try {
		const v = JSON.parse(raw) as Partial<PracticeState>;
		const active = v.active === 'raise' || v.active === 'scout' ? v.active : null;
		const phase: PracticePhase = v.phase === 'view' ? 'view' : 'tour';
		const step = Number.isInteger(v.step) && (v.step as number) >= 0 ? (v.step as number) : 0;
		return { active, phase, step };
	} catch { return EMPTY; }
}

function rawState(): string | null {
	if (typeof window === 'undefined') return null;
	try { return localStorage.getItem(KEY); } catch { return null; }
}

const read = (): PracticeState => parse(rawState());

function write(next: PracticeState) {
	try {
		localStorage.setItem(KEY, JSON.stringify(next));
		localStorage.removeItem(LEGACY_KEY);
	} catch { /* storage unavailable */ }
	window.dispatchEvent(new Event(EVENT));
}

/** The product open in practice right now, or null. Kept under its old name — many callers. */
export function activeSandbox(): SandboxProduct | null {
	return read().active;
}

/** The practice phase, or null outside practice. */
export function practicePhase(): PracticePhase | null {
	const s = read();
	return s.active ? s.phase : null;
}

/** Enter a product's walkthrough at its first step, on a fresh sample workspace. */
export function startWalkthrough(product: SandboxProduct) {
	resetSandboxData(product);
	write({ active: product, phase: 'tour', step: 0 });
}

export function setTourStep(step: number) {
	const s = read();
	if (!s.active) return;
	write({ ...s, step: Math.max(0, Math.floor(step)) });
}

/** Tour over (finished or skipped): stay in the workspace, view-only. */
export function finishTour() {
	const s = read();
	if (!s.active) return;
	write({ ...s, phase: 'view', step: 0 });
}

/** Run the active product's tour again from step 1, on a fresh sample workspace. */
export function replayTour() {
	const s = read();
	if (!s.active) return;
	startWalkthrough(s.active);
}

export function exitPractice() {
	write(EMPTY);
}

function subscribe(cb: () => void) {
	window.addEventListener(EVENT, cb);
	window.addEventListener('storage', cb);
	return () => { window.removeEventListener(EVENT, cb); window.removeEventListener('storage', cb); };
}

/** React view of practice: `{ active, phase, step }`. Re-renders on any change (also from other tabs). */
export function useSandbox(): PracticeState {
	const raw = useSyncExternalStore(subscribe, () => rawState() ?? '', () => '');
	return parse(raw || null);
}

/** Alias of useSandbox, for code that talks about "practice". */
export const usePractice = useSandbox;

/** Per-product sample data (pipeline moves, thesis edits, watchlists…) for the request handlers. */
const DATA_KEY = (p: SandboxProduct) => `stx:sandbox:data:${p}`;
export function readSandboxData(p: SandboxProduct): Record<string, unknown> {
	try { return JSON.parse(localStorage.getItem(DATA_KEY(p)) ?? '{}') as Record<string, unknown>; } catch { return {}; }
}
export function writeSandboxData(p: SandboxProduct, data: Record<string, unknown>) {
	try { localStorage.setItem(DATA_KEY(p), JSON.stringify(data)); } catch { /* storage unavailable */ }
}
function resetSandboxData(p: SandboxProduct) {
	try { localStorage.removeItem(DATA_KEY(p)); } catch { /* storage unavailable */ }
}
