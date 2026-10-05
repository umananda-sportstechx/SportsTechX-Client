'use client';

import { Screen } from '@/components/atlas';
import { ExploreSectionHeader } from '@/components/explore/explore-section-header';
import { EventsList } from '@/components/features/ecosystem/ecosystem';

/** Market → Events: sports-tech events (live). */
export default function Page() {
	return (
		<Screen>
			<ExploreSectionHeader />
			<EventsList />
		</Screen>
	);
}
