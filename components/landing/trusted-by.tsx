'use client';

import { useRef } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';

const PARTNERS = Array.from({ length: 8 }, () => ({
	name: 'Alexander Janssen',
	title: 'CEO, Dutch SportsTech Fund',
	logo: 'BCG',
}));

export function TrustedBy() {
	const track = useRef<HTMLDivElement | null>(null);
	const scroll = (dir: number) => track.current?.scrollBy({ left: dir * 496, behavior: 'smooth' });

	return (
		<section className="lp-cream lp-trusted" id="trusted">
			<div className="lp-inner">
				<div className="lp-trusted-head">
					<h2>Lorem ipsum dolor sit amet, consetetur</h2>
					<p>Playmakers is a by-invitation private network for high growth sports tech founders and CEOs. Your peers. Your confidants. Your advantage.</p>
				</div>
				<div className="lp-slider">
					<div className="lp-slider-track" ref={track}>
						{PARTNERS.map((p, i) => (
							<div className="lp-partner" key={i}>
								<div className="lp-partner-photo"><span className="lp-partner-logo">{p.logo}</span></div>
								<div className="lp-partner-name">{p.name}</div>
								<div className="lp-partner-title">{p.title}</div>
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
