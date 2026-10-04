'use client';

import { useParams } from 'next/navigation';
import { Screen } from '@/components/atlas';
import { RaiseSectionHeader } from '@/components/raise/raise-section-header';
import { FrameworkCategory } from '@/components/features/framework/framework-category';

/** Resources → Framework → one category (sub-categories, technologies, use cases, example companies). */
export default function RaiseFrameworkCategoryPage() {
	const slug = String(useParams().slug);
	return (
		<Screen>
			<RaiseSectionHeader />
			<FrameworkCategory
				slug={slug}
				backHref="/raise/resources/framework"
				exploreHref={(pillar, category) => `/raise/discover/companies?sector=${encodeURIComponent(pillar)}&sub=${encodeURIComponent(category)}`}
			/>
		</Screen>
	);
}
