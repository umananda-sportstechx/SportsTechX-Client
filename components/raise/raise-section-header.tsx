'use client';

import type { ReactNode } from 'react';
import { NavSectionHeader } from '@/components/atlas';
import { RAISE_HOME, RAISE_SECTION_SUBS } from './shell-config';
import { useRaiseNav } from './use-raise-nav';

/** Raise's section header: the shared NavSectionHeader on the Raise nav. */
export function RaiseSectionHeader({ actions }: { actions?: ReactNode }) {
	return <NavSectionHeader nav={useRaiseNav()} homePath={RAISE_HOME} subs={RAISE_SECTION_SUBS} actions={actions} />;
}
