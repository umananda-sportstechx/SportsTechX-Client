'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { ArrowUpRight } from 'lucide-react';

/**
 * FeedCard — a home-feed item (Figma "Card" on the Home frame): category tag
 * with icon, title, short body and a black action pill top-right, on the pink
 * glow surface. Lay several out with `.atlas-feed-grid` (two columns).
 */
export function FeedCard({ tag, icon: Icon, title, body, href, actionLabel = 'View', extra }: {
	tag: string;
	icon?: LucideIcon;
	title: ReactNode;
	body?: ReactNode;
	href: string;
	/** Text on the action pill (Figma: "VIEW"). */
	actionLabel?: string;
	/** Optional slot under the body, e.g. a count badge. */
	extra?: ReactNode;
}) {
	return (
		<article className="atlas-feed-card">
			<div className="atlas-feed-card__top">
				<span className="atlas-feed-card__tag">
					{Icon && <Icon size={13} strokeWidth={1.25} aria-hidden="true" />}
					{tag}
				</span>
				<Link href={href} className="atlas-feed-card__action">{actionLabel} <ArrowUpRight size={12} strokeWidth={1.5} /></Link>
			</div>
			<h3 className="atlas-feed-card__title">{title}</h3>
			{body && <p className="atlas-feed-card__body">{body}</p>}
			{extra && <div className="atlas-feed-card__extra">{extra}</div>}
		</article>
	);
}
