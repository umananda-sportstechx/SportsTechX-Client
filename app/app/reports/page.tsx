'use client';

import { Screen, SectionHeader } from '@/components/atlas';
import { ReportsLibrary } from '@/components/features/resources/reports-library';

/** Resources → Reports: the latest SportsTechX report plus the searchable library. */
export default function Page() {
	return (
		<Screen>
			<SectionHeader />
			<ReportsLibrary />
		</Screen>
	);
}
