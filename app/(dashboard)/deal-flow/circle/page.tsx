'use client';

import { Screen, SectionHeader } from '@/components/atlas';
import { DealFlow } from '@/components/scout/deal-flow';

/** Deal Flow → From the Circle. */
export default function Page() {
	return (
		<Screen>
			<SectionHeader />
			<DealFlow tab="circle" />
		</Screen>
	);
}
