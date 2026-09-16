'use client';

import { useSyncExternalStore } from 'react';
import Link from 'next/link';
import { LINKS, MobileMenuButton, useMobileMenu } from '@/components/landing/mobile-menu';

const subscribe = (onChange: () => void) => {
	window.addEventListener('scroll', onChange, { passive: true });
	return () => window.removeEventListener('scroll', onChange);
};

/**
 * True once the page has moved far enough to dock the bar.
 *
 * A dead band rather than a single threshold: parking exactly on one number
 * makes the bar flicker between states on every sub-pixel scroll. Docking at 24
 * and releasing at 8 gives it somewhere to settle.
 */
let docked = false;
const isScrolled = () => {
	const y = window.scrollY;
	if (y > 24) docked = true;
	else if (y < 8) docked = false;
	return docked;
};

export function LandingNav() {
	const { open: drawerOpen, lockedY } = useMobileMenu();
	// useSyncExternalStore, not useState + useEffect: it reports the right value
	// on the FIRST client render, so reloading halfway down the page shows the
	// docked bar instead of flashing the transparent one.
	const scrolled = useSyncExternalStore(
		subscribe,
		isScrolled,
		() => false // the server cannot know the scroll position
	);

	return (
		<nav
			// While the drawer is out the shell is transformed, and a transformed
			// ancestor becomes the containing block for `fixed` children — a fixed
			// bar would pin to the top of the *document* and scroll away, taking
			// the close button with it. Anchor it to the captured offset instead.
			//
			// `top` is deliberately NOT transitioned (see .lp-nav in landing.css):
			// it is the anchor, so animating it sends the bar gliding thousands of
			// pixels down the page when the drawer opens. The dock rides on
			// `translate`.
			style={drawerOpen ? { top: lockedY } : undefined}
			className={`lp-nav${scrolled && !drawerOpen ? ' is-scrolled' : ''}${drawerOpen ? ' is-drawer' : ''}`}
		>
			<div className="lp-nav-inner">
				{/* First, not last. The page slides RIGHT, so anything on the
				    trailing edge of the bar travels off-screen with it — measured
				    at x=617 on a 390 viewport, i.e. the only way to close the
				    drawer was invisible. */}
				<MobileMenuButton />
				<Link href="/" className="lp-nav-mark" aria-label="Atlas">
					{/* eslint-disable-next-line @next/next/no-img-element -- SVG; next/image does not optimise it */}
					<img src="/landing/atlas-a.svg" alt="Atlas" />
				</Link>
				<div className="lp-nav-right">
					<div className="lp-nav-links">
						{LINKS.map(([label, href]) => (
							<a key={label} className="lp-nav-link" href={href}>
								{label}
							</a>
						))}
					</div>
					<Link className="lp-btn lp-btn--login lp-btn--sm" href="/login">
						LOG IN
					</Link>
				</div>
			</div>
		</nav>
	);
}
