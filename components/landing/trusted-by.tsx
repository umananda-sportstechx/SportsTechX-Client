'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { SiteItem } from '@/lib/site-content';

/* eslint-disable @next/next/no-img-element */

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
 * image icon. That is why the CMS images keep a `tone` behind them too.
 */
interface Card {
	img: string;
	tone: string;
	name: string;
	title: string;
	logoUrl: string | null;
	logoText: string;
}

/* Shown until an admin puts real cards in this section (Site assets → Atlas →
   Carousel gallery). One uploaded card replaces ALL of these, not just one. */
const TONES = [
	'linear-gradient(160deg,#8d7f6f,#332c26)',
	'linear-gradient(160deg,#9a6f56,#31241d)',
	'linear-gradient(160deg,#7e8a93,#282e33)',
	'linear-gradient(160deg,#8a7a86,#2c262c)',
	'linear-gradient(160deg,#6f8479,#242b28)',
	'linear-gradient(160deg,#94816b,#302a24)',
];
const PLACEHOLDER_PARTNERS: Card[] = TONES.map((tone, i) => ({
	img: `/landing/partner-${i + 1}.jpg`,
	tone,
	name: 'Alexander Janssen',
	title: 'CEO, Dutch SportsTech Fund',
	logoUrl: null,
	logoText: 'BCG',
}));

const STRIDE = 286; // card 210 + gap 76 (design)

export function TrustedBy({ items }: { items?: SiteItem[] }) {
	const [phase, setPhase] = useState(0); // seconds into the loop

	const partners: Card[] = items?.length
		? items.map((it, i) => ({
			img: it.url ?? '',
			tone: TONES[i % TONES.length],
			name: it.title ?? '',
			title: it.subtitle ?? '',
			logoUrl: it.logoUrl,
			logoText: '',
		}))
		: PLACEHOLDER_PARTNERS;

	// Derived from the live count, so a section with three cards drifts three
	// cards' worth per loop rather than six.
	const copyW = partners.length * STRIDE;
	const duration = copyW / 46; // ≈46px per second
	const step = (STRIDE / copyW) * duration;

	const shift = (dir: number) => setPhase((p) => (p + dir * step + duration) % duration);

	const cards = [...partners, ...partners]; // duplicated for the seamless wrap

	return (
		<section className="lp-cream lp-trusted" id="trusted">
			<div className="lp-inner">
				<div className="lp-trusted-head">
					<h2>Lorem ipsum dolor sit amet, consetetur</h2>
					<p>Playmakers is a by-invitation private network for high growth sports tech founders and CEOs. Your peers. Your confidants. Your advantage.</p>
				</div>
			</div>

			<div className="lp-carousel">
				<button className="lp-carousel-arrow lp-carousel-arrow--prev" aria-label="Previous partners" onClick={() => shift(-1)}>
					<ChevronLeft size={30} strokeWidth={1.5} />
				</button>

				<div className="lp-carousel-viewport">
					<div
						className="lp-carousel-marquee"
						style={{ animationDuration: `${duration}s`, animationDelay: `${-phase}s` }}
					>
						{cards.map((p, i) => (
							<div className="lp-partner" key={i} aria-hidden={i >= partners.length}>
								<div
									className="lp-partner-photo"
									style={{ background: `url('${p.img}') center/cover no-repeat, ${p.tone}` }}
								>
									{/* The company mark sits at the middle bottom of the photo.
									    An uploaded logo replaces the wordmark; with neither, the
									    slot is simply empty rather than showing stale branding. */}
									{p.logoUrl
										? <img className="lp-partner-logo lp-partner-logo--img" src={p.logoUrl} alt="" />
										: p.logoText ? <span className="lp-partner-logo">{p.logoText}</span> : null}
								</div>
								<div className="lp-partner-name">{p.name}</div>
								<div className="lp-partner-title">{p.title}</div>
							</div>
						))}
					</div>
				</div>

				<button className="lp-carousel-arrow lp-carousel-arrow--next" aria-label="Next partners" onClick={() => shift(1)}>
					<ChevronRight size={30} strokeWidth={1.5} />
				</button>
			</div>
		</section>
	);
}
