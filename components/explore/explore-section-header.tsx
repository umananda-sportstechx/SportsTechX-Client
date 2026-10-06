'use client';

import type { ReactNode } from 'react';
import { SectionHeader } from '@/components/atlas/patterns/section-header';

/** Explore's section header. Now a thin alias: the header derives its nav
 *  from the route manifest, so all three products share one implementation.
 *  Kept as a named export only so the ~50 page files can be updated with the
 *  route move rather than in a separate pass. */
export function ExploreSectionHeader({ actions }: { actions?: ReactNode }) {
	return <SectionHeader actions={actions} />;
}
