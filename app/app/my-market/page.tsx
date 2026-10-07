'use client';

import { Screen, SectionHeader } from '@/components/atlas';
import { MyMarket } from '@/components/raise/my-market';

/** Intelligence → My Market: the founder's own TAM/SAM sizing and competitors. */
export default function Page() {
	return (
		<Screen>
			<SectionHeader />
			<MyMarket />
		</Screen>
	);
}
