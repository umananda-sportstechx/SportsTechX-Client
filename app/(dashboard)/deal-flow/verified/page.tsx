'use client';

import { Screen, SectionHeader } from '@/components/atlas';
import { DealFlow } from '@/components/scout/deal-flow';

/** Deal Flow → Verified Raises. */
export default function Page() {
	return (
		<Screen>
			<SectionHeader />
			<DealFlow tab="verified" />
		</Screen>
	);
}
