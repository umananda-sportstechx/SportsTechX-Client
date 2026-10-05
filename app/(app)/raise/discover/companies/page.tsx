'use client';

import { useSearchParams } from 'next/navigation';
import { Screen } from '@/components/atlas';
import { RaiseSectionHeader } from '@/components/raise/raise-section-header';
import { MarketCompanies } from '@/components/features/market/market-companies';

/** Discover → Companies: the sports-tech company database (search, filters, detail drawer). */
export default function Page() {
	// Remount on a new deep link (?q= from Signals, ?sector= from the framework).
	const key = useSearchParams().toString();
	return (
		<Screen>
			<RaiseSectionHeader />
			<MarketCompanies key={key} companyHref={(s) => `/raise/discover/companies/${encodeURIComponent(s)}`} />
		</Screen>
	);
}
