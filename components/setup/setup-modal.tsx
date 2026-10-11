'use client';

import { createContext, useCallback, useContext, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import './setup-modal.css';

/**
 * Scroll the wizard back to the top of its box.
 *
 * Both wizards used `window.scrollTo(0, 0)` between steps, which is a no-op
 * here — the modal scrolls its own region, not the document — so step 2 opened
 * scrolled to the bottom of step 1. Outside a modal this is a no-op by design,
 * so the wizards can call it unconditionally.
 */
const ScrollResetContext = createContext<() => void>(() => {});
export const useSetupScrollReset = (): (() => void) => useContext(ScrollResetContext);

/**
 * The shell both setup wizards render inside.
 *
 * Not `components/atlas/patterns/modal.tsx`: that one is a 440px single-column
 * Radix dialog with no `max-height` and no `overflow-y`, and it paints its body
 * at 13px `--a-muted` — fine for a sentence and a pair of buttons, wrong for a
 * five-step form. Its own docstring says it is not trying to generalise yet.
 *
 * Three things here are load-bearing:
 *
 * 1. **`atlas` on the root.** This is mounted from `app/providers.tsx`, a
 *    sibling of `{children}`, so it renders OUTSIDE the `.atlas` wrapper that
 *    `AtlasShell` applies. Every `--a-*` token is scoped to that class, so
 *    without this the whole modal renders colourless.
 *    `patterns/modal.tsx` does the same thing for the same reason.
 * 2. **The scroll region is inside the box**, not the page. The box is capped
 *    below the viewport height, so a long step scrolls within the modal.
 * 3. **Escape defers to whatever is above us** — see the handler.
 */
export function SetupModal({ open, onClose, label, children }: {
	open: boolean;
	onClose: () => void;
	/** Accessible name for the dialog. */
	label: string;
	children: ReactNode;
}) {
	const boxRef = useRef<HTMLDivElement>(null);
	const scrollRef = useRef<HTMLDivElement>(null);
	const closeRef = useRef(onClose);
	useEffect(() => { closeRef.current = onClose; });

	const resetScroll = useCallback(() => {
		if (scrollRef.current) scrollRef.current.scrollTop = 0;
	}, []);

	useEffect(() => {
		if (!open) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key !== 'Escape') return;
			// Anything stacked ON TOP of the wizard owns Escape first; closing the
			// wizard out from under it would be wrong by any reading. Two cases,
			// and they need different tests because they live in different places:
			//
			//  - a dialog rendered INSIDE a step (the thesis picker at step 4) is a
			//    descendant, so `querySelector` finds it;
			//  - the claim modal is NOT. It is mounted from `app/providers.tsx` as
			//    a sibling of this host, and the Raise wizard's final screen opens
			//    it ("Verify your company"). Both handlers sit on `window`, so
			//    without this second test one Escape closed both.
			if (boxRef.current?.querySelector('[role="dialog"]')) return;
			if (document.querySelector('.cm-overlay')) return;
			closeRef.current();
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [open]);

	if (!open) return null;
	return (
		<div className="atlas setup-overlay" role="presentation" onClick={() => closeRef.current()}>
			<div
				ref={boxRef}
				className="setup-modal"
				role="dialog"
				aria-modal="true"
				aria-label={label}
				onClick={(e) => e.stopPropagation()}
			>
				<button type="button" className="setup-modal__x" aria-label="Close" onClick={() => closeRef.current()}>
					<X size={16} strokeWidth={1.75} />
				</button>
				<div ref={scrollRef} className="setup-modal__scroll">
					<ScrollResetContext.Provider value={resetScroll}>{children}</ScrollResetContext.Provider>
				</div>
			</div>
		</div>
	);
}
