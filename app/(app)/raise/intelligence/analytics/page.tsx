'use client';

import { Screen } from '@/components/atlas';
import { RaiseSectionHeader } from '@/components/raise/raise-section-header';
import { MarketAnalysis } from '@/components/features/market/market-analysis';

/** Intelligence → Analytics: funding / M&A analytics over time, sectors, breakdowns. */
export default function Page() {
	return (
		<Screen>
			<RaiseSectionHeader />
			<MarketAnalysis />
		</Screen>
	);
}
