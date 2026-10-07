'use client';

import { Screen, SectionHeader } from '@/components/atlas';
import { AllInvestors } from '@/components/raise/investors';

/** Raise → Investors: the investor database (search, filters, add to watchlist). Recommendations live under Discover. */
export default function RaiseInvestorsPage() {
	return (
		<Screen>
			<SectionHeader />
			<AllInvestors />
		</Screen>
	);
}
