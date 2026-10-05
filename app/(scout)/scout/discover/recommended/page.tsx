'use client';

import { Screen } from '@/components/atlas';
import { ScoutSectionHeader } from '@/components/scout/scout-section-header';
import { Recommended } from '@/components/scout/recommended';

/** Discover → Recommended: companies matched to the investor thesis (Backend Not Connected). */
export default function Page() {
	return (
		<Screen>
			<ScoutSectionHeader />
			<Recommended />
		</Screen>
	);
}
