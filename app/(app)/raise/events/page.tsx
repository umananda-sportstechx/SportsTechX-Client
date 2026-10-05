'use client';

import { Screen } from '@/components/atlas';
import { RaiseSectionHeader } from '@/components/raise/raise-section-header';
import { EventsList } from '@/components/features/ecosystem/ecosystem';

/** Atlas Raise — Events: sports-tech events (/api/ecosystem-entities, entity_type=event). Listed under Resources. */
export default function RaiseEventsPage() {
	return (
		<Screen>
			<RaiseSectionHeader />
			<EventsList />
		</Screen>
	);
}
