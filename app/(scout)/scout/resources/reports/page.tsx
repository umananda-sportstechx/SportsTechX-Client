'use client';

import { Screen } from '@/components/atlas';
import { ScoutSectionHeader } from '@/components/scout/scout-section-header';
import { ReportsLibrary } from '@/components/features/resources/reports-library';

/** Resources → Reports: latest report + library (Backend Not Connected, sample data). */
export default function Page() {
	return (
		<Screen>
			<ScoutSectionHeader />
			<ReportsLibrary />
		</Screen>
	);
}
