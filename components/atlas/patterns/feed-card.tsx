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
export function FeedCard({ tag, icon: Icon, title, body, href, onAction, actionLabel = 'View', extra, 'data-tour': dataTour }: {
	tag: string;
	icon?: LucideIcon;
	title: ReactNode;
	body?: ReactNode;
	/** Where the action pill goes. Ignored when `onAction` is given. */
	href?: string;
	/**
	 * Run instead of navigating. Home's "finish your setup" cards open a modal
	 * rather than a page, and their destination is a server-built `cta_href`
	 * string — so the card, not the server, decides which of the two it is.
	 */
	onAction?: () => void;
	/** Text on the action pill (Figma: "VIEW"). */
	actionLabel?: string;
	/** Optional slot under the body, e.g. a count badge. */
	extra?: ReactNode;
	/** Guided-tour anchor (lib/sandbox/tours). */
	'data-tour'?: string;
}) {
	const action = onAction
		? <button type="button" className="atlas-feed-card__action" onClick={onAction}>{actionLabel} <ArrowUpRight size={12} strokeWidth={1.5} /></button>
		: <Link href={href ?? '#'} className="atlas-feed-card__action">{actionLabel} <ArrowUpRight size={12} strokeWidth={1.5} /></Link>;
	return (
		<article className="atlas-feed-card" data-tour={dataTour}>
			<div className="atlas-feed-card__top">
				<span className="atlas-feed-card__tag">
					{Icon && <Icon size={13} strokeWidth={1.25} aria-hidden="true" />}
					{tag}
				</span>
				{action}
			</div>
			<h3 className="atlas-feed-card__title">{title}</h3>
			{body && <p className="atlas-feed-card__body">{body}</p>}
			{extra && <div className="atlas-feed-card__extra">{extra}</div>}
		</article>
	);
}
