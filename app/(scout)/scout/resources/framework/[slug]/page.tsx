'use client';

import { useParams } from 'next/navigation';
import { Screen } from '@/components/atlas';
import { ScoutSectionHeader } from '@/components/scout/scout-section-header';
import { FrameworkCategory } from '@/components/features/framework/framework-category';

/** Resources → Framework → one category (sub-categories, technologies, use cases, example companies). */
export default function ScoutFrameworkCategoryPage() {
	const slug = String(useParams().slug);
	return (
		<Screen>
			<ScoutSectionHeader />
			<FrameworkCategory
				slug={slug}
				backHref="/scout/resources/framework"
				exploreHref={(pillar, category) => `/scout/discover/companies?sector=${encodeURIComponent(pillar)}&sub=${encodeURIComponent(category)}`}
			/>
		</Screen>
	);
}
