'use client';

import { useSearchParams } from 'next/navigation';
import { Screen } from '@/components/atlas';
import { ScoutSectionHeader } from '@/components/scout/scout-section-header';
import { MarketCompanies } from '@/components/features/market/market-companies';
import { scoutCompanyHref } from '@/components/scout/shell-config';

/** Discover → Companies: the sports-tech company database (live). */
export default function Page() {
	// Remount on a new deep link (?q= / ?sector=) so the filters pick it up.
	const key = useSearchParams().toString();
	return (
		<Screen>
			<ScoutSectionHeader />
			<MarketCompanies key={key} companyHref={scoutCompanyHref} />
		</Screen>
	);
}
