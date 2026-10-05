'use client';

import { Screen } from '@/components/atlas';
import { ExploreSectionHeader } from '@/components/explore/explore-section-header';
import { FrameworkOverview } from '@/components/features/framework/framework-overview';

/** Intelligence → Framework: the SportsTechX framework, pillar by pillar. */
export default function Page() {
	return (
		<Screen>
			<ExploreSectionHeader />
			<FrameworkOverview categoryHref={(slug) => `/explore/intelligence/framework/${slug}`} />
		</Screen>
	);
}
