'use client';

import { Inbox, Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { cx } from './cx';

/** Page-level building blocks: content wrapper, headings, page header, loading + empty states. */

/** Padded content wrapper — the founder shell's content region has no padding.
 *  Centred within the main column; padding shrinks on small screens (see styles/base.css). */
/**
 * The standard page frame. 1440px is the one content width every page shares;
 * the three home screens use the same value in their own wrappers. A page
 * passes a smaller `width` only when it is a focused form.
 */
export const PAGE_MAX = 1440;

export function Screen({ children, width = PAGE_MAX }: { children: ReactNode; width?: number }) {
	return <div className="atlas-screen" style={{ maxWidth: width }}>{children}</div>;
}

export function Loading({ label }: { label?: ReactNode }) {
	return (
		<div className="atlas-loading" role="status" aria-live="polite">
			<Loader2 className="animate-spin" size={22} aria-hidden="true" />
			{label && <span className="atlas-loading__label">{label}</span>}
			<span className="atlas-sr-only">Loading…</span>
		</div>
	);
}

/**
 * The empty state. A string still works (`<Empty>No reports yet.</Empty>`), but
 * a real empty state gets a soft icon, a short title and — where the user can do
 * something about it — an action. Pages that read empty because the user hasn't
 * finished a step (thesis, profile) pass a `title` + `action` so the blankness
 * reads as a prompt, not a dead end.
 */
export function Empty({ children, icon, title, action }: {
	children?: ReactNode; icon?: ReactNode; title?: ReactNode; action?: ReactNode;
}) {
	return (
		<div className="atlas-empty">
			<div className="atlas-empty__icon">{icon ?? <Inbox size={22} strokeWidth={1.5} aria-hidden="true" />}</div>
			{title && <div className="atlas-empty__title">{title}</div>}
			{children && <div className="atlas-empty__text">{children}</div>}
			{action && <div className="atlas-empty__action">{action}</div>}
		</div>
	);
}

export function H1({ children, className }: { children: ReactNode; className?: string }) {
	return <h1 className={cx('atlas-h1', className)}>{children}</h1>;
}

export function H2({ children, className }: { children: ReactNode; className?: string }) {
	return <h2 className={cx('atlas-h2', className)}>{children}</h2>;
}

export function Sub({ children }: { children: ReactNode }) { return <p className="atlas-sub">{children}</p>; }

export function Eyebrow({ children }: { children: ReactNode }) { return <div className="atlas-eyebrow">{children}</div>; }

/** Section header — 24px title, optional right-hand meta, hairline below (Figma "Section Header"). */
export function SectionHead({ title, meta }: { title: ReactNode; meta?: ReactNode }) {
	return (
		<header className="atlas-sectionhead">
			<h2 className="atlas-sectionhead__title">{title}</h2>
			{meta && <div className="atlas-sectionhead__meta">{meta}</div>}
		</header>
	);
}
/** Page header — title, optional sub-line and right-side actions, over a hairline divider. */
export function PageHead({ title, sub, actions }: { title: ReactNode; sub?: ReactNode; actions?: ReactNode }) {
	return (
		<header className="atlas-pagehead" style={actions ? { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' } : undefined}>
			<div><H1>{title}</H1>{sub && <Sub>{sub}</Sub>}</div>
			{actions && <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>{actions}</div>}
		</header>
	);
}
