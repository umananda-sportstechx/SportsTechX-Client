'use client';

import { Screen } from '@/components/atlas';
import { RaiseSectionHeader } from '@/components/raise/raise-section-header';
import { ProgramsList } from '@/components/features/ecosystem/ecosystem';

/** Atlas Raise — Programs: accelerators, incubators and other founder programs (/api/ecosystem-entities, entity_type=program). */
export default function RaiseProgramsPage() {
	return (
		<Screen>
			<RaiseSectionHeader />
			<ProgramsList />
		</Screen>
	);
}
