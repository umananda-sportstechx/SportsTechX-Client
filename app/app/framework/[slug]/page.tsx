'use client';

import { useParams } from 'next/navigation';
import { Screen, SectionHeader } from '@/components/atlas';
import { FrameworkCategory } from '@/components/features/framework/framework-category';
import { hrefOf } from '@/lib/routes';

/** Resources → Framework → one category (sub-categories, technologies, use cases, example companies). */
export default function Page() {
	const slug = String(useParams().slug);
	return (
		<Screen>
			<SectionHeader />
			<FrameworkCategory
				slug={slug}
				backHref={hrefOf('framework')}
				exploreHref={(pillar, category) =>
					`${hrefOf('companies')}?sector=${encodeURIComponent(pillar)}&sub=${encodeURIComponent(category)}`}
			/>
		</Screen>
	);
}
