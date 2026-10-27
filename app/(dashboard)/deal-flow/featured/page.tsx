'use client';

import { Screen, SectionHeader } from '@/components/atlas';
import { DealFlow } from '@/components/scout/deal-flow';

/** Deal Flow → Featured. */
export default function Page() {
	return (
		<Screen>
			<SectionHeader />
			<DealFlow tab="featured" />
		</Screen>
	);
}
