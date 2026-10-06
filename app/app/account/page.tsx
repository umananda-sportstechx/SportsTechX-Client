'use client';

import { AccountSettings, RAISE_NOTIFICATIONS } from '@/components/features/account/account-settings';
import { ProductAccess } from '@/components/explore/product-access';
import { getUserType, useUserProfile } from '@/hooks/use-user-profile';
import type { Tier } from '@/lib/access';

/**
 * Account — profile, password, notification preferences.
 *
 * One page for all three products. What differs is which notifications a tier
 * can even receive (Scout has deal flow, Explore has the newsletter) plus
 * Explore's product-access card, which is its upgrade surface. These lived as
 * three page files whose only content was this table.
 */
const BY_TIER: Record<Tier, { notifications?: typeof RAISE_NOTIFICATIONS; sub?: string }> = {
	explore: {
		notifications: [
			{ key: 'newsletter', label: 'Fortnightly SportsTechX newsletter', on: true },
			{ key: 'reports', label: 'New reports and monthly roundups', on: true },
			{ key: 'product', label: 'Product updates', on: false },
		],
		sub: 'Your profile, preferences and product access.',
	},
	// Raise is the component's own default, and had no sub-heading.
	raise: {},
	scout: {
		notifications: [
			{ key: 'signals', label: 'Watchlist signals', on: true },
			{ key: 'dealflow', label: 'New Deal Flow that fits your thesis', on: true },
			{ key: 'roundup', label: 'Monthly market roundup', on: true },
			{ key: 'product', label: 'Product updates', on: false },
		],
		sub: 'Your profile and notification preferences.',
	},
};

export default function Page() {
	const { data: profile } = useUserProfile();
	const tier = getUserType(profile);
	const { notifications, sub } = BY_TIER[tier];
	return <AccountSettings notifications={notifications} sub={sub} extra={tier === 'explore' ? <ProductAccess /> : undefined} />;
}
