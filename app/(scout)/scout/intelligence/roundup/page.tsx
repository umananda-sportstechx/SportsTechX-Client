'use client';

import { Screen } from '@/components/atlas';
import { ScoutSectionHeader } from '@/components/scout/scout-section-header';
import { MarketRoundup } from '@/components/features/market/market-roundup';

/** Intelligence → Monthly Roundup: the month's deals, news and aggregates (live). */
export default function Page() {
	return (
		<Screen>
			<ScoutSectionHeader />
			<MarketRoundup />
		</Screen>
	);
}
