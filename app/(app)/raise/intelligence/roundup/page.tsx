'use client';

import { Screen } from '@/components/atlas';
import { RaiseSectionHeader } from '@/components/raise/raise-section-header';
import { MarketRoundup } from '@/components/features/market/market-roundup';

/** Intelligence → Monthly Roundup: the month's deals, news and aggregates. */
export default function Page() {
	return (
		<Screen>
			<RaiseSectionHeader />
			<MarketRoundup />
		</Screen>
	);
}
