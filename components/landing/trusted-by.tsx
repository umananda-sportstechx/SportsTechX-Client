'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Trusted by — cream section with a continuously auto-scrolling partner
 * carousel.
 *
 * The drift is a pure CSS keyframes marquee (translateX 0 → -50% on a track
 * that renders the list twice, so the loop is seamless). It deliberately does
 * NOT use requestAnimationFrame + scrollLeft: that approach stalled, because
 * reading scrollLeft back snaps to whole device pixels so sub-pixel steps were
 * rounded away. A CSS animation is composited by the browser and can't stall.
 *
 * The arrows shift the animation's phase via a negative `animation-delay`
 * (one card stride = STRIDE/COPY_W of the duration), so stepping keeps the
 * drift running rather than fighting it. Hover pauses; reduced-motion stops it.
 *
 * Photos: each card paints `url(...) , <gradient>`. If the photo file isn't
 * present the request 404s and the gradient underneath still shows — no broken
 * image icon — so dropping the real files in is all that's needed.
 */
const PARTNERS = [
	{ img: '/landing/partner-1.jpg', tone: 'linear-gradient(160deg,#8d7f6f,#332c26)' },
	{ img: '/landing/partner-2.jpg', tone: 'linear-gradient(160deg,#9a6f56,#31241d)' },
	{ img: '/landing/partner-3.jpg', tone: 'linear-gradient(160deg,#7e8a93,#282e33)' },
	{ img: '/landing/partner-4.jpg', tone: 'linear-gradient(160deg,#8a7a86,#2c262c)' },
	{ img: '/landing/partner-5.jpg', tone: 'linear-gradient(160deg,#6f8479,#242b28)' },
	{ img: '/landing/partner-6.jpg', tone: 'linear-gradient(160deg,#94816b,#302a24)' },
];
const NAME = 'Alexander Janssen';
const TITLE = 'CEO, Dutch SportsTech Fund';

const STRIDE = 286;                          // card 210 + gap 76 (design)
const COPY_W = PARTNERS.length * STRIDE;     // width of one copy of the list
const DURATION = COPY_W / 46;                // ≈46px per second
const STEP = (STRIDE / COPY_W) * DURATION;   // seconds equal to one card

export function TrustedBy() {
	const [phase, setPhase] = useState(0); // seconds into the loop
	const step = (dir: number) => setPhase((p) => (p + dir * STEP + DURATION) % DURATION);

	const items = [...PARTNERS, ...PARTNERS]; // duplicated for the seamless wrap

	return (
		<section className="lp-cream lp-trusted" id="trusted">
			<div className="lp-inner">
				<div className="lp-trusted-head">
					<h2>Lorem ipsum dolor sit amet, consetetur</h2>
					<p>Playmakers is a by-invitation private network for high growth sports tech founders and CEOs. Your peers. Your confidants. Your advantage.</p>
				</div>
			</div>

			<div className="lp-carousel">
				<button className="lp-carousel-arrow lp-carousel-arrow--prev" aria-label="Previous partners" onClick={() => step(-1)}>
					<ChevronLeft size={30} strokeWidth={1.5} />
				</button>

				<div className="lp-carousel-viewport">
					<div
						className="lp-carousel-marquee"
						style={{ animationDuration: `${DURATION}s`, animationDelay: `${-phase}s` }}
					>
						{items.map((p, i) => (
							<div className="lp-partner" key={i} aria-hidden={i >= PARTNERS.length}>
								<div
									className="lp-partner-photo"
									style={{ background: `url('${p.img}') center/cover no-repeat, ${p.tone}` }}
								>
									<span className="lp-partner-logo">BCG</span>
								</div>
								<div className="lp-partner-name">{NAME}</div>
								<div className="lp-partner-title">{TITLE}</div>
							</div>
						))}
					</div>
				</div>

				<button className="lp-carousel-arrow lp-carousel-arrow--next" aria-label="Next partners" onClick={() => step(1)}>
					<ChevronRight size={30} strokeWidth={1.5} />
				</button>
			</div>
		</section>
	);
}
