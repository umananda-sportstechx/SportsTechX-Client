'use client';

import { Screen } from '@/components/atlas';
import { ExploreSectionHeader } from '@/components/explore/explore-section-header';
import { NewsletterArchive } from '@/components/features/resources/newsletter-archive';

/** Intelligence → Newsletter: latest edition + archive (Backend Not Connected, sample data). */
export default function Page() {
	return (
		<Screen>
			<ExploreSectionHeader />
			<NewsletterArchive />
		</Screen>
	);
}
