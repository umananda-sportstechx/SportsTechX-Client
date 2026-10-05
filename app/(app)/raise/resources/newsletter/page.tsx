'use client';

import { Screen } from '@/components/atlas';
import { RaiseSectionHeader } from '@/components/raise/raise-section-header';
import { NewsletterArchive } from '@/components/features/resources/newsletter-archive';

/** Resources → Newsletter: latest edition + archive (Backend Not Connected, sample data). */
export default function Page() {
	return (
		<Screen>
			<RaiseSectionHeader />
			<NewsletterArchive />
		</Screen>
	);
}
