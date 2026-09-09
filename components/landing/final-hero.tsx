import Link from 'next/link';

/* eslint-disable @next/next/no-img-element */

/**
 * Final Hero — Figma frame `9014:864` (1512×689). Same layer stack as the intro
 * hero, using that frame's own coordinates: BG Detail at (129, -479) 3162×3118
 * and both circles at (577, 268) 1571², i.e. the glow sits off the bottom-right.
 */
export function FinalHero() {
	return (
		<section className="lp-hero" id="apply">
			<div className="lp-hero-bg lp-hero-bg--final" aria-hidden>
				<div className="lp-hero-grad lp-hero-grad--final" />
				{/* Same cropped ring art, mirrored so the arcs sweep up from the
				    bottom-right where this frame's glow sits. */}
				<img className="lp-hero-orb" src="/landing/hero-rings.svg" alt=""
					style={{ left: 0, top: 0, width: '100%', height: '100%', transform: 'scaleX(-1)' }} />
				<img className="lp-hero-orb" src="/landing/hero-ellipse-1.svg" alt=""
					style={{ left: '38.161%', top: '38.897%', width: '103.902%', height: '228.012%' }} />
				<img className="lp-hero-orb" src="/landing/hero-ellipse-2.svg" alt=""
					style={{ left: '38.161%', top: '38.897%', width: '103.902%', height: '228.012%' }} />
			</div>

			<div className="lp-hero-inner" style={{ padding: '110px 24px' }}>
				<div className="lp-hero-texts">
					<img className="lp-hero-wordmark lp-hero-wordmark--sm" src="/landing/atlas-wordmark.svg" alt="Atlas" />
					<h2 className="lp-display lp-hero-headline">Built for sports tech&rsquo;s most daring operators</h2>
				</div>
				<p className="lp-hero-sub">See how founders and investors use Atlas to navigate, raise and do deals in sports tech.</p>
				<div className="lp-hero-ctas">
					<Link className="lp-btn lp-btn--pink" href="/signup">Apply for membership</Link>
				</div>
			</div>
		</section>
	);
}
