/**
 * "Walk the Pitch" — guided tour definitions (one per product).
 *
 * A tour runs on the real app pages with sample data (the sandbox interceptor).
 * Each step points at one element (by its `data-tour` attribute), shows a short
 * instruction in the coach panel, and completes when its `advance` condition is
 * met. After the last step the user stays in view-only practice mode.
 */
import type { SandboxProduct } from './types';

export type TourAdvance =
	/** A "Next" button in the coach panel (reading steps). */
	| { kind: 'next' }
	/** The user clicks the highlighted element (`target`). */
	| { kind: 'click' }
	/** The app sends a request matching method + path pattern (`:param` segments), e.g. a pipeline move. */
	| { kind: 'request'; method: string; pattern: string }
	/** The user lands on a page whose pathname matches the pattern (`:param` segments), e.g. a profile. */
	| { kind: 'path'; pattern: string };

export interface TourStep {
	/** Stable id, used for analytics: `walkthrough:<product>:<id>`. */
	id: string;
	/** Page the step happens on. The engine navigates here when the step opens (skipped if already on a matching path). */
	path: string;
	/** `data-tour` value of the element to highlight; omit for a page-level step. */
	target?: string;
	title: string;
	/** One or two short sentences. `{{Key}}` renders as a keyboard key. */
	body: string;
	advance: TourAdvance;
}

export interface Tour {
	product: SandboxProduct;
	/** Shown before step 1: who the user is in this practice run. */
	intro: { title: string; body: string };
	steps: TourStep[];
	finale: { title: string; body: string };
}
