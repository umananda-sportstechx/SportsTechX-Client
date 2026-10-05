'use client';

import { Screen } from '@/components/atlas';
import { ScoutSectionHeader } from '@/components/scout/scout-section-header';
import { RecentlyFunded } from '@/components/features/funding/recently-funded';
import { scoutCompanyHref } from '@/components/scout/shell-config';

/** Intelligence → Recently Funded: disclosed funding rounds, newest first (live, /api/deals). */
export default function Page() {
	return (
		<Screen>
			<ScoutSectionHeader />
			<RecentlyFunded companyHref={scoutCompanyHref} />
		</Screen>
	);
}
