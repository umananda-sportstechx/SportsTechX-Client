'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useRef } from 'react';

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
 * request 404s and the gradient shows through — no broken-image icon.
 */
const QUOTES = [
	{ quote: '“We walked into our raise knowing the market cold. That confidence changed every conversation.”', name: 'Alexander Janssen', role: 'CEO, Dutch SportsTech Fund', img: '/landing/testi-1.jpg', tone: 'linear-gradient(150deg,#c9c2b6,#8a857d)' },
	{ quote: '“We walked into our raise knowing the market cold. That confidence changed every conversation.”', name: 'Alexander Janssen', role: 'CEO, Dutch SportsTech Fund', img: '/landing/testi-2.jpg', tone: 'linear-gradient(150deg,#c2b3a6,#7d7268)' },
	{ quote: '“The intelligence and the introductions paid for the membership in the first month.”', name: 'Maria Alvarez', role: 'Founder, Pitch Analytics', img: '/landing/testi-3.jpg', tone: 'linear-gradient(150deg,#bfc4c9,#787f86)' },
	{ quote: '“The intelligence and the introductions paid for the membership in the first month.”', name: 'Maria Alvarez', role: 'Founder, Pitch Analytics', img: '/landing/testi-4.jpg', tone: 'linear-gradient(150deg,#c8bcc4,#7f747c)' },
];

export function Testimonials() {
	const track = useRef<HTMLDivElement | null>(null);
	const scroll = (dir: number) => {
		const el = track.current;
		if (el) el.scrollBy({ left: dir * el.clientWidth, behavior: 'smooth' });
	};

	return (
		<section className="lp-testi" id="testimonials">
			<div className="lp-rule-label"><i /><span>Atlas Testimonials</span><i /></div>

			<button className="lp-testi-arrow lp-testi-arrow--prev" aria-label="Previous testimonials" onClick={() => scroll(-1)}>
				<ChevronLeft size={28} strokeWidth={1.5} />
			</button>

			<div className="lp-testi-track" ref={track}>
				{QUOTES.map((q, i) => (
					<figure className="lp-quote-wrap" key={i}>
						<blockquote className="lp-quote">{q.quote}</blockquote>
						<figcaption className="lp-chip">
							<span className="lp-chip-avatar" style={{ background: `url('${q.img}') center/cover no-repeat, ${q.tone}` }} />
							<span>
								<span className="lp-chip-name">{q.name}</span>
								<span className="lp-chip-role">{q.role}</span>
							</span>
						</figcaption>
					</figure>
				))}
			</div>

			<button className="lp-testi-arrow lp-testi-arrow--next" aria-label="Next testimonials" onClick={() => scroll(1)}>
				<ChevronRight size={28} strokeWidth={1.5} />
			</button>
		</section>
	);
}
