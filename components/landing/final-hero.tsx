import Link from 'next/link';

/** Final Hero — dark plum + arc detail, wordmark, closing headline + Apply CTA. */
export function FinalHero() {
	return (
		<section className="lp-hero" id="apply">
			<div className="lp-hero-glow lp-final-glow" />
			{/* eslint-disable-next-line @next/next/no-img-element */}
			<img className="lp-hero-arc" src="/landing/hero-ellipse-2.svg" alt="" aria-hidden
				style={{ width: 1100, right: -520, bottom: -260, transform: 'rotate(20deg)' }} />
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
