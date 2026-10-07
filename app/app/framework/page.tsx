'use client';

import { Screen, SectionHeader } from '@/components/atlas';
import { FrameworkOverview } from '@/components/features/framework/framework-overview';
import { hrefOf } from '@/lib/routes';

/** Resources → Framework: the SportsTechX framework, pillar by pillar. */
export default function Page() {
	return (
		<Screen>
			<SectionHeader />
			<FrameworkOverview categoryHref={(slug) => `${hrefOf('framework')}/${slug}`} />
		</Screen>
	);
}
