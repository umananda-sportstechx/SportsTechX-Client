'use client';

import { AccountSettings } from '@/components/features/account/account-settings';
import { ProductAccess } from '@/components/explore/product-access';

const EXPLORE_NOTIFICATIONS = [
	{ key: 'newsletter', label: 'Fortnightly SportsTechX newsletter', on: true },
	{ key: 'reports', label: 'New reports and monthly roundups', on: true },
	{ key: 'product', label: 'Product updates', on: false },
];

/** Atlas Explore — Account (shared AccountSettings + Explore's product access). */
export default function ExploreAccountPage() {
	return <AccountSettings notifications={EXPLORE_NOTIFICATIONS} sub="Your profile, preferences and product access." extra={<ProductAccess />} />;
}
