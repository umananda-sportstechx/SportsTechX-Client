'use client';

import Link from 'next/link';
import { hrefOf } from '@/lib/routes';
import { WalkthroughButton } from '@/components/features/walkthrough/walkthrough-button';

/**
 * Sidebar upgrade cards ("Atlas Raise · Upgrade", "Atlas Scout · Upgrade").
 *
 * Both now open the in-app plans page. They used to point at the public
 * landing page's `#how-to-join` anchor, which threw a signed-in user out of the
 * product to a marketing section that never showed them the plan they already
 * had.
 *
 * The design labels Scout "Request", because it was meant to be gated behind a
 * conversation. Decided with the user that both tiers self-serve through
 * Stripe, so "Request" would promise a conversation that never happens — the
 * label follows the behaviour rather than the mockup.
 *
 * Each card also offers "Walk the pitch →", the guided practice run of that
 * product (lib/sandbox). It sits outside the card's link — a button can't nest
 * inside an anchor — and hides itself for anyone who isn't a real Explore user.
 */
const CARDS = [
	{ name: 'Atlas Raise', action: 'Upgrade', body: 'Investor targeting for founders raising capital.', tone: 'raise' },
	{ name: 'Atlas Scout', action: 'Upgrade', body: 'Deal flow and screening for investors.', tone: 'scout' },
] as const;

export function UpgradeCards() {
	const href = hrefOf('plans');
	return (
		<>
			{CARDS.map((c) => (
				<div key={c.name} className={`explore-upgrade explore-upgrade--${c.tone}`}>
					<Link href={href} className="explore-upgrade__link">
						<span className="explore-upgrade__top"><span className="explore-upgrade__name">{c.name}</span><span className="explore-upgrade__action">{c.action}</span></span>
						<span className="explore-upgrade__body">{c.body}</span>
					</Link>
					<WalkthroughButton product={c.tone} source="sidebar" className="explore-upgrade__walk" />
				</div>
			))}
		</>
	);
}
