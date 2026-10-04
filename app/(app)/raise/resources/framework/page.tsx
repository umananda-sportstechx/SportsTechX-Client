'use client';

import { Screen } from '@/components/atlas';
import { RaiseSectionHeader } from '@/components/raise/raise-section-header';
import { FrameworkOverview } from '@/components/features/framework/framework-overview';

/** Resources → Framework: the SportsTechX framework, pillar by pillar. */
export default function RaiseFrameworkPage() {
	return (
		<Screen>
			<RaiseSectionHeader />
			<FrameworkOverview categoryHref={(slug) => `/raise/resources/framework/${slug}`} />
		</Screen>
	);
}
