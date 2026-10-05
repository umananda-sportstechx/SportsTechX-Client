'use client';

import { Screen } from '@/components/atlas';
import { ExploreSectionHeader } from '@/components/explore/explore-section-header';
import { MarketAnalysis } from '@/components/features/market/market-analysis';

/** Market → Analysis: funding / M&A analytics (live). */
export default function Page() {
	return (
		<Screen>
			<ExploreSectionHeader />
			<MarketAnalysis />
		</Screen>
	);
}
