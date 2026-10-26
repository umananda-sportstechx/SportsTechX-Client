'use client';

import { Screen, SectionHeader } from '@/components/atlas';
import { MarketCompanies } from '@/components/features/market/market-companies';
import { companyHref } from '@/lib/routes';
import { useDeepLinkKey } from '@/hooks/use-url-state';

/** Discover → Companies: the sports-tech company database (live). */
export default function Page() {
	// Remount on a genuine deep link (?q= / ?sector=) so the filters pick it up —
	// but not when the list synced its own search/filters into the URL, which
	// remounted the search box on every keystroke and dropped its focus.
	const key = useDeepLinkKey(['company']); // the drawer param never changes the list
	return (
		<Screen>
			<SectionHeader />
			<MarketCompanies key={key} companyHref={companyHref} />
		</Screen>
	);
}
