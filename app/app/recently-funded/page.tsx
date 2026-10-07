'use client';

import { Screen, SectionHeader } from '@/components/atlas';
import { RecentlyFunded } from '@/components/features/funding/recently-funded';
import { companyHref } from '@/lib/routes';

/** Intelligence → Recently Funded: disclosed rounds, newest first. */
export default function Page() {
	return (
		<Screen>
			<SectionHeader />
			<RecentlyFunded companyHref={companyHref} />
		</Screen>
	);
}
