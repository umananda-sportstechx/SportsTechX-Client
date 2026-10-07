'use client';

import { Screen, SectionHeader } from '@/components/atlas';
import { MarketAnalysis } from '@/components/features/market/market-analysis';

/** Intelligence → Analytics: funding, M&A and sector charts for the market. */
export default function Page() {
	return (
		<Screen>
			<SectionHeader />
			<MarketAnalysis />
		</Screen>
	);
}
