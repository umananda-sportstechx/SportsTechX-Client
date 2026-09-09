'use client';

import { useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Trusted by — cream section with a continuously auto-scrolling partner
 * carousel. The track holds the list twice so the scroll can wrap seamlessly:
 * once scrollLeft passes half the track it is rolled back by exactly half,
 * which lands on an identical frame. Arrows nudge by one card stride and
 * briefly pause the drift; hover/focus pauses it too, and it never starts for
 * users who prefer reduced motion.
 */
const PARTNERS = [
	{ name: 'Alexander Janssen', title: 'CEO, Dutch SportsTech Fund', logo: 'BCG', tone: 'linear-gradient(150deg,#8d7f6f,#3d3630)' },
	{ name: 'Alexander Janssen', title: 'CEO, Dutch SportsTech Fund', logo: 'BCG', tone: 'linear-gradient(150deg,#9a6f56,#3a2a22)' },
	{ name: 'Alexander Janssen', title: 'CEO, Dutch SportsTech Fund', logo: 'BCG', tone: 'linear-gradient(150deg,#7e8a93,#2f363b)' },
	{ name: 'Alexander Janssen', title: 'CEO, Dutch SportsTech Fund', logo: 'BCG', tone: 'linear-gradient(150deg,#8a7a86,#332c33)' },
	{ name: 'Alexander Janssen', title: 'CEO, Dutch SportsTech Fund', logo: 'BCG', tone: 'linear-gradient(150deg,#6f8479,#2b332f)' },
	{ name: 'Alexander Janssen', title: 'CEO, Dutch SportsTech Fund', logo: 'BCG', tone: 'linear-gradient(150deg,#94816b,#38312a)' },
];

/** card (210) + gap (76) — matches the design's 286px stride */
const STRIDE = 286;

export function TrustedBy() {
	const track = useRef<HTMLDivElement | null>(null);
	const paused = useRef(false);
	const resume = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		const el = track.current;
		if (!el) return;
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		let raf = 0;
		const step = () => {
			if (!paused.current && el.scrollWidth > 0) {
				el.scrollLeft += 0.45;
				const half = el.scrollWidth / 2;
				if (el.scrollLeft >= half) el.scrollLeft -= half;
			}
			raf = requestAnimationFrame(step);
		};
		raf = requestAnimationFrame(step);
		return () => {
			cancelAnimationFrame(raf);
			if (resume.current) clearTimeout(resume.current);
		};
	}, []);

	const nudge = (dir: number) => {
		const el = track.current;
		if (!el) return;
		// wrap before stepping back past the start so the loop stays seamless
		const half = el.scrollWidth / 2;
		if (dir < 0 && el.scrollLeft < STRIDE) el.scrollLeft += half;
		paused.current = true;
		el.scrollBy({ left: dir * STRIDE, behavior: 'smooth' });
		if (resume.current) clearTimeout(resume.current);
		resume.current = setTimeout(() => { paused.current = false; }, 700);
	};

	// rendered twice for the seamless wrap
	const items = [...PARTNERS, ...PARTNERS];

	return (
		<section className="lp-cream lp-trusted" id="trusted">
			<div className="lp-inner">
				<div className="lp-trusted-head">
					<h2>Lorem ipsum dolor sit amet, consetetur</h2>
					<p>Playmakers is a by-invitation private network for high growth sports tech founders and CEOs. Your peers. Your confidants. Your advantage.</p>
				</div>
			</div>

			<div
				className="lp-carousel"
				onMouseEnter={() => { paused.current = true; }}
				onMouseLeave={() => { paused.current = false; }}
			>
				<button className="lp-carousel-arrow lp-carousel-arrow--prev" aria-label="Previous partners" onClick={() => nudge(-1)}>
					<ChevronLeft size={30} strokeWidth={1.5} />
				</button>

				<div className="lp-carousel-track" ref={track} aria-label="Partners">
					{items.map((p, i) => (
						<div className="lp-partner" key={i} aria-hidden={i >= PARTNERS.length}>
							<div className="lp-partner-photo" style={{ background: p.tone }}>
								<span className="lp-partner-logo">{p.logo}</span>
							</div>
							<div className="lp-partner-name">{p.name}</div>
							<div className="lp-partner-title">{p.title}</div>
						</div>
					))}
				</div>

				<button className="lp-carousel-arrow lp-carousel-arrow--next" aria-label="Next partners" onClick={() => nudge(1)}>
					<ChevronRight size={30} strokeWidth={1.5} />
				</button>
			</div>
		</section>
	);
}
