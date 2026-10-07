'use client';

import type { ReactNode } from 'react';
import { NavSectionHeader } from '@/components/atlas';
import { useNav } from '@/hooks/use-nav';

/**
 * The page header for any screen that sits in a sidebar section: the section
 * title is the heading and its items are the tabs.
 *
 * One component for all three products now that the nav is derived — the
 * Explore/Raise/Scout wrappers it replaces differed only in which nav array
 * they passed.
 */
export function SectionHeader({ actions }: { actions?: ReactNode }) {
	const { nav, homePath, subs } = useNav();
	return <NavSectionHeader nav={nav} homePath={homePath} subs={subs} actions={actions} />;
}
