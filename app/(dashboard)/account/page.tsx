'use client';

import { AccountSettings } from '@/components/features/account/account-settings';
import { ProductAccess } from '@/components/explore/product-access';
import { getUserType, useUserProfile } from '@/hooks/use-user-profile';
import type { Tier } from '@/lib/access';

/**
 * Account — profile, password, notification preferences.
 *
 * One page for all three products. Only two things differ now: the sub-heading
 * and Explore's product-access card, which is its upgrade surface.
 *
 * This file used to carry a per-tier table of notification options — "Watchlist
 * signals", "New Deal Flow that fits your thesis", "Weekly raise recap". None
 * of them existed: there is no column behind any of those keys and no sender
 * consults them. The real preferences are eight account-level flags on
 * `profiles`, the same for every tier, so they belong in the component rather
 * than in a tier table here.
 */
const SUB: Record<Tier, string | undefined> = {
	explore: 'Your profile, preferences and product access.',
	raise: undefined,
	scout: 'Your profile and notification preferences.',
};

export default function Page() {
	const { data: profile } = useUserProfile();
	const tier = getUserType(profile);
	// Explore gets the upgrade card. API keys are hidden for now — the developer
	// API isn't being launched yet, so paid tiers get no extra card (the backend
	// and `ApiKeysCard` stay in place for when it ships).
	return <AccountSettings sub={SUB[tier]} extra={tier === 'explore' ? <ProductAccess /> : undefined} />;
}
