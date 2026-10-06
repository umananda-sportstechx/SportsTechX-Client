'use client';

import Link from 'next/link';
import { Lock } from 'lucide-react';
import type { Tier } from '@/lib/access';
import './tier-gate.css';

/**
 * What a user sees when they open a page belonging to a product they don't have.
 *
 * Generalised from `InvestorsUpsell`, which was the same screen hand-built for
 * one feature. Same markup, same Atlas classes — it just takes the feature it
 * is standing in for, so every gated route gets one instead of none.
 *
 * Only reached by an Explore user. Someone on the *other* paid tier gets a 404
 * instead: Raise and Scout are sibling products, so there is no sale to make
 * and no reason to advertise a page they would have to switch plans to reach.
 * See `lib/access.ts`.
 *
 * Copy is assembled from strings that were already approved — the sidebar
 * upgrade cards and the billing page — rather than invented for this screen.
 */

/** Where "Get Atlas …" goes. The public landing section, as the upgrade cards
 *  already use; `/subscriptions`, which the legacy upsells pointed at, 404s. */
const LANDING = '/#how-to-join';

const PRODUCT: Record<Exclude<Tier, 'explore'>, {
	name: string;
	/** One line on what the product is for — from the sidebar upgrade cards. */
	tagline: string;
	blurb: string;
	points: [string, string][];
}> = {
	raise: {
		name: 'Atlas Raise',
		tagline: 'Investor targeting for founders raising capital.',
		blurb: 'Atlas Raise helps founders sharpen the pitch, identify investors who are actually active in their category, and run the process end to end — investor intelligence, warm-intro paths and outreach tracking in one place.',
		points: [
			['Active investors', 'Funds, corporates and angels with a disclosed sports-tech deal since 2020.'],
			['Screen by thesis', 'Filter by sector, stage, cheque size and geography, then save the screen.'],
			['Deal history', 'Every round each investor has participated in, with co-investors and dates.'],
		],
	},
	scout: {
		name: 'Atlas Scout',
		tagline: 'Deal flow and screening for investors.',
		blurb: 'Atlas Scout helps investors see what is raising in sports tech, screen it against their own thesis, and track the companies worth following — deal flow, verified raises and deck screening in one place.',
		points: [
			['Matched to your thesis', 'Companies scored against the sectors, stages, geographies and cheque size you invest in.'],
			['Verified raises', 'Live rounds confirmed by SportsTechX, including opportunities shared by the Investor Circle.'],
			['Deck screening', 'Upload a deck and get a structured read: strengths, diligence flags and gaps to probe.'],
		],
	},
};

export function TierGate({ tier, feature }: {
	/** The product that owns the page being gated. */
	tier: Exclude<Tier, 'explore'>;
	/** The screen they tried to open, e.g. "Pipeline". Used in the lock line. */
	feature?: string;
}) {
	const p = PRODUCT[tier];
	return (
		<div className="tier-gate">
			<section className="atlas-card atlas-card--glow tier-gate__main">
				<span className="tier-gate__lock">
					<Lock size={12} aria-hidden="true" />
					{feature ? `${feature} is part of ${p.name}` : `This is part of ${p.name}`}
				</span>
				<h2 className="tier-gate__title">{p.tagline}</h2>
				<p className="tier-gate__body">{p.blurb}</p>
				<div className="tier-gate__cta">
					<Link href={LANDING} className="atlas-btn atlas-btn--primary">Get {p.name}</Link>
					<Link href={LANDING} className="atlas-btn atlas-btn--outline">Talk to the team</Link>
				</div>
			</section>
			<section className="atlas-card tier-gate__about">
				<div className="atlas-eyebrow">About {p.name}</div>
				<div className="tier-gate__points">
					{p.points.map(([t, b]) => (
						<div key={t}>
							<div className="tier-gate__point">{t}</div>
							<p className="tier-gate__muted">{b}</p>
						</div>
					))}
				</div>
			</section>
		</div>
	);
}
