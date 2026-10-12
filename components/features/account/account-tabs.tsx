'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cx } from '@/components/atlas';
import { getUserType, useUserProfile } from '@/hooks/use-user-profile';
import { hrefOf } from '@/lib/routes';
import './account-tabs.css';

/**
 * The account area's tab strip.
 *
 * Thesis Settings and Subscription used to be nav items pinned to the foot of
 * the sidebar. They are settings rather than places, so they moved here —
 * which means the rail's footer can be the account itself, and the three
 * screens read as one surface instead of three unrelated destinations.
 *
 * Tabs are links to the existing routes rather than panels in one page: all
 * three were already standalone routes, deep-linked from billing redirects,
 * the tier gate and the chat agent, and collapsing them would have broken
 * every one of those.
 */
interface Tab { id: string; label: string }

export function AccountTabs() {
	const { data: profile } = useUserProfile();
	const tier = getUserType(profile);
	const pathname = usePathname();

	const tabs: Tab[] = [{ id: 'account', label: 'Account' }];
	// The thesis tab is whichever of the two a product actually has: Raise
	// configures a raise, Scout an investment thesis. Explore has neither.
	if (tier === 'raise') tabs.push({ id: 'raise-settings', label: 'Raise settings' });
	if (tier === 'scout') tabs.push({ id: 'thesis', label: 'Thesis settings' });
	// Explore has no subscription to manage — it is the free tier, and its
	// upgrade surface is the product-access card on the Account tab.
	if (tier !== 'explore') tabs.push({ id: 'billing', label: 'Subscription' });

	if (tabs.length === 1) return null;

	return (
		<nav className="atlas-acct-tabs" aria-label="Account sections">
			{tabs.map((t) => {
				const href = hrefOf(t.id);
				const active = pathname === href;
				return (
					<Link
						key={t.id}
						href={href}
						className={cx('atlas-acct-tab', active && 'is-active')}
						aria-current={active ? 'page' : undefined}
					>
						{t.label}
					</Link>
				);
			})}
		</nav>
	);
}
