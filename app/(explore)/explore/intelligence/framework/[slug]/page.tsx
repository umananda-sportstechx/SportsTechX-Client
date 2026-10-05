'use client';

import { useParams } from 'next/navigation';
import { Screen } from '@/components/atlas';
import { ExploreSectionHeader } from '@/components/explore/explore-section-header';
import { FrameworkCategory } from '@/components/features/framework/framework-category';

/** Intelligence → Framework → one category. */
export default function ExploreFrameworkCategoryPage() {
	return (
		<Screen>
			<ExploreSectionHeader />
			<FrameworkCategory
				slug={String(useParams().slug)}
				backHref="/explore/intelligence/framework"
				exploreHref={(pillar, category) => `/explore/market/companies?sector=${encodeURIComponent(pillar)}&sub=${encodeURIComponent(category)}`}
			/>
		</Screen>
	);
}
