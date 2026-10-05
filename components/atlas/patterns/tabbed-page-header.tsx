'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { H1, Sub } from '../ui/layout';
import { cx } from '../ui/cx';
import { PlaceholderTag } from './placeholder-tag';

export interface HeaderTab { label: string; href: string; active?: boolean; soon?: boolean; placeholder?: boolean }

/**
 * TabbedPageHeader — page title + sub-line + link tabs (Figma "Header" + "Tab Bar").
 * Used for nav sections: the section title is the page title and the section's
 * items are the tabs, each its own URL. `soon` tabs render greyed with a SOON pill.
 */
export function TabbedPageHeader({ title, sub, tabs, actions }: {
	title: ReactNode;
	sub?: ReactNode;
	tabs: HeaderTab[];
	/** Right-aligned controls beside the title (e.g. an upload button). */
	actions?: ReactNode;
}) {
	return (
		<header className="atlas-tabbed-head">
			<div className="atlas-tabbed-head__top">
				<div><H1>{title}</H1>{sub && <Sub>{sub}</Sub>}</div>
				{actions && <div className="atlas-tabbed-head__actions">{actions}</div>}
			</div>
			<nav className="atlas-tabs atlas-tabbed-head__tabs" aria-label={typeof title === 'string' ? `${title} sections` : 'Sections'}>
				{tabs.map((t) => t.soon ? (
					<span key={t.href} className="atlas-tab is-soon" aria-disabled="true">{t.label}<span className="atlas-soon">Soon</span></span>
				) : (
					<Link key={t.href} href={t.href} className={cx('atlas-tab', t.placeholder && 'has-pill', t.active && 'active')} aria-current={t.active ? 'page' : undefined}>{t.label}{t.placeholder && <PlaceholderTag short={!t.active} />}</Link>
				))}
			</nav>
		</header>
	);
}
