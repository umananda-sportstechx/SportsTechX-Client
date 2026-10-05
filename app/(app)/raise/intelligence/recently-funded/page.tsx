'use client';

import { Screen } from '@/components/atlas';
import { RaiseSectionHeader } from '@/components/raise/raise-section-header';
import { RecentlyFunded } from '@/components/features/funding/recently-funded';

/** Intelligence → Recently Funded: disclosed funding rounds, newest first (live, /api/deals). */
export default function Page() {
	return (
		<Screen>
			<RaiseSectionHeader />
			<RecentlyFunded companyHref={(s) => `/raise/discover/companies/${encodeURIComponent(s)}`} />
		</Screen>
	);
}
