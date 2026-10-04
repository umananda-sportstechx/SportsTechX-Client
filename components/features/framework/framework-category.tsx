'use client';

import Link from 'next/link';
import useSWR from 'swr';
import type { CSSProperties } from 'react';
import { ArrowUpRight, RotateCcw } from 'lucide-react';
import { qk } from '@/lib/query-keys';
import { Loading, Empty } from '@/components/atlas';
import { useFramework, useCategoryCount } from './use-framework';
import './framework.css';

/**
 * Framework category view (Figma "Intelligence Framework Category View"):
 * pillar badge + category title, description, then sub-categories, included
 * technologies, example use cases and example companies, and a CTA into the
 * company database filtered to this category.
 */
export function FrameworkCategory({ slug, backHref, exploreHref }: {
	slug: string;
	/** Where RETURN goes (the framework overview). */
	backHref: string;
	/** Company database filtered to this category. */
	exploreHref: (pillarSlug: string, categorySlug: string) => string;
}) {
	const { pillars, isLoading } = useFramework();
	const pillar = pillars.find((p) => p.categories.some((c) => c.slug === slug));
	const c = pillar?.categories.find((x) => x.slug === slug);
	const count = useCategoryCount(c?.filter);
	const examples = useSWR<{ data: Array<{ id: string; name: string }> }>(
		c?.filter ? qk.companies.list({ sector_slug: c.filter, sort: '-total_funding', page: 1, limit: 4 }) : null,
	);

	if (isLoading && !c) return <Loading />;
	if (!pillar || !c) return <Empty>That category doesn’t exist. <Link href={backHref}>Back to the framework</Link></Empty>;

	const columns: { title: string; items: string[] }[] = [
		{ title: 'Sub-categories', items: c.subCategories },
		{ title: 'Included technologies', items: c.copy?.technologies ?? [] },
		{ title: 'Example use cases', items: c.copy?.useCases ?? [] },
		{ title: 'Example companies', items: (examples.data?.data ?? []).map((x) => x.name) },
	];

	return (
		<section className="atlas-fw-detail" style={{ '--fw-color': pillar.copy.color, '--fw-ink': pillar.copy.tagInk } as CSSProperties}>
			<header className="atlas-fw-detail__head">
				<div className="atlas-fw-detail__title-row">
					<span className="atlas-fw-badge">{pillar.copy.badge}</span>
					<h2 className="atlas-fw-detail__title">{c.name}</h2>
				</div>
				<Link href={backHref} className="atlas-btn atlas-btn--outline"><RotateCcw /> Return</Link>
			</header>
			{c.copy && <p className="atlas-fw-detail__desc">{c.copy.description}</p>}
			<hr className="atlas-fw-detail__rule" />
			<div className="atlas-fw-columns">
				{columns.map((col) => (
					<div key={col.title}>
						<h3 className="atlas-fw-col__title">{col.title}</h3>
						{col.items.length > 0
							? <ul className="atlas-fw-col__list">{col.items.map((i) => <li key={i}>{i}</li>)}</ul>
							: <p className="atlas-fw-col__empty">{col.title === 'Example companies' && examples.isLoading ? 'Loading…' : '—'}</p>}
					</div>
				))}
			</div>
			<hr className="atlas-fw-detail__rule atlas-fw-detail__rule--full" />
			<Link href={exploreHref(pillar.slug, c.slug)} className="atlas-btn atlas-btn--primary">
				Explore {count == null ? '' : `${count.toLocaleString()} `}companies in this category <ArrowUpRight />
			</Link>
		</section>
	);
}
