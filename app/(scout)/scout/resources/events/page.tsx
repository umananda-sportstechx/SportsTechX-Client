'use client';

import { Screen } from '@/components/atlas';
import { ScoutSectionHeader } from '@/components/scout/scout-section-header';
import { EventsList } from '@/components/features/ecosystem/ecosystem';

/** Resources → Events: sports-tech events (live). */
export default function Page() {
	return (
		<Screen>
			<ScoutSectionHeader />
			<EventsList />
		</Screen>
	);
}
