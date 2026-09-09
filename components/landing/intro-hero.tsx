import Link from 'next/link';

/* eslint-disable @next/next/no-img-element */

/** Intro Hero — full-height dark plum with the design's background detail
 *  (concentric ring outlines + a pink-radial circle + a dark circle, all
 *  centred off the bottom-left, matching the Figma transforms on a 1512×1007
 *  stage anchored to the hero's bottom), the Atlas wordmark, headline and CTAs. */
export function IntroHero() {
	return (
		<header className="lp-hero lp-hero--intro" id="top">
			<div className="lp-hero-bg" aria-hidden>
				{/* dark circle (Ellipse 3) — centre (-146.5, 1357.5), r 785.5 */}
				<img className="lp-hero-orb" src="/landing/hero-ellipse-2.svg" alt=""
					style={{ left: -932, top: 572, width: 1571, height: 1571, transform: 'rotate(144.3deg)' }} />
				{/* pink radial circle (Ellipse 2) — same centre */}
				<img className="lp-hero-orb" src="/landing/hero-ellipse-1.svg" alt=""
					style={{ left: -932, top: 572, width: 1571, height: 1571, transform: 'rotate(-25.65deg)' }} />
			</div>
			{/* concentric ring outlines (CSS — the design's SVG rings are invisible on the dark bg) */}
			<div className="lp-hero-rings" aria-hidden />
			<div className="lp-hero-glow lp-intro-glow" />
			<div className="lp-hero-inner">
				<img className="lp-hero-wordmark" src="/landing/atlas-wordmark.svg" alt="Atlas" />
				<h1 className="lp-display lp-hero-headline">Your insider guide to<br />sports tech &amp; venture</h1>
				<div className="lp-hero-ctas">
					<Link className="lp-btn lp-btn--pink" href="/signup">Book a demo</Link>
					<a className="lp-btn lp-btn--outline" href="#how-to-join">View the tiers</a>
				</div>
			</div>
		</header>
	);
}
