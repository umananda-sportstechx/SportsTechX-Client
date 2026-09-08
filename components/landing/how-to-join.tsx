'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';

type Key = 'explore' | 'raise' | 'scout';
const TIERS: { key: Key; label: string; sub: string; points: string[] }[] = [
	{ key: 'explore', label: 'EXPLORE', sub: 'Map the landscape', points: ['Browse 1,500+ sports tech companies', 'Filter by category, stage and geography', 'See the whole ecosystem in one view'] },
	{ key: 'raise', label: 'RAISE', sub: 'Run your raise', points: ['Match with active sports-tech investors', 'Track outreach and warm intros', 'Sharpen your story with market data'] },
	{ key: 'scout', label: 'SCOUT', sub: 'Find your next deal', points: ['Surface companies matching your thesis', 'Monitor rounds and momentum', 'Build and share curated shortlists'] },
];

export function HowToJoin() {
	const [active, setActive] = useState<Key>('explore');
	return (
		<section className="lp-cream lp-howjoin" id="how-to-join">
			<div className="lp-inner lp-howjoin-grid">
				<div className="lp-howjoin-intro">
					<span className="lp-eyebrow lp-eyebrow--nolines">Atlas Explore · The Base</span>
					<h2 className="lp-display">The smart way to raise capital</h2>
					<p>The foundational layer of Atlas — map companies, investors and funding across sports tech &amp; venture, all in one shared view.</p>
					<div className="lp-switcher">
						{TIERS.map((t) => (
							<button key={t.key} className={`lp-switch-tag ${active === t.key ? 'active' : ''}`} onClick={() => setActive(t.key)}>
								<span className="dot" />{t.label}
							</button>
						))}
					</div>
				</div>

				<div className="lp-stack">
					{TIERS.map((t) => (
						active === t.key ? (
							<div className="lp-stack-card lp-stack-card--active" key={t.key}>
								<div className="lp-stack-head">{t.label}</div>
								<div className="lp-stack-sub">{t.sub}</div>
								<div className="lp-points">
									{t.points.map((p) => (
										<div className="lp-point" key={p}><span className="lp-point-ico"><Check size={15} /></span>{p}</div>
									))}
								</div>
							</div>
						) : (
							<button className="lp-stack-card" key={t.key} onClick={() => setActive(t.key)} style={{ cursor: 'pointer', width: '100%', textAlign: 'left' }}>
								<div className="lp-collapsed-head">{t.label}</div>
							</button>
						)
					))}
				</div>
			</div>
		</section>
	);
}
