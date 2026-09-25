'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';

/* eslint-disable @next/next/no-img-element */

/**
 * How to join — cream section pairing an editorial left column with a stack of
 * the three tier cards. The switcher promotes a tier: its card expands (wordmark,
 * tier label, heading and checklist) while the other two collapse to just their
 * wordmark + label, exactly like the design's deck.
 */
type Key = 'explore' | 'raise' | 'scout';

const TIERS: {
	key: Key; label: string; colour: string; accent: string; eyebrow: string;
	sub: string; desc: string; points: string[];
}[] = [
	{
		key: 'explore', label: 'EXPLORE', colour: '#ff3373', accent: '#f32163',
		eyebrow: 'Atlas Explore · The Base',
		sub: 'Map the landscape',
		desc: 'The foundational layer of Atlas — map companies, investors and funding across sports tech & venture, all in one shared view.',
		points: ['Browse 1,500+ sports tech companies', 'Filter by category, stage and geography', 'See the whole ecosystem in one view'],
	},
	{
		key: 'raise', label: 'RAISE', colour: '#4580ec', accent: '#1c55be',
		eyebrow: 'Atlas Raise · The Workspace',
		sub: 'Run your raise',
		desc: 'Everything a founder needs to run the raise — investor targeting, warm-intro paths and outreach tracking in one workspace.',
		points: ['Match with investors active in your category', 'Track outreach, intros and momentum', 'Sharpen the story with live market data'],
	},
	{
		key: 'scout', label: 'SCOUT', colour: '#1cc3a4', accent: '#338b6e',
		eyebrow: 'Atlas Scout · The Edge',
		sub: 'Find your next deal',
		desc: 'Surface the companies that match your thesis before anyone else, and follow their momentum as it happens.',
		points: ['Surface companies matching your thesis', 'Monitor rounds, hiring and momentum', 'Build and share curated shortlists'],
	},
];

export function HowToJoin() {
	const [active, setActive] = useState<Key>('explore');
	const activeIndex = TIERS.findIndex((t) => t.key === active);
	const current = TIERS[activeIndex];

	return (
		<section className="lp-cream lp-howjoin" id="how-to-join">
			<div className="lp-inner lp-howjoin-grid">
				<div className="lp-howjoin-intro">
					<div className="lp-howjoin-eyebrow">
						<span>{current.eyebrow}</span>
						<i />
					</div>

					<h2 className="lp-display lp-howjoin-title">The smart way<br />to raise capital</h2>
					<p className="lp-howjoin-desc">{current.desc}</p>

					<div className="lp-switcher">
						{TIERS.map((t) => (
							<button
								key={t.key}
								className={`lp-switch-tag ${active === t.key ? 'active' : ''}`}
								onClick={() => setActive(t.key)}
							>
								<span className="dot" style={{ background: t.colour }} />{t.label}
							</button>
						))}
					</div>

					<div className="lp-howjoin-rule" />
				</div>

				<div className="lp-stack">
					{TIERS.map((t, i) => {
						const open = active === t.key;
						// The deck recedes from whichever tier is open rather than from the
						// top of the DOM: nearer the open card means nearer the front. With
						// the old fixed order, opening SCOUT still left EXPLORE painting
						// over RAISE, so the stack did not read as one deck. data-pos tells
						// the CSS which edge of the card is the hidden one.
						const pos = i < activeIndex ? 'above' : i > activeIndex ? 'below' : 'open';
						return (
							<button
								key={t.key}
								type="button"
								data-pos={pos}
								className={`lp-tier ${open ? 'lp-tier--open' : ''}`}
								style={
									{
										'--tier-accent': t.accent,
										zIndex: 10 - Math.abs(i - activeIndex),
									} as React.CSSProperties
								}
								onClick={() => setActive(t.key)}
								aria-expanded={open}
							>
								<span className="lp-tier-brand">
									<img src="/landing/atlas-wordmark-white.svg" alt="Atlas" />
									<em style={{ color: t.colour }}>{t.label}</em>
								</span>

								{open && (
									<span className="lp-tier-body">
										<span className="lp-tier-sub">{t.sub}</span>
										<span className="lp-points">
											{t.points.map((p) => (
												<span className="lp-point" key={p}>
													<span className="lp-point-ico"><Check size={13} strokeWidth={3} /></span>
													{p}
												</span>
											))}
										</span>
									</span>
								)}
							</button>
						);
					})}
				</div>
			</div>
		</section>
	);
}
