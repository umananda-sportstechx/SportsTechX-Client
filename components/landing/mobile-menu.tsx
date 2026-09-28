'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

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
/* Root-relative on purpose: a bare '#explore' resolves to /terms-of-service#explore
   on a sub-route and scrolls nowhere. Shared by the nav and the drawer. */
export const LINKS: [string, string][] = [
	['EXPLORE', '/#explore'],
	['RAISE', '/#how-to-join'],
	['SCOUT', '/#explore'],
	['FAQ', '/#faq'],
];

/* Back to the mothership. Atlas is its own deployment on atlas.sportstechx.com,
   so these have to be absolute — a root-relative '/#solutions' lands on Atlas's
   own landing page, which has no such section.

   "Investors Circle" is another name for Playmakers and has no page of its own;
   the STX site's own footer points both at joinplaymakers.co, so this matches
   rather than inventing a destination. */
/* TEMPORARY host. The STX site is served from a Vercel preview until it moves
   back to its own domain — put https://sportstechx.com back here when it does.
   No trailing slash: the links below append their own paths. */
const STX_HOME = 'https://sports-tech-x-landing.vercel.app';
export const STX_SOLUTIONS: [string, string][] = [
	['Playmakers', 'https://joinplaymakers.co'],
	['Atlas', 'https://atlas.sportstechx.com'],
	['Investors Circle', 'https://joinplaymakers.co'],
];
export const STX_LINKS: [string, string][] = [
	['MEDIA', `${STX_HOME}/#media`],
	['ABOUT', `${STX_HOME}/about`],
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
			{open ? (
				<svg viewBox="0 0 24 24" aria-hidden width="24" height="24" fill="none" stroke="currentColor" strokeWidth={1.5}>
					<path d="M6 6 18 18M18 6 6 18" />
				</svg>
			) : (
				/* Four rules at y 5/10/15/20, the last 8 wide rather than 18 —
				   the sibling site's glyph. lucide's three even bars are a
				   different mark and read as generic next to this wordmark.
				   The Atlas design file has no mobile nav node to copy from
				   (it is a single 1525x9647 desktop frame), so this is the
				   nearest authored source. */
				<svg viewBox="0 0 24 24" aria-hidden width="24" height="24" fill="none" stroke="currentColor" strokeWidth={1.5}>
					<path d="M3 5h18M3 10h18M3 15h18M3 20h8" />
				</svg>
			)}
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
					{/* SportsTechX, not Atlas: this panel exists because neither sub-site
					    had any way back to the main site (team feedback "Sub-Page
					    Navigation"). The Atlas page links below it are the drawer's
					    original job and stay phone-only — above 1024 they are in the bar. */}
					{/* Desktop only. On a phone the page slides right and carries the
					    nav's own X into view; as an overlay the panel covers it, so the
					    drawer needs its own way out besides Escape and the click-away. */}
					<button
						type="button"
						className="lp-drawer-close"
						onClick={close}
						aria-label="Close menu"
						tabIndex={open ? undefined : -1}
					>
						<svg viewBox="0 0 24 24" aria-hidden width="22" height="22" fill="none" stroke="currentColor" strokeWidth={1.5}>
							<path d="M6 6 18 18M18 6 6 18" />
						</svg>
					</button>

					<a href={STX_HOME} className="lp-drawer-home" onClick={close} tabIndex={open ? undefined : -1}>
						{/* eslint-disable-next-line @next/next/no-img-element -- fixed-size bitmap mark */}
						<img className="lp-drawer-mark" src="/landing/stx-wordmark-white.png" alt="SportsTechX" />
					</a>

					<nav className="lp-drawer-nav" aria-label="SportsTechX">
						<span className="lp-drawer-group">Solutions</span>
						{STX_SOLUTIONS.map(([label, href]) => (
							<a
								key={label}
								className="lp-drawer-link lp-drawer-link--sub"
								href={href}
								onClick={close}
								tabIndex={open ? undefined : -1}
							>
								{label}
							</a>
						))}
						{STX_LINKS.map(([label, href]) => (
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

					<div className="lp-drawer-own">
						<span className="lp-drawer-sep" aria-hidden />
						<nav className="lp-drawer-nav" aria-label="This page">
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
