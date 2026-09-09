import Link from 'next/link';

/* eslint-disable @next/next/no-img-element */

/** Final Hero — dark plum + arc detail, wordmark, closing headline + Apply CTA. */
export function FinalHero() {
	return (
		<section className="lp-hero" id="apply">
			{/* eslint-disable-next-line @next/next/no-img-element */}
			<div className="lp-hero-bg lp-hero-bg--final" aria-hidden>
				<img className="lp-hero-orb" src="/landing/hero-ellipse-1.svg" alt=""
					style={{ right: -760, bottom: -700, width: 1571, height: 1571, transform: 'rotate(30deg)' }} />
				<div className="lp-hero-glow lp-final-glow" />
			</div>
			<div className="lp-hero-rings lp-hero-rings--final" aria-hidden />
			<div className="lp-hero-inner" style={{ padding: '110px 24px' }}>
				{/* eslint-disable-next-line @next/next/no-img-element */}
				<img className="lp-hero-wordmark lp-hero-wordmark--sm" src="/landing/atlas-wordmark.svg" alt="Atlas" />
				<h2 className="lp-display lp-hero-headline" style={{ maxWidth: 1000 }}>Built for sports tech&rsquo;s most daring operators</h2>
				<p className="lp-hero-sub">See how founders and investors use Atlas to navigate, raise and do deals in sports tech.</p>
				<div className="lp-hero-ctas">
					<Link className="lp-btn lp-btn--pink" href="/signup">Apply for membership</Link>
				</div>
			</div>
		</section>
	);
}
