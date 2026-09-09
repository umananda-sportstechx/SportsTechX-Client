import Link from 'next/link';

/* eslint-disable @next/next/no-img-element */

/**
 * Intro Hero — a 1:1 rebuild of the Figma frame `6018:2804` (1512×1007, #060a17).
 *
 * Background layers, painted bottom → top exactly as Figma stacks them:
 *   1. Gradient Overlay  — radial pink, centre (405.5, 1652) r≈1331, opacity .87
 *   2. Vector            — the concentric ring outlines (pink #F32163 @ .32,
 *                          gradient-faded transparent→pink toward lower-right)
 *   3. Ellipse 2         — radial pink circle, 1571², centre (-146.5, 1357.5)
 *   4. Ellipse 3         — linear dark circle, same box, on top
 *
 * Every child is positioned in % of `.lp-hero-bg`, which is the design frame
 * scaled like `cover`, so the composition holds at any viewport. Nothing is
 * painted above the circles — that's what previously drew ring lines across
 * the sphere.
 */
export function IntroHero() {
	return (
		<header className="lp-hero lp-hero--intro" id="top">
			<div className="lp-hero-bg" aria-hidden>
				<div className="lp-hero-grad" />
				{/* Vector — concentric rings. The asset's viewBox is pre-cropped to the
				    exact window the design shows (user space 1853,469 → 3365,1476), so
				    this is a normal 1512×1007 image rather than a 12.6-megapixel one
				    that Chrome refuses to rasterise inside the composited page. */}
				<img className="lp-hero-orb" src="/landing/hero-rings.svg" alt=""
					style={{ left: 0, top: 0, width: '112.500%', height: '100%' }} />
				{/* Ellipse 2 — radial pink */}
				<img className="lp-hero-orb" src="/landing/hero-ellipse-1.svg" alt=""
					style={{ left: '-61.640%', top: '56.802%', width: '103.902%', height: '156.008%', transform: 'rotate(-25.65deg)' }} />
				{/* Ellipse 3 — linear dark, on top */}
				<img className="lp-hero-orb" src="/landing/hero-ellipse-2.svg" alt=""
					style={{ left: '-61.640%', top: '56.802%', width: '103.902%', height: '156.008%', transform: 'rotate(144.3deg)' }} />
			</div>

			<div className="lp-hero-inner">
				<div className="lp-hero-texts">
					<img className="lp-hero-wordmark" src="/landing/atlas-wordmark.svg" alt="Atlas" />
					<h1 className="lp-display lp-hero-headline">Your insider guide to<br />sports tech &amp; venture</h1>
				</div>
				<div className="lp-hero-ctas">
					<Link className="lp-btn lp-btn--pink" href="/signup">Book a demo</Link>
					<a className="lp-btn lp-btn--outline" href="#how-to-join">View the tiers</a>
				</div>
			</div>
		</header>
	);
}
