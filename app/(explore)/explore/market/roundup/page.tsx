'use client';

import { Screen } from '@/components/atlas';
import { ExploreSectionHeader } from '@/components/explore/explore-section-header';
import { MarketRoundup } from '@/components/features/market/market-roundup';

/** Market → Monthly Roundup (live). */
export default function Page() {
	return (
		<Screen>
			<ExploreSectionHeader />
			<MarketRoundup />
		</Screen>
	);
}
