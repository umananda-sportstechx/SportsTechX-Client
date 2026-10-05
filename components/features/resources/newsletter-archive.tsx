'use client';

import { ResourceLibrary } from './resource-library';
import { SAMPLE_EDITIONS } from './sample-resources';

/** Newsletter — latest edition + archive. Backend Not Connected (sample editions). */
export function NewsletterArchive() {
	return <ResourceLibrary items={SAMPLE_EDITIONS} featuredLabel="Latest edition" libraryTitle="Edition archive" noun="edition" />;
}
