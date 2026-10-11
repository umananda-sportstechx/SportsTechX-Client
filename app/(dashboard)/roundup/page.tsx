'use client';

import { Screen, SectionHeader } from '@/components/atlas';
import { MarketRoundup } from '@/components/features/market/market-roundup';

/** Intelligence → Monthly Roundup: the month's funding, deals and news. */
export default function Page() {
	return (
		<Screen>
			<SectionHeader />
			<MarketRoundup />
		</Screen>
	);
}
