'use client';

import { Screen, SectionHeader } from '@/components/atlas';
import { FundraisingGuide } from '@/components/raise/fundraising-guide';

/** Atlas Raise → Resources → Fundraising Guide: guides, templates and checklists, Prepare → Connect → Close. */
export default function Page() {
	return (
		<Screen>
			<SectionHeader />
			<FundraisingGuide />
		</Screen>
	);
}
