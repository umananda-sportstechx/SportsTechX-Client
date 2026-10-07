'use client';

import { Screen, SectionHeader } from '@/components/atlas';
import { DealFlow } from '@/components/scout/deal-flow';

/** Deal Flow → Featured (Backend Not Connected). */
export default function Page() {
	return (
		<Screen>
			<SectionHeader />
			<DealFlow kind="featured" />
		</Screen>
	);
}
