'use client';

import type { ReactNode } from 'react';
import { PlaceholderTag } from '@/components/atlas';
import type { SampleResource } from './sample-resources';
import './resources.css';

export const fmtLongDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) : '');

/** Featured item (latest report / edition): meta line, title, description, tags, actions. */
export function FeaturedResource({ meta, title, desc, tags, actions }: { meta: string; title: ReactNode; desc?: string | null; tags?: string[]; actions?: ReactNode }) {
	return (
		<article className="atlas-card atlas-card--glow atlas-res-feat">
			<div className="atlas-eyebrow">{meta}</div>
			<h2 className="atlas-res-feat__title">{title}</h2>
			{desc && <p className="atlas-res-feat__desc">{desc}</p>}
			{!!tags?.length && <div className="atlas-res-tags">{tags.map((t) => <span key={t} className="atlas-res-tag">{t}</span>)}</div>}
			{actions && <div className="atlas-res-feat__actions">{actions}</div>}
		</article>
	);
}

/** Library / archive card: date · access, title, description, tags. Opening is Not connected yet. */
export function ResourceCard({ r }: { r: SampleResource }) {
	return (
		<article className="atlas-card atlas-res-card">
			<div className="atlas-res-card__meta">
				<span>{fmtLongDate(r.date)}</span>
				<span className={r.access === 'Premium' ? 'atlas-res-premium' : undefined}>{r.access}</span>
			</div>
			<h3 className="atlas-res-card__title">{r.title}</h3>
			<p className="atlas-res-card__desc">{r.desc}</p>
			<div className="atlas-res-tags">{r.tags.map((t) => <span key={t} className="atlas-res-tag">{t}</span>)}</div>
			<div className="atlas-res-card__foot"><PlaceholderTag short /></div>
		</article>
	);
}
