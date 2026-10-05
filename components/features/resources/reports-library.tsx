'use client';

import { ResourceLibrary } from './resource-library';
import { SAMPLE_REPORTS } from './sample-resources';

/** Reports — latest report + library. Backend Not Connected (sample reports). */
export function ReportsLibrary() {
	return <ResourceLibrary items={SAMPLE_REPORTS} featuredLabel="Latest report" libraryTitle="Reports library" noun="report" />;
}
