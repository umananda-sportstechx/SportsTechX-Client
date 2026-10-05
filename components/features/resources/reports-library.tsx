'use client';

import { ResourceLibrary } from './resource-library';
import { SAMPLE_REPORTS } from './sample-resources';

/**
 * Reports — latest report + library.
 *
 * Still Backend Not Connected. `GET /api/reports` exists and carries title,
 * date and `has_pro_version` (→ Free/Premium), but the card contract also needs
 * a description and the topic tags the library's Topic facet is built from.
 * `report_versions.description` exists and only needs selecting; `reports.tags`
 * needs a column. Connected once those land.
 */
export function ReportsLibrary() {
	return <ResourceLibrary items={SAMPLE_REPORTS} featuredLabel="Latest report" libraryTitle="Reports library" noun="report" placeholder />;
}
