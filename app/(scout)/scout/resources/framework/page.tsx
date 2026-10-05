'use client';

import { Screen } from '@/components/atlas';
import { ScoutSectionHeader } from '@/components/scout/scout-section-header';
import { FrameworkOverview } from '@/components/features/framework/framework-overview';

/** Resources → Framework: the SportsTechX framework, pillar by pillar. */
export default function Page() {
	return (
		<Screen>
			<ScoutSectionHeader />
			<FrameworkOverview categoryHref={(slug) => `/scout/resources/framework/${slug}`} />
		</Screen>
	);
}
