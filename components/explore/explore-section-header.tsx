'use client';

import type { ReactNode } from 'react';
import { NavSectionHeader } from '@/components/atlas';
import { EXPLORE_HOME, EXPLORE_NAV, EXPLORE_SECTION_SUBS } from './shell-config';

/** Explore's section header: the shared NavSectionHeader on the Explore nav. */
export function ExploreSectionHeader({ actions }: { actions?: ReactNode }) {
	return <NavSectionHeader nav={EXPLORE_NAV} homePath={EXPLORE_HOME} subs={EXPLORE_SECTION_SUBS} actions={actions} />;
}
