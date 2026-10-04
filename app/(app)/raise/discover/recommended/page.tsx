'use client';

import { Screen } from '@/components/atlas';
import { RaiseSectionHeader } from '@/components/raise/raise-section-header';
import { RecommendedInvestors } from '@/components/raise/investors';

/** Discover → Recommended: investors matched to the founder's raise. */
export default function Page() {
	return (
		<Screen>
			<RaiseSectionHeader />
			<RecommendedInvestors />
		</Screen>
	);
}
