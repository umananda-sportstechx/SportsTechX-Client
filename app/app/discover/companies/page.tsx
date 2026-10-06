'use client';

import { useSearchParams } from 'next/navigation';
import { Screen, SectionHeader } from '@/components/atlas';
import { MarketCompanies } from '@/components/features/market/market-companies';
import { companyHref } from '@/lib/routes';

/** Discover → Companies: the sports-tech company database (live). */
export default function Page() {
	// Remount on a new deep link (?q= / ?sector=) so the filters pick it up.
	const key = useSearchParams().toString();
	return (
		<Screen>
			<SectionHeader />
			<MarketCompanies key={key} companyHref={companyHref} />
		</Screen>
	);
}
