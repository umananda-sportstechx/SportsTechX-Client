'use client';

import { Screen } from '@/components/atlas';
import { RaiseSectionHeader } from '@/components/raise/raise-section-header';
import { Signals } from '@/components/features/signals/signals';

/** Discover → Signals: company activity worth watching, from GET /api/signals. */
export default function Page() {
	return (
		<Screen>
			<RaiseSectionHeader />
			<Signals companiesHref="/raise/discover/companies" />
		</Screen>
	);
}
