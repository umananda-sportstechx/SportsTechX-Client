'use client';

import { Screen, SectionHeader } from '@/components/atlas';
import { NewsletterArchive } from '@/components/features/resources/newsletter-archive';

/** Resources → Newsletter: the latest edition plus the archive. */
export default function Page() {
	return (
		<Screen>
			<SectionHeader />
			<NewsletterArchive />
		</Screen>
	);
}
