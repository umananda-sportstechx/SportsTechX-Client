'use client';

import { Screen } from '@/components/atlas';
import { RaiseSectionHeader } from '@/components/raise/raise-section-header';
import { ReportsLibrary } from '@/components/features/resources/reports-library';

/** Resources → Reports: latest report + library (Backend Not Connected, sample data). */
export default function Page() {
	return (
		<Screen>
			<RaiseSectionHeader />
			<ReportsLibrary />
		</Screen>
	);
}
