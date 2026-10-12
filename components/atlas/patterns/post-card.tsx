'use client';

import type { ReactNode } from 'react';
import { Tag } from 'lucide-react';
import { cx } from '../ui/cx';

/**
 * The two content cards from the Figma component sheet, shared by every
 * library-style page (Reports, Newsletter, and anything that lists editorial
 * content in future):
 *
 *  - `FeaturedPost` — "Featured post content card with / highlight": a tall
 *    cover on the left, meta · title · description · tags, a rule, then the
 *    action pills. Always carries the pink highlight.
 *  - `PostCard` — "Default post content cards + hover highlight": a small
 *    cover beside the meta and title, description, underlined tag links, a
 *    rule, actions. The highlight appears on hover, and the action icon flips
 *    from outline to filled with it.
 *
 * Presentation only: callers pass the actions, so a report can offer
 * View + Download while an edition offers View alone.
 */

/** Cover image, or the blank white frame the design shows when there is none. */
function Cover({ src, alt, className }: { src?: string | null; alt: string; className: string }) {
	return (
		<div className={className}>
			{src ? (
				// eslint-disable-next-line @next/next/no-img-element
				<img src={src} alt={alt} loading="lazy" />
			) : null}
		</div>
	);
}

export function FeaturedPost({ cover, meta, metaIcon, title, desc, tags, actions }: {
	cover?: string | null;
	meta: ReactNode;
	metaIcon?: ReactNode;
	title: ReactNode;
	desc?: string | null;
	tags?: string[];
	actions?: ReactNode;
}) {
	return (
		<article className="atlas-post atlas-post--featured">
			<Cover src={cover} alt="" className="atlas-post__cover atlas-post__cover--tall" />
			<div className="atlas-post__body">
				<div className="atlas-post__meta">{metaIcon}{meta}</div>
				<h2 className="atlas-post__title atlas-post__title--lg">{title}</h2>
				{desc && <p className="atlas-post__desc">{desc}</p>}
				{!!tags?.length && (
					<div className="atlas-post__chips">{tags.map((t) => <span key={t} className="atlas-post__chip">{t}</span>)}</div>
				)}
				{actions && <div className="atlas-post__actions">{actions}</div>}
			</div>
		</article>
	);
}

export function PostCard({ cover, meta, title, desc, tags, actions, className }: {
	cover?: string | null;
	meta: ReactNode;
	title: ReactNode;
	desc?: string | null;
	tags?: string[];
	actions?: ReactNode;
	className?: string;
}) {
	return (
		<article className={cx('atlas-post atlas-post--card', className)}>
			<Cover src={cover} alt="" className="atlas-post__cover atlas-post__cover--banner" />
			<div className="atlas-post__cardbody">
				<div className="atlas-post__meta">{meta}</div>
				<h3 className="atlas-post__title">{title}</h3>
				{desc && <p className="atlas-post__desc atlas-post__desc--clamp">{desc}</p>}
				{!!tags?.length && (
					<div className="atlas-post__tags">
						<Tag size={13} strokeWidth={1.5} aria-hidden="true" />
						{tags.map((t) => <span key={t} className="atlas-post__tag">{t}</span>)}
					</div>
				)}
				{actions && <div className="atlas-post__actions atlas-post__actions--card">{actions}</div>}
			</div>
		</article>
	);
}
