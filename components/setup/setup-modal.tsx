'use client';

import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import './setup-modal.css';

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
 * 3. **Escape defers to a nested dialog.** Step 4 of the thesis wizard opens a
 *    picker that installs its own `window` keydown listener; without the guard
 *    below, one Escape would close the picker AND the wizard under it.
 */
export function SetupModal({ open, onClose, label, children, scrollKey }: {
	open: boolean;
	onClose: () => void;
	/** Accessible name for the dialog. */
	label: string;
	children: ReactNode;
	/** Changing this scrolls the box back to the top — pass the step index. */
	scrollKey?: string | number;
}) {
	const boxRef = useRef<HTMLDivElement>(null);
	const scrollRef = useRef<HTMLDivElement>(null);
	const closeRef = useRef(onClose);
	useEffect(() => { closeRef.current = onClose; });

	useEffect(() => {
		if (!open) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key !== 'Escape') return;
			// A nested dialog owns Escape first — it is on top and closing the
			// wizard out from under it would be the wrong thing by any reading.
			if (boxRef.current?.querySelector('[role="dialog"]')) return;
			closeRef.current();
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [open]);

	// `window.scrollTo(0, 0)` is what the wizards used between steps. Inside a
	// modal that is a no-op, and step 2 would open scrolled to the bottom of
	// step 1.
	useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = 0; }, [scrollKey]);

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
				<div ref={scrollRef} className="setup-modal__scroll">{children}</div>
			</div>
		</div>
	);
}
