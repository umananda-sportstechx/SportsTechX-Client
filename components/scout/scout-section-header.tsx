'use client';

import type { ReactNode } from 'react';
import { NavSectionHeader } from '@/components/atlas';
import { SCOUT_HOME, SCOUT_SECTION_SUBS } from './shell-config';
import { useScoutNav } from './use-scout-nav';

/** Scout's section header: the shared NavSectionHeader on the Scout nav. */
export function ScoutSectionHeader({ actions }: { actions?: ReactNode }) {
	return <NavSectionHeader nav={useScoutNav()} homePath={SCOUT_HOME} subs={SCOUT_SECTION_SUBS} actions={actions} />;
}
