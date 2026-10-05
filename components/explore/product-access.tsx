import Link from 'next/link';
import { Card } from '@/components/atlas';
import { LANDING_RAISE, LANDING_SCOUT } from './shell-config';

/** Account → Product access (Claude Design): Explore active; Raise / Scout link to the landing page. */
const PRODUCTS = [
	{ name: 'Atlas Explore', body: 'Understand and explore the sports-tech market.', active: true, href: '', cta: '' },
	{ name: 'Atlas Raise', body: 'Improve your pitch, find investors and manage your raise.', active: false, href: LANDING_RAISE, cta: 'Explore Atlas Raise' },
	{ name: 'Atlas Scout', body: 'Discover, research and evaluate relevant companies.', active: false, href: LANDING_SCOUT, cta: 'Explore Atlas Scout' },
];

export function ProductAccess() {
	return (
		<Card>
			<div className="explore-access__title">Product access</div>
			{PRODUCTS.map((p) => (
				<div key={p.name} className="explore-access__row">
					<div><div className="explore-access__name">{p.name}</div><div className="explore-muted">{p.body}</div></div>
					{p.active ? <span className="atlas-badge atlas-badge--ok">Active</span> : <Link href={p.href} className="atlas-btn atlas-btn--outline atlas-btn--sm">{p.cta}</Link>}
				</div>
			))}
		</Card>
	);
}
