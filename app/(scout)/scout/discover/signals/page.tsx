'use client';

import { Screen } from '@/components/atlas';
import { ScoutSectionHeader } from '@/components/scout/scout-section-header';
import { Signals } from '@/components/features/signals/signals';

/** Discover → Signals: company activity worth watching, from GET /api/signals. */
export default function Page() {
	return (
		<Screen>
			<ScoutSectionHeader />
			<Signals companiesHref="/scout/discover/companies" />
		</Screen>
	);
}
