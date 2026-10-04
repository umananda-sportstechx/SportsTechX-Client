'use client';

import { Screen } from '@/components/atlas';
import { RaiseSectionHeader } from '@/components/raise/raise-section-header';
import { MarketCompanies } from '@/components/features/market/market-companies';

/** Discover → Companies: the sports-tech company database (search, filters, detail drawer). */
export default function Page() {
	return (
		<Screen>
			<RaiseSectionHeader />
			<MarketCompanies companyHref={(s) => `/raise/discover/companies/${encodeURIComponent(s)}`} />
		</Screen>
	);
}
