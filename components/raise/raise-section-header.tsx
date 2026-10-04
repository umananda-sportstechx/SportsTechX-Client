'use client';

import type { ReactNode } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { TabbedPageHeader, pickActive, flattenNav, isSection } from '@/components/atlas';
import { RAISE_HOME, RAISE_SECTION_SUBS } from './shell-config';
import { useRaiseNav } from './use-raise-nav';

/**
 * Page header for any Raise page that sits in a sidebar section: the section
 * title is the heading and the section's items are the tabs (one URL each), so
 * the page always mirrors the navigation. Renders nothing outside a section.
 */
export function RaiseSectionHeader({ actions }: { actions?: ReactNode }) {
	const pathname = usePathname();
	const params = useSearchParams();
	const nav = useRaiseNav();
	const active = pickActive(flattenNav(nav), RAISE_HOME, pathname, params);
	const section = nav.filter(isSection).find((s) => s.items.some((i) => i.path === active));
	if (!section) return null;
	return (
		<TabbedPageHeader
			title={section.title}
			sub={RAISE_SECTION_SUBS[section.title]}
			tabs={section.items.map((i) => ({ label: i.name, href: i.path, soon: i.soon, active: i.path === active }))}
			actions={actions}
		/>
	);
}
