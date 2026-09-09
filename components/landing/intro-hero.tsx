import Link from 'next/link';

/* eslint-disable @next/next/no-img-element */

/**
 * Intro Hero — built on the Figma frame `6018:2804` (1512×1007, #060a17).
 *
 * The background reads as a planet with orbits around it:
 *   1. Gradient Overlay — radial pink wash, spanning the whole hero
 *   2. Rings            — concentric orbits, centred on the planet
 *   3. Planet           — dark sphere with a limb light, painted over the rings
 *                         so the inner orbits pass behind it
 *
 * Rings and planet share `.lp-hero-system` so they drift as one body; if only
 * the planet moved, the orbits would visibly slip off centre.
 *
 * Both are positioned in % of `.lp-hero-bg`, the design frame at its true
 * scale. The planet's 103.902% × 156.008% box is square in pixels (the stage
 * is exactly 1512:1007), so `border-radius: 50%` gives a true circle. The ring
 * asset's viewBox is cropped so its centre lands on the planet's centre — see
 * the note in landing.css.
 */
export function IntroHero() {
	return (
		<header className="lp-hero lp-hero--intro" id="top">
			{/* The pink wash spans the whole hero, NOT the stage. Once the stage is
			    centred it no longer reaches the viewport's left edge, and a wash
			    clipped to the stage box ended on a hard vertical seam. */}
			<div className="lp-hero-grad" aria-hidden />
			<div className="lp-hero-bg" aria-hidden>
				{/* The wrapper is exactly the stage box (inset: 0), so its children's %
				    offsets resolve against the same box the stage uses. */}
				<div className="lp-hero-system">
					{/* Orbits. The asset's viewBox is cropped to the visible window, so
					    this rasterises at ~1600×947 rather than as the 12.6-megapixel
					    full drawing, which Chrome refuses to draw inside the page. */}
					<img className="lp-hero-orb lp-hero-orbits" src="/landing/hero-orbits.svg" alt=""
						style={{ left: 0, top: 0, width: '112.500%', height: '100%' }} />
					{/* Planet — painted last so the inner orbits pass behind it. */}
					<span className="lp-hero-planet"
						style={{ left: '-61.640%', top: '56.802%', width: '103.902%', height: '156.008%' }} />
				</div>
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
