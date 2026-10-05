'use client';

import { useSearchParams } from 'next/navigation';
import { Screen } from '@/components/atlas';
import { ExploreSectionHeader } from '@/components/explore/explore-section-header';
import { MarketCompanies } from '@/components/features/market/market-companies';
import { exploreCompanyHref } from '@/components/explore/shell-config';

/** Market → Companies: the sports-tech company database (live). Remounts on a new ?q= deep link. */
export default function Page() {
	const key = useSearchParams().toString();
	return (
		<Screen>
			<ExploreSectionHeader />
			<MarketCompanies key={key} companyHref={exploreCompanyHref} />
		</Screen>
	);
}
