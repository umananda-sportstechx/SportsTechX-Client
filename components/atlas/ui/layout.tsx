'use client';

import { Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { cx } from './cx';

/** Page-level building blocks: content wrapper, headings, page header, loading + empty states. */

/** Padded content wrapper — the founder shell's content region has no padding.
 *  Centred within the main column; padding shrinks on small screens (see styles/base.css). */
export function Screen({ children, width = 1180 }: { children: ReactNode; width?: number }) {
	return <div className="atlas-screen" style={{ maxWidth: width }}>{children}</div>;
}

export function Loading() {
	return <div style={{ display: 'grid', placeItems: 'center', minHeight: 320 }}><Loader2 className="spin" size={22} /></div>;
}

export function Empty({ children }: { children: ReactNode }) {
	return <div className="atlas-card" style={{ textAlign: 'center', color: 'var(--a-muted)', fontSize: 14, padding: 28 }}>{children}</div>;
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
