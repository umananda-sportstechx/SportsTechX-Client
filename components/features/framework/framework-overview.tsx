'use client';

import Link from 'next/link';
import type { CSSProperties } from 'react';
import { ArrowUpRight, Building2 } from 'lucide-react';
import { Loading, Empty } from '@/components/atlas';
import { useFramework, useCategoryCount, type FrameworkCategory } from './use-framework';
import { FRAMEWORK_INTRO } from './framework-content';
import './framework.css';

/**
 * Framework overview (Figma "Intelligence Framework"): an intro, then one card
 * per pillar (For athletes / fans / executives) listing its categories with
 * company count, description and sub-category tags. Each category opens its view.
 */
export function FrameworkOverview({ categoryHref }: { categoryHref: (slug: string) => string }) {
	const { pillars, isLoading } = useFramework();
	if (isLoading && pillars.length === 0) return <Loading />;
	if (pillars.length === 0) return <Empty>The framework is unavailable right now.</Empty>;
	return (
		<>
			<p className="atlas-fw-intro">{FRAMEWORK_INTRO}</p>
			<div className="atlas-fw-grid">
				{pillars.map((p) => (
					<section key={p.slug} className="atlas-fw-pillar" style={{ '--fw-color': p.copy.color, '--fw-ink': p.copy.tagInk } as CSSProperties} aria-label={p.copy.badge}>
						<span className="atlas-fw-badge">{p.copy.badge}</span>
						<div className="atlas-fw-blocks">
							{p.categories.map((c) => <CategoryBlock key={c.slug} c={c} href={categoryHref(c.slug)} />)}
						</div>
					</section>
				))}
			</div>
		</>
	);
}

function CategoryBlock({ c, href }: { c: FrameworkCategory; href: string }) {
	const count = useCategoryCount(c.filter);
	return (
		<article className="atlas-fw-block">
			<div className="atlas-fw-block__head">
				<h3 className="atlas-fw-block__title"><Link href={href}>{c.name}</Link></h3>
				<Link href={href} className="atlas-action__icon atlas-fw-block__go" aria-label={`Open ${c.name}`}><ArrowUpRight /></Link>
			</div>
			<div className="atlas-fw-count"><Building2 size={11} strokeWidth={1.25} aria-hidden="true" />{count == null ? '—' : count.toLocaleString()} companies</div>
			{c.copy && <p className="atlas-fw-block__desc">{c.copy.description}</p>}
			{c.subCategories.length > 0 && (
				<div className="atlas-fw-tags">{c.subCategories.slice(0, 2).map((s) => <span key={s} className="atlas-fw-tag">{s}</span>)}</div>
			)}
		</article>
	);
}
