'use client';

import type { ReactNode } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { TabbedPageHeader } from './tabbed-page-header';
import { pickActive, flattenNav, isSection, type ShellNavEntry } from '../shell/nav';

/**
 * Page header for any page that sits in a sidebar section: the section title is
 * the heading and the section's items are the tabs (one URL each), so the page
 * always mirrors the navigation. Renders nothing outside a section. Products
 * wrap it with their own nav (RaiseSectionHeader, ScoutSectionHeader).
 */
export function NavSectionHeader({ nav, homePath, subs, actions }: {
	nav: ShellNavEntry[];
	homePath: string;
	/** Sub-line under each section title, keyed by section title. */
	subs?: Record<string, string>;
	actions?: ReactNode;
}) {
	const pathname = usePathname();
	const params = useSearchParams();
	const active = pickActive(flattenNav(nav), homePath, pathname, params);
	const section = nav.filter(isSection).find((s) => s.items.some((i) => i.path === active));
	if (!section) return null;
	return (
		<TabbedPageHeader
			title={section.title}
			sub={subs?.[section.title]}
			tabs={section.items.map((i) => ({ label: i.name, href: i.path, soon: i.soon, placeholder: i.placeholder, active: i.path === active }))}
			actions={actions}
		/>
	);
}
