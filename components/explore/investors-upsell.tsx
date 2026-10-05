import Link from 'next/link';
import { Lock } from 'lucide-react';
import { LANDING_RAISE } from './shell-config';

/**
 * Market → Investors (Claude Design): investor intelligence is part of Atlas
 * Raise, so Explore shows the upsell. CTAs go to the public landing page.
 */
const POINTS: [string, string][] = [
	['Active investors', 'Funds, corporates and angels with a disclosed sports-tech deal since 2020.'],
	['Screen by thesis', 'Filter by sector, stage, cheque size and geography, then save the screen.'],
	['Deal history', 'Every round each investor has participated in, with co-investors and dates.'],
];

export function InvestorsUpsell() {
	return (
		<div className="explore-upsell">
			<section className="atlas-card atlas-card--glow explore-upsell__main">
				<span className="explore-upsell__lock"><Lock size={12} aria-hidden="true" /> Investor intelligence is included with Atlas Raise</span>
				<h2 className="explore-upsell__title">Unlock the investor database with Atlas Raise</h2>
				<p className="explore-upsell__body">Who is funding sports tech, what they back and when they last wrote a cheque. Screen active investors by sector, stage, geography and cheque size, then export a shortlist for outreach.</p>
				<div className="explore-upsell__cta">
					<Link href={LANDING_RAISE} className="atlas-btn atlas-btn--primary">Get Atlas Raise</Link>
					<Link href={LANDING_RAISE} className="atlas-btn atlas-btn--outline">Talk to the team</Link>
				</div>
			</section>
			<section className="atlas-card explore-upsell__about">
				<div className="atlas-eyebrow">About Atlas Raise</div>
				<h3 className="atlas-h2">A workspace for founders raising capital</h3>
				<p className="explore-upsell__body">Atlas Raise helps founders sharpen the pitch, identify investors who are actually active in their category, and run the process end to end — investor intelligence, warm-intro paths and outreach tracking in one place.</p>
				<div className="explore-upsell__points">
					{POINTS.map(([t, b]) => <div key={t}><div className="explore-upsell__point">{t}</div><p className="explore-muted">{b}</p></div>)}
				</div>
			</section>
		</div>
	);
}
