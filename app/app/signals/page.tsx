'use client';

import { Screen, SectionHeader } from '@/components/atlas';
import { Signals } from '@/components/features/signals/signals';
import { hrefOf } from '@/lib/routes';

/** Discover → Signals: company activity worth watching, from GET /api/signals. */
export default function Page() {
	return (
		<Screen>
			<SectionHeader />
			<Signals companiesHref={hrefOf('companies')} />
		</Screen>
	);
}
