'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';

/**
 * The landing page's mobile drawer, ported from the sibling `landing/` site.
 *
 * The page itself slides right and the panel is revealed behind it — it is not
 * an overlay that slides in over the top. The behaviour is the sibling's; the
 * styling is not, because this page has no Tailwind: every class here is an
 * `.lp-*` rule in landing.css, which is the one convention that sheet has.
 *
 * Three things about `.lp` shape this:
 *  - `.lp { overflow-x: clip }` absorbs the slid shell's 283px overhang, which
 *    is why nothing needs to scroll sideways. It must stay `clip` and not
 *    become `hidden` — see the note at the top of landing.css.
 *  - `.lp::after` is the film grain at `z-index: 60`, above this whole ladder.
 *    That is correct (it is inert), but it fixes the ceiling: panel 10 <
 *    shell 20 < notch 30 < grain 60.
 *  - The transformed shell becomes the containing block for `position: fixed`
 *    descendants, so `.lp-nav` inside it has to switch to `absolute`. See
 *    `lockedY`.
 */
export const LINKS: [string, string][] = [
	['EXPLORE', '#explore'],
	['RAISE', '#how-to-join'],
	['SCOUT', '#explore'],
	['FAQ', '#faq'],
];

type MenuState = {
	open: boolean;
	toggle: () => void;
	close: () => void;
	/**
	 * Scroll offset captured when the drawer opened.
	 *
	 * A transformed ancestor becomes the containing block for `fixed`
	 * descendants, so the fixed nav inside the shell stops resolving against the
	 * viewport and lands at the top of the *document* — scrolling away and
	 * taking the close button with it. Anchoring the bar to this offset keeps it
	 * at the visible top while it slides with the page.
	 */
	lockedY: number;
};

const MobileMenuContext = createContext<MenuState | null>(null);

export function useMobileMenu() {
	const ctx = useContext(MobileMenuContext);
	if (!ctx) throw new Error('useMobileMenu must be used inside <MobileMenuProvider>');
	return ctx;
}

export function MobileMenuProvider({ children }: { children: React.ReactNode }) {
	const [open, setOpen] = useState(false);
	const [lockedY, setLockedY] = useState(0);

	const close = useCallback(() => setOpen(false), []);
	// Captured in the handler, not an effect, so it is read before the scroll
	// lock below takes hold and freezes the value at 0.
	const toggle = useCallback(() => {
		setLockedY(window.scrollY);
		setOpen((v) => !v);
	}, []);

	useEffect(() => {
		if (!open) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') close();
		};
		// Pinning the body rather than setting `overflow: hidden` on it.
		//
		// overflow:hidden removes the scrollport, and the browser then CLAMPS the
		// scroll offset to 0 — measured: opening at y=2500 dropped the page to
		// the top, so the drawer closed somewhere the reader had never been.
		// Offsetting a fixed body by the captured scroll keeps the same pixels on
		// screen, and it is what lets the nav's `top: lockedY` land at the
		// visible top: the body is shifted up by exactly that much.
		//
		// Sideways overhang from the slid page needs no lock at all here —
		// `.lp { overflow-x: clip }` already absorbs it.
		const body = document.body.style;
		const prev = { position: body.position, top: body.top, width: body.width };
		body.position = 'fixed';
		body.top = `-${lockedY}px`;
		body.width = '100%';
		window.addEventListener('keydown', onKey);
		return () => {
			body.position = prev.position;
			body.top = prev.top;
			body.width = prev.width;
			window.scrollTo({ top: lockedY, behavior: 'instant' });
			window.removeEventListener('keydown', onKey);
		};
	}, [open, close, lockedY]);

	const value = useMemo(() => ({ open, toggle, close, lockedY }), [open, toggle, close, lockedY]);
	return <MobileMenuContext.Provider value={value}>{children}</MobileMenuContext.Provider>;
}

/** The nav's hamburger. Flips to an X, and is the only way back out. */
export function MobileMenuButton() {
	const { open, toggle } = useMobileMenu();
	return (
		<button
			type="button"
			className="lp-nav-toggle"
			onClick={toggle}
			aria-expanded={open}
			aria-controls="lp-drawer"
			aria-label={open ? 'Close menu' : 'Open menu'}
		>
			{open ? <X size={26} /> : <Menu size={26} />}
		</button>
	);
}

/** The drawer itself — rendered behind the page, revealed by the slide. */
export function MobileMenuPanel() {
	const { open, close } = useMobileMenu();
	return (
		<>
			<div id="lp-drawer" className={`lp-drawer${open ? ' is-open' : ''}`} aria-hidden={!open}>
				<div className="lp-drawer-inner">
					{/* eslint-disable-next-line @next/next/no-img-element -- SVG; next/image does not optimise it */}
					<img className="lp-drawer-mark" src="/landing/atlas-wordmark-white.svg" alt="Atlas" />

					<nav className="lp-drawer-nav" aria-label="Mobile">
						{LINKS.map(([label, href]) => (
							<a
								key={label}
								className="lp-drawer-link"
								href={href}
								onClick={close}
								tabIndex={open ? undefined : -1}
							>
								{label}
							</a>
						))}
					</nav>

					<Link className="lp-btn lp-btn--login lp-drawer-cta" href="/login" onClick={close} tabIndex={open ? undefined : -1}>
						LOG IN
					</Link>
				</div>
			</div>

			{/* The shell's own rounded corner belongs to the top of the *document*,
			    so it scrolls out of view and the page reads square once you have
			    moved down. This repaints the same radius at the viewport's edge.
			    It has to be a sibling of the shell: inside it, `fixed` would
			    resolve against the transform. */}
			<span aria-hidden className={`lp-notch${open ? ' is-open' : ''}`} />
		</>
	);
}

/**
 * Wraps the page and performs the slide.
 *
 * `nav` is taken separately from `children` so the page can be dimmed behind
 * the bar while the bar itself stays crisp.
 */
export function MobileMenuShell({ nav, children }: { nav: React.ReactNode; children: React.ReactNode }) {
	const { open, close } = useMobileMenu();
	return (
		<div className={`lp-shell${open ? ' is-open' : ''}`}>
			{nav}

			<div className="lp-shell-page">{children}</div>

			{/* Click-away target, only while the drawer is out. Below the nav in
			    the stack so the close button stays clickable. */}
			{open && <button type="button" className="lp-shell-scrim" aria-label="Close menu" onClick={close} />}
		</div>
	);
}
