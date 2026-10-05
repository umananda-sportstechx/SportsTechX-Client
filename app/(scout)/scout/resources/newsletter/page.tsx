'use client';

import { Screen } from '@/components/atlas';
import { ScoutSectionHeader } from '@/components/scout/scout-section-header';
import { NewsletterArchive } from '@/components/features/resources/newsletter-archive';

/** Resources → Newsletter: latest edition + archive (Backend Not Connected, sample data). */
export default function Page() {
	return (
		<Screen>
			<ScoutSectionHeader />
			<NewsletterArchive />
		</Screen>
	);
}
