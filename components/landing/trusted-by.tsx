'use client';

import { useEffect, useRef, useState } from 'react';
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

	/* Whether the cards already fill the rail decides everything below, and only
	   the browser knows it. Starts at 0 so the server and the first client render
	   both draw the scrolling rail - the common case, and no hydration mismatch. */
	const viewport = useRef<HTMLDivElement | null>(null);
	const [railW, setRailW] = useState(0);
	useEffect(() => {
		const el = viewport.current;
		if (!el) return;
		const measure = () => setRailW(el.clientWidth);
		measure();
		const ro = new ResizeObserver(measure);
		ro.observe(el);
		return () => ro.disconnect();
	}, []);

	const usingCms = Boolean(items?.length);
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

	/* A short list of UPLOADED cards should not scroll - everything is already
	   visible, and tiling it to manufacture something to loop turned one uploaded
	   partner into a wall of the same face. The built-in placeholders are the
	   opposite case: that set is the designed full rail, so it drifts even on a
	   wide screen where its six cards happen to fit. */
	const naturalW = partners.length * STRIDE;
	const measured = railW > 0;
	/* "Fits" means there is room for ANOTHER whole card, not merely that the
	   current ones squeeze in. Six cards on a 1920 screen come to 1716px in a
	   1766px rail: every card is visible, so the old `naturalW <= railW` test
	   stopped the drift - but with 50px of slack the rail reads as full and a
	   dead marquee just looks broken. Leave one card's worth of gap before
	   calling it under-filled. */
	const fits = measured && railW - naturalW >= STRIDE;
	/* `measured &&` guards the CMS branch only. The server has no width to judge
	   by, and guessing one made the first paint emit nine copies of a one-card
	   gallery before hydration collapsed it back. Placeholders need no guess -
	   their count is known, so they can loop from the very first render. */
	const looping = !usingCms || (measured && !fits);

	// Derived from the live count, so a section with three cards drifts three
	// cards' worth per loop rather than six. The marquee wraps by exactly one
	// copy, so that copy has to be at least as wide as the rail or the rail runs
	// out of cards and snaps; repeat until it is.
	// railW is 0 until the effect runs; falling back to naturalW yields reps=1,
	// i.e. the original two-copy rail, and the real count lands a tick later.
	const reps = looping ? Math.max(1, Math.ceil((railW || naturalW) / naturalW)) : 1;
	const copy = reps === 1 ? partners : Array.from({ length: reps }, () => partners).flat();
	const copyW = copy.length * STRIDE;
	const duration = copyW / 46; // ≈46px per second
	// Reduces to STRIDE/46 whatever the count, so one arrow press is always one
	// card regardless of how many times the list had to be repeated.
	const step = (STRIDE / copyW) * duration;

	const shift = (dir: number) => setPhase((p) => (p + dir * step + duration) % duration);

	// Duplicated for the seamless wrap - but only when it actually wraps.
	const cards = looping ? [...copy, ...copy] : partners;

	return (
		<section className="lp-cream lp-trusted" id="trusted">
			<div className="lp-inner">
				<div className="lp-trusted-head">
					<h2>Lorem ipsum dolor sit amet, consetetur</h2>
					<p>Playmakers is a by-invitation private network for high growth sports tech founders and CEOs. Your peers. Your confidants. Your advantage.</p>
				</div>
			</div>

			<div className="lp-carousel">
				{looping && (
					<button className="lp-carousel-arrow lp-carousel-arrow--prev" aria-label="Previous partners" onClick={() => shift(-1)}>
						<ChevronLeft size={30} strokeWidth={1.5} />
					</button>
				)}

				<div className="lp-carousel-viewport" ref={viewport}>
					<div
						className={`lp-carousel-marquee ${looping ? '' : 'is-static'}`}
						style={looping ? { animationDuration: `${duration}s`, animationDelay: `${-phase}s` } : undefined}
					>
						{cards.map((p, i) => (
							<div className="lp-partner" key={i} aria-hidden={i >= partners.length}>
								<div
									className="lp-partner-photo"
									style={{ background: photoBg(p.img, p.tone) }}
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

				{looping && (
					<button className="lp-carousel-arrow lp-carousel-arrow--next" aria-label="Next partners" onClick={() => shift(1)}>
						<ChevronRight size={30} strokeWidth={1.5} />
					</button>
				)}
			</div>
		</section>
	);
}

/**
 * `url('') , <gradient>` is valid CSS and the gradient does show, but an empty
 * URL resolves against the document base - so the browser issues a real GET for
 * the page itself, per card, and discards the HTML. Omit the layer instead.
 */
export function photoBg(img: string, tone: string): string {
	return img ? `url('${img}') center/cover no-repeat, ${tone}` : tone;
}
