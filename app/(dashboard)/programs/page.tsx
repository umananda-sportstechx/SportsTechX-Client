'use client';

import { Screen, SectionHeader } from '@/components/atlas';
import { ProgramsList } from '@/components/features/ecosystem/ecosystem';

/** Atlas Raise — Programs: accelerators, incubators and other founder programs (/api/ecosystem-entities, entity_type=program). */
export default function RaiseProgramsPage() {
	return (
		<Screen>
			<SectionHeader />
			<ProgramsList />
		</Screen>
	);
}
