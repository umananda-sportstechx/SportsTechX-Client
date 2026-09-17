'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useRef } from 'react';
import type { SiteItem } from '@/lib/site-content';

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

/* Shown until an admin fills Site assets → Atlas → Testimonials. */
const PLACEHOLDER_QUOTES: Quote[] = [
	{ quote: '“We walked into our raise knowing the market cold. That confidence changed every conversation.”', name: 'Alexander Janssen', role: 'CEO, Dutch SportsTech Fund', img: '/landing/testi-1.jpg', tone: TONES[0] },
	{ quote: '“We walked into our raise knowing the market cold. That confidence changed every conversation.”', name: 'Alexander Janssen', role: 'CEO, Dutch SportsTech Fund', img: '/landing/testi-2.jpg', tone: TONES[1] },
	{ quote: '“The intelligence and the introductions paid for the membership in the first month.”', name: 'Maria Alvarez', role: 'Founder, Pitch Analytics', img: '/landing/testi-3.jpg', tone: TONES[2] },
	{ quote: '“The intelligence and the introductions paid for the membership in the first month.”', name: 'Maria Alvarez', role: 'Founder, Pitch Analytics', img: '/landing/testi-4.jpg', tone: TONES[3] },
];

/** Admins type a plain message; the design's curly quotes are added here rather
 *  than being something they have to remember to paste. */
function quoted(text: string): string {
	const t = text.trim();
	if (!t) return '';
	return /^[“"]/.test(t) ? t : `“${t}”`;
}

export function Testimonials({ items }: { items?: SiteItem[] }) {
	const track = useRef<HTMLDivElement | null>(null);

	const quotes: Quote[] = items?.length
		? items.map((it, i) => ({
			quote: quoted(it.body ?? ''),
			name: it.title ?? '',
			role: it.subtitle ?? '',
			img: it.url ?? '',
			tone: TONES[i % TONES.length],
		}))
		: PLACEHOLDER_QUOTES;

	// One card per press, measured rather than assumed. `clientWidth` was right
	// only while the cards were exactly 100%; below 760 they are held back to
	// 86% so the next quote peeks, and paging by the viewport then overshoots by
	// the peek every time and walks the rail out of alignment.
	const scroll = (dir: number) => {
		const el = track.current;
		if (!el) return;
		const card = el.firstElementChild as HTMLElement | null;
		// Width + gap. The mobile track has a real gap between quotes now, so the
		// card's own width is one gutter short of the pitch; snap currently hides
		// the difference, but only by chance — this does not depend on it.
		const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
		el.scrollBy({ left: dir * ((card?.offsetWidth ?? el.clientWidth) + gap), behavior: 'smooth' });
	};

	return (
		<section className="lp-testi" id="testimonials">
			<div className="lp-rule-label"><i /><span>Atlas Testimonials</span><i /></div>

			<button className="lp-testi-arrow lp-testi-arrow--prev" aria-label="Previous testimonials" onClick={() => scroll(-1)}>
				<ChevronLeft size={28} strokeWidth={1.5} />
			</button>

			<div className="lp-testi-track" ref={track}>
				{quotes.map((q, i) => (
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
