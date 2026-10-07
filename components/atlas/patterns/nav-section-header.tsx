'use client';

import type { ReactNode } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { TabbedPageHeader } from './tabbed-page-header';
import { pickActive, flattenNav, isSection, type ShellNavEntry } from '../shell/nav';

/**
 * Page header for any page that sits in a sidebar section: the section title is
 * the heading and the section's items are the tabs (one URL each), so the page
 * always mirrors the navigation. Renders nothing outside a section.
 *
 * `SectionHeader` is the wrapper every page uses; it supplies the nav from the
 * route manifest. The three per-product wrappers this used to name are gone —
 * the nav is derived from the viewer's tier, not from which tree they are in.
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
