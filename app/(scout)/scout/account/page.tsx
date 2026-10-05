'use client';

import { AccountSettings } from '@/components/features/account/account-settings';

const SCOUT_NOTIFICATIONS = [
	{ key: 'signals', label: 'Watchlist signals', on: true },
	{ key: 'dealflow', label: 'New Deal Flow that fits your thesis', on: true },
	{ key: 'roundup', label: 'Monthly market roundup', on: true },
	{ key: 'product', label: 'Product updates', on: false },
];

/** Atlas Scout — Account (shared AccountSettings with Scout notifications). */
export default function ScoutAccountPage() {
	return <AccountSettings notifications={SCOUT_NOTIFICATIONS} sub="Your profile and notification preferences." />;
}
