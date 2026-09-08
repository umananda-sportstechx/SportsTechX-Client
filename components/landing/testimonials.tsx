'use client';

import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useRef } from 'react';

const QUOTES = [
	{ quote: '“We walked into our raise knowing the market cold. That confidence changed every conversation.”', name: 'Alexander Janssen', role: 'CEO, Dutch SportsTech Fund' },
	{ quote: '“We walked into our raise knowing the market cold. That confidence changed every conversation.”', name: 'Alexander Janssen', role: 'CEO, Dutch SportsTech Fund' },
	{ quote: '“The intelligence and the introductions paid for the membership in the first month.”', name: 'Maria Alvarez', role: 'Founder, Pitch Analytics' },
	{ quote: '“The intelligence and the introductions paid for the membership in the first month.”', name: 'Maria Alvarez', role: 'Founder, Pitch Analytics' },
];

export function Testimonials() {
	const track = useRef<HTMLDivElement | null>(null);
	const scroll = (dir: number) => track.current?.scrollBy({ left: dir * 620, behavior: 'smooth' });
	return (
		<section className="lp-cream lp-testi" id="testimonials">
			<div className="lp-inner">
				<div style={{ textAlign: 'center' }}>
					<span className="lp-eyebrow lp-eyebrow--center">Atlas Testimonials</span>
				</div>
				<div className="lp-slider" style={{ position: 'relative' }}>
					<div className="lp-slider-track lp-testi-grid" ref={track} style={{ display: 'flex' }}>
						{QUOTES.map((q, i) => (
							<div className="lp-quote-wrap" key={i} style={{ flex: '0 0 540px', scrollSnapAlign: 'start' }}>
								<p className="lp-quote">{q.quote}</p>
								<div className="lp-chip">
									<span className="lp-chip-avatar" />
									<div><div className="lp-chip-name">{q.name}</div><div className="lp-chip-role">{q.role}</div></div>
								</div>
							</div>
						))}
					</div>
					<div className="lp-slider-controls">
						<button className="lp-pill-arrow" aria-label="Previous" onClick={() => scroll(-1)}><ArrowLeft size={18} /></button>
						<button className="lp-pill-arrow" aria-label="Next" onClick={() => scroll(1)}><ArrowRight size={18} /></button>
					</div>
				</div>
			</div>
		</section>
	);
}
