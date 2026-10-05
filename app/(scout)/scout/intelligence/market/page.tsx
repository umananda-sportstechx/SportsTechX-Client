'use client';

import { Screen } from '@/components/atlas';
import { ScoutSectionHeader } from '@/components/scout/scout-section-header';
import { MarketAnalysis } from '@/components/features/market/market-analysis';

/** Intelligence → Market: funding / M&A analytics (live). */
export default function Page() {
	return (
		<Screen>
			<ScoutSectionHeader />
			<MarketAnalysis />
		</Screen>
	);
}
