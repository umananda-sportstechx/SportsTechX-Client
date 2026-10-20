'use client';

import { Screen, SectionHeader } from '@/components/atlas';
import { MaDeals } from '@/components/features/market/ma-deals';

/** Intelligence → M&A: acquisitions, acquirer ↔ acquiree, newest first. */
export default function Page() {
	return (
		<Screen>
			<SectionHeader />
			<MaDeals />
		</Screen>
	);
}
