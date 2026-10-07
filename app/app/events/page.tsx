'use client';

import { Screen, SectionHeader } from '@/components/atlas';
import { EventsList } from '@/components/features/ecosystem/ecosystem';

/** Resources → Events: conferences, demo days and meetups across sports tech. */
export default function Page() {
	return (
		<Screen>
			<SectionHeader />
			<EventsList />
		</Screen>
	);
}
