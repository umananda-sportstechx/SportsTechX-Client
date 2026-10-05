'use client';

import { Screen } from '@/components/atlas';
import { ScoutSectionHeader } from '@/components/scout/scout-section-header';
import { DealFlow } from '@/components/scout/deal-flow';

/** Deal Flow → Featured (Backend Not Connected). */
export default function Page() {
	return (
		<Screen>
			<ScoutSectionHeader />
			<DealFlow kind="featured" />
		</Screen>
	);
}
