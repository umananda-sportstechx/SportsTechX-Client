'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { SiteItem } from '@/lib/site-content';
import { PLACEHOLDER_QUOTES as BASE_QUOTES, quoted } from '@/lib/testimonial-quotes';
import { photoBg } from './trusted-by';

/** Matches the STX landing + Playmakers rails so the sites drift at one rate. */
const DRIFT_PX_PER_SEC = 50;

/**
 * Testimonials — white section, two serif quotes per page with a centred
 * avatar/name chip underneath and chevrons pinned to the page edges.
 *
 * The track is a real `overflow-x: auto` scroller with snap points, so the
 * arrows' scrollBy actually moves it. (The previous version rendered
 * `.lp-slider*` classes that existed in no stylesheet, so it had no overflow
 * and the arrows were inert.)
 *
 * Avatars paint `url(...) , <gradient>`: if the photo file isn't there the
 * request 404s and the gradient shows through — no broken-image icon. A
 * testimonial with no photo at all is allowed and just shows the gradient.
 */
interface Quote {
	quote: string;
	name: string;
	role: string;
	img: string;
	tone: string;
}

const TONES = [
	'linear-gradient(150deg,#c9c2b6,#8a857d)',
	'linear-gradient(150deg,#c2b3a6,#7d7268)',
	'linear-gradient(150deg,#bfc4c9,#787f86)',
	'linear-gradient(150deg,#c8bcc4,#7f747c)',
];

/* Shown until an admin fills Site assets → Atlas → Testimonials. The copy is
   shared with the login panel; only the avatar gradient is this section's. */
const PLACEHOLDER_QUOTES: Quote[] = BASE_QUOTES.map((q, i) => ({ ...q, tone: TONES[i % TONES.length] }));

export function Testimonials({ items }: { items?: SiteItem[] }) {
	const track = useRef<HTMLDivElement | null>(null);
	const paused = useRef(false);
	const resumeAt = useRef<number | null>(null);

	const quotes: Quote[] = items?.length
		? items.map((it, i) => ({
			quote: quoted(it.body ?? ''),
			name: it.title ?? '',
			role: it.subtitle ?? '',
			img: it.url ?? '',
			tone: TONES[i % TONES.length],
		}))
		: PLACEHOLDER_QUOTES;

	// Continuous smooth drift (marquee). The quotes are rendered twice and the
	// scroll position wraps at the halfway mark for a seamless loop. Pauses on
	// hover / focus and while the arrows settle; never runs under
	// prefers-reduced-motion. Mirrors the STX landing + Playmakers rails.
	useEffect(() => {
		const el = track.current;
		if (!el) return;
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		el.scrollLeft = 1;
		let raf = 0;
		let last = performance.now();
		let pos = el.scrollLeft;
		const tick = (now: number) => {
			const dt = Math.min(now - last, 100) / 1000; // clamp after a background tab
			last = now;
			if (paused.current) {
				pos = el.scrollLeft; // pick up wherever the arrows or a drag left it
			} else {
				const half = el.scrollWidth / 2;
				pos += DRIFT_PX_PER_SEC * dt;
				if (pos >= half) pos -= half;
				el.scrollLeft = pos;
			}
			raf = requestAnimationFrame(tick);
		};
		raf = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(raf);
	}, [quotes.length]);

	useEffect(() => () => { if (resumeAt.current) window.clearTimeout(resumeAt.current); }, []);

	// One card per press, measured rather than assumed. The drift rewrites
	// scrollLeft every frame, so hold it while the smooth scroll settles, and
	// wrap near either end since the track carries two copies.
	const scroll = (dir: number) => {
		const el = track.current;
		if (!el) return;
		paused.current = true;
		if (resumeAt.current) window.clearTimeout(resumeAt.current);
		const card = el.firstElementChild as HTMLElement | null;
		const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
		const delta = dir * ((card?.offsetWidth ?? el.clientWidth) + gap);
		const half = el.scrollWidth / 2;
		if (el.scrollLeft + delta < 0) el.scrollLeft += half;
		else if (el.scrollLeft + delta > el.scrollWidth - el.clientWidth) el.scrollLeft -= half;
		el.scrollBy({ left: delta, behavior: 'smooth' });
		resumeAt.current = window.setTimeout(() => { paused.current = false; }, 800);
	};
	const pause = () => { paused.current = true; };
	const resume = () => { paused.current = false; };

	return (
		<section className="lp-testi" id="testimonials">
			<div className="lp-rule-label"><i /><span>Atlas Testimonials</span><i /></div>

			<button className="lp-testi-arrow lp-testi-arrow--prev" aria-label="Previous testimonials" onClick={() => scroll(-1)} onPointerEnter={pause} onPointerLeave={resume}>
				<ChevronLeft size={28} strokeWidth={1.5} />
			</button>

			<div className="lp-testi-track" ref={track} onPointerEnter={pause} onPointerLeave={resume} onFocusCapture={pause} onBlurCapture={resume}>
				{quotes.map((q, i) => (
					<figure className="lp-quote-wrap" key={i}>
						<blockquote className="lp-quote">{q.quote}</blockquote>
						<figcaption className="lp-chip">
							<span className="lp-chip-avatar" style={{ background: photoBg(q.img, q.tone) }} />
							<span>
								<span className="lp-chip-name">{q.name}</span>
								<span className="lp-chip-role">{q.role}</span>
							</span>
						</figcaption>
					</figure>
				))}
				{/* Second pass makes the wrap seamless; hidden from assistive tech. */}
				<div className="contents" aria-hidden>
					{quotes.map((q, i) => (
						<figure className="lp-quote-wrap" key={`dup-${i}`}>
							<blockquote className="lp-quote">{q.quote}</blockquote>
							<figcaption className="lp-chip">
								<span className="lp-chip-avatar" style={{ background: photoBg(q.img, q.tone) }} />
								<span>
									<span className="lp-chip-name">{q.name}</span>
									<span className="lp-chip-role">{q.role}</span>
								</span>
							</figcaption>
						</figure>
					))}
				</div>
			</div>

			<button className="lp-testi-arrow lp-testi-arrow--next" aria-label="Next testimonials" onClick={() => scroll(1)} onPointerEnter={pause} onPointerLeave={resume}>
				<ChevronRight size={28} strokeWidth={1.5} />
			</button>
		</section>
	);
}
