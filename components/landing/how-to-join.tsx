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
	key: Key; label: string; colour: string; eyebrow: string;
	sub: string; desc: string; points: string[]; grad: string;
}[] = [
	{
		key: 'explore', label: 'EXPLORE', colour: '#f32163',
		eyebrow: 'Atlas Explore · The Base',
		sub: 'Map the landscape',
		desc: 'The foundational layer of Atlas — map companies, investors and funding across sports tech & venture, all in one shared view.',
		points: ['Browse 1,500+ sports tech companies', 'Filter by category, stage and geography', 'See the whole ecosystem in one view'],
		grad: 'radial-gradient(115% 95% at 100% 45%, rgba(243,33,99,0.62) 0%, rgba(243,33,99,0) 62%), linear-gradient(155deg, #1b1520 0%, #0d1017 60%)',
	},
	{
		key: 'raise', label: 'RAISE', colour: '#4d8df5',
		eyebrow: 'Atlas Raise · The Workspace',
		sub: 'Run your raise',
		desc: 'Everything a founder needs to run the raise — investor targeting, warm-intro paths and outreach tracking in one workspace.',
		points: ['Match with investors active in your category', 'Track outreach, intros and momentum', 'Sharpen the story with live market data'],
		grad: 'radial-gradient(105% 95% at 100% 70%, rgba(46,109,224,0.46) 0%, rgba(46,109,224,0) 62%), linear-gradient(155deg, #141a25 0%, #0d1017 60%)',
	},
	{
		key: 'scout', label: 'SCOUT', colour: '#2fbf7a',
		eyebrow: 'Atlas Scout · The Edge',
		sub: 'Find your next deal',
		desc: 'Surface the companies that match your thesis before anyone else, and follow their momentum as it happens.',
		points: ['Surface companies matching your thesis', 'Monitor rounds, hiring and momentum', 'Build and share curated shortlists'],
		grad: 'radial-gradient(105% 95% at 100% 70%, rgba(31,163,106,0.44) 0%, rgba(31,163,106,0) 62%), linear-gradient(155deg, #10201b 0%, #0d1017 60%)',
	},
];

export function HowToJoin() {
	const [active, setActive] = useState<Key>('explore');
	const current = TIERS.find((t) => t.key === active)!;

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
					{TIERS.map((t) => {
						const open = active === t.key;
						return (
							<button
								key={t.key}
								type="button"
								className={`lp-tier ${open ? 'lp-tier--open' : ''}`}
								style={{ background: t.grad }}
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
