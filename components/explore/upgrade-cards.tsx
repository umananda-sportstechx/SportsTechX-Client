import Link from 'next/link';
import { LANDING_RAISE, LANDING_SCOUT } from './shell-config';

/**
 * Sidebar upgrade cards (Claude Design: "Atlas Raise · Upgrade", "Atlas Scout ·
 * Request"). For now they link to the public landing page's product section.
 */
const CARDS = [
	{ name: 'Atlas Raise', action: 'Upgrade', body: 'Investor targeting for founders raising capital.', href: LANDING_RAISE, tone: 'raise' },
	{ name: 'Atlas Scout', action: 'Request', body: 'Deal flow and screening for investors.', href: LANDING_SCOUT, tone: 'scout' },
] as const;

export function UpgradeCards() {
	return (
		<>
			{CARDS.map((c) => (
				<Link key={c.name} href={c.href} className={`explore-upgrade explore-upgrade--${c.tone}`}>
					<span className="explore-upgrade__top"><span className="explore-upgrade__name">{c.name}</span><span className="explore-upgrade__action">{c.action}</span></span>
					<span className="explore-upgrade__body">{c.body}</span>
				</Link>
			))}
		</>
	);
}
