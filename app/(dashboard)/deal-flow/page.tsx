'use client';

import { Screen, SectionHeader } from '@/components/atlas';
import { DealFlow } from '@/components/scout/deal-flow';

/** Deal Flow → All: featured, verified and Circle deals. */
export default function Page() {
	return (
		<Screen>
			<SectionHeader />
			<DealFlow />
		</Screen>
	);
}
