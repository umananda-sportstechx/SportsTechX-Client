'use client';

import { Screen } from '@/components/atlas';
import { RaiseSectionHeader } from '@/components/raise/raise-section-header';
import { MyMarket } from '@/components/raise/my-market';

/** Intelligence → My Market: the founder's own TAM/SAM sizing and competitors. */
export default function Page() {
	return (
		<Screen>
			<RaiseSectionHeader />
			<MyMarket />
		</Screen>
	);
}
