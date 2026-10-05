'use client';

import { Screen } from '@/components/atlas';
import { ExploreSectionHeader } from '@/components/explore/explore-section-header';
import { ReportsLibrary } from '@/components/features/resources/reports-library';

/** Intelligence → Reports: latest report + library (Backend Not Connected, sample data). */
export default function Page() {
	return (
		<Screen>
			<ExploreSectionHeader />
			<ReportsLibrary />
		</Screen>
	);
}
