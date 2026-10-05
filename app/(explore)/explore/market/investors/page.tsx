'use client';

import { Screen } from '@/components/atlas';
import { ExploreSectionHeader } from '@/components/explore/explore-section-header';
import { InvestorsUpsell } from '@/components/explore/investors-upsell';

/** Market → Investors: included with Atlas Raise (upsell to the landing page). */
export default function Page() {
	return (
		<Screen>
			<ExploreSectionHeader />
			<InvestorsUpsell />
		</Screen>
	);
}
