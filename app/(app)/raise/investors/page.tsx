'use client';

import { Screen } from '@/components/atlas';
import { RaiseSectionHeader } from '@/components/raise/raise-section-header';
import { AllInvestors } from '@/components/raise/investors';

/** Raise → Investors: the investor database (search, filters, add to watchlist). Recommendations live under Discover. */
export default function RaiseInvestorsPage() {
	return (
		<Screen>
			<RaiseSectionHeader />
			<AllInvestors />
		</Screen>
	);
}
