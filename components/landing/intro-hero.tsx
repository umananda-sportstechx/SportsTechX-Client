import Link from 'next/link';

/** Intro Hero — dark plum, pink radial glow + decorative arcs, Atlas wordmark,
 *  headline and two CTAs. */
export function IntroHero() {
	return (
		<header className="lp-hero" id="top">
			<div className="lp-hero-glow lp-intro-glow" />
			{/* eslint-disable-next-line @next/next/no-img-element */}
			<img className="lp-hero-arc" src="/landing/hero-ellipse-1.svg" alt="" aria-hidden
				style={{ width: 1200, left: -620, top: 220, transform: 'rotate(-26deg)' }} />
			{/* eslint-disable-next-line @next/next/no-img-element */}
			<img className="lp-hero-arc" src="/landing/hero-arc-lines.svg" alt="" aria-hidden
				style={{ width: 1700, right: -700, top: -140, opacity: 0.35 }} />
			<div className="lp-hero-inner">
				{/* eslint-disable-next-line @next/next/no-img-element */}
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
