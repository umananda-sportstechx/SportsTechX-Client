'use client';

import { useSyncExternalStore } from 'react';
import type { SandboxProduct } from './types';

/**
 * Sandbox state ("Try Sandbox For Free"), kept in this browser only.
 *
 * Front-end only by design: the flag changes what the UI shows and which
 * requests are answered locally — it grants nothing on the server, where the
 * user stays on Explore. A 7-day window starts at first entry per product.
 */
export const SANDBOX_DAYS = 7;
const KEY = 'stx:sandbox:v1';
const EVENT = 'stx:sandbox';
const DAY_MS = 864e5;

interface Stored {
	/** Product currently open in the sandbox, or null when outside it. */
	active: SandboxProduct | null;
	/** First entry per product (ms), for the 7-day window. */
	startedAt: Partial<Record<SandboxProduct, number>>;
	/** Products whose first-time setup wizard has already been opened. */
	setupPrompted?: Partial<Record<SandboxProduct, boolean>>;
}

const EMPTY: Stored = { active: null, startedAt: {} };

function read(): Stored {
	if (typeof window === 'undefined') return EMPTY;
	try {
		const raw = localStorage.getItem(KEY);
		return raw ? { ...EMPTY, ...(JSON.parse(raw) as Stored) } : EMPTY;
	} catch { return EMPTY; }
}
function write(next: Stored) {
	try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* storage unavailable */ }
	window.dispatchEvent(new Event(EVENT));
}

/** Ms left in a product's 7-day window (full window if never started). */
export function sandboxTimeLeft(product: SandboxProduct, s: Stored = read()): number {
	const start = s.startedAt[product];
	return start ? Math.max(0, start + SANDBOX_DAYS * DAY_MS - Date.now()) : SANDBOX_DAYS * DAY_MS;
}
export const sandboxExpired = (product: SandboxProduct, s: Stored = read()) => sandboxTimeLeft(product, s) === 0;

/** The product open in the sandbox right now, or null (also null once its window has run out). */
export function activeSandbox(): SandboxProduct | null {
	const s = read();
	return s.active && !sandboxExpired(s.active, s) ? s.active : null;
}

/** Enter a product's sandbox. Returns false if its 7 days are used up. */
export function startSandbox(product: SandboxProduct): boolean {
	const s = read();
	if (sandboxExpired(product, s)) return false;
	write({ ...s, active: product, startedAt: { ...s.startedAt, [product]: s.startedAt[product] ?? Date.now() } });
	return true;
}

/**
 * True exactly once per product: the first time the sandbox opens, so the app
 * can raise the same setup wizard a new paying customer sees.
 */
export function takeSetupPrompt(product: SandboxProduct): boolean {
	const s = read();
	if (s.setupPrompted?.[product]) return false;
	write({ ...s, setupPrompted: { ...s.setupPrompted, [product]: true } });
	return true;
}

export function exitSandbox() {
	write({ ...read(), active: null });
}

function subscribe(cb: () => void) {
	window.addEventListener(EVENT, cb);
	window.addEventListener('storage', cb);
	return () => { window.removeEventListener(EVENT, cb); window.removeEventListener('storage', cb); };
}

/** React view of the sandbox: the active product and days left for any product. */
export function useSandbox() {
	const raw = useSyncExternalStore(subscribe, () => { try { return localStorage.getItem(KEY) ?? ''; } catch { return ''; } }, () => '');
	void raw; // re-render trigger; values below read fresh state
	const s = read();
	const active = s.active && !sandboxExpired(s.active, s) ? s.active : null;
	const daysLeft = (p: SandboxProduct) => Math.ceil(sandboxTimeLeft(p, s) / DAY_MS);
	return { active, daysLeft, expired: (p: SandboxProduct) => sandboxExpired(p, s) };
}

/** Per-product sandbox data (pipeline moves, thesis edits…) for the request handlers. */
const DATA_KEY = (p: SandboxProduct) => `stx:sandbox:data:${p}`;
export function readSandboxData(p: SandboxProduct): Record<string, unknown> {
	try { return JSON.parse(localStorage.getItem(DATA_KEY(p)) ?? '{}') as Record<string, unknown>; } catch { return {}; }
}
export function writeSandboxData(p: SandboxProduct, data: Record<string, unknown>) {
	try { localStorage.setItem(DATA_KEY(p), JSON.stringify(data)); } catch { /* storage unavailable */ }
}
