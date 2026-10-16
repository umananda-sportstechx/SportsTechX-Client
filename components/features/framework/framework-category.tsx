'use client';

import Link from 'next/link';
import useSWR from 'swr';
import type { CSSProperties } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight, RotateCcw } from 'lucide-react';
import { qk } from '@/lib/query-keys';
import { Loading, Empty, Logo } from '@/components/atlas';
import { useFramework, useCategoryCount } from './use-framework';
import './framework.css';

interface ExCo { id: string; name: string; slug: string; website: string | null; hq_country: string | null; total_funding: number | null }

export function FrameworkCategory({ slug, backHref, categoryHref, exploreHref }: {
	slug: string;
	backHref: string;
	categoryHref: (slug: string) => string;
	exploreHref: (pillarSlug: string, categorySlug: string) => string;
}) {
	const { pillars, isLoading } = useFramework();
	const pillar = pillars.find((p) => p.categories.some((c) => c.slug === slug));
	const c = pillar?.categories.find((x) => x.slug === slug);
	const flat = pillars.flatMap((p) => p.categories);
	const idx = flat.findIndex((x) => x.slug === slug);
	const prev = idx > 0 ? flat[idx - 1] : null;
	const next = idx >= 0 && idx < flat.length - 1 ? flat[idx + 1] : null;
	const count = useCategoryCount(c?.filter);
	const examples = useSWR<{ data: ExCo[] }>(
		c?.filter ? qk.companies.list({ sector_slug: c.filter, sort: '-total_funding', page: 1, limit: 6 }) : null,
	);

	if (isLoading && !c) return <Loading />;
	if (!pillar || !c) return <Empty>That category doesn&apos;t exist. <Link href={backHref}>Back to the framework</Link></Empty>;

	const textCols: { title: string; items: string[] }[] = [
		{ title: 'Sub-categories', items: c.subCategories },
		{ title: 'Included technologies', items: c.copy?.technologies ?? [] },
		{ title: 'Example use cases', items: c.copy?.useCases ?? [] },
	];
	const cos = examples.data?.data ?? [];

	return (
		<section className="atlas-fw-detail" style={{ '--fw-color': pillar.copy.color, '--fw-ink': pillar.copy.tagInk } as CSSProperties}>
			<header className="atlas-fw-detail__head">
				<div className="atlas-fw-detail__title-row">
					<span className="atlas-fw-badge">{pillar.copy.badge}</span>
					<h2 className="atlas-fw-detail__title">{c.name}</h2>
				</div>
				<div className="atlas-fw-detail__nav">
					{prev
						? <Link href={categoryHref(prev.slug)} className="atlas-fw-navbtn" aria-label={`Previous: ${prev.name}`} title={prev.name}><ArrowLeft size={14} /></Link>
						: <span className="atlas-fw-navbtn is-disabled" aria-hidden="true"><ArrowLeft size={14} /></span>}
					{next
						? <Link href={categoryHref(next.slug)} className="atlas-fw-navbtn" aria-label={`Next: ${next.name}`} title={next.name}><ArrowRight size={14} /></Link>
						: <span className="atlas-fw-navbtn is-disabled" aria-hidden="true"><ArrowRight size={14} /></span>}
					<Link href={backHref} className="atlas-btn atlas-btn--outline"><RotateCcw /> Return</Link>
				</div>
			</header>
			{c.copy && <p className="atlas-fw-detail__desc">{c.copy.description}</p>}
			<hr className="atlas-fw-detail__rule" />
			<div className="atlas-fw-columns">
				{textCols.map((col) => (
					<div key={col.title}>
						<h3 className="atlas-fw-col__title">{col.title}</h3>
						{col.items.length > 0
							? <ul className="atlas-fw-col__list">{col.items.map((i) => <li key={i}>{i}</li>)}</ul>
							: <p className="atlas-fw-col__empty">—</p>}
					</div>
				))}
			</div>

			{(cos.length > 0 || examples.isLoading) && (
				<>
					<h3 className="atlas-fw-col__title" style={{ marginTop: 40 }}>Top companies in this category</h3>
					<div className="atlas-fw-companies">
						{examples.isLoading && cos.length === 0 && <p className="atlas-fw-col__empty">Loading…</p>}
						{cos.map((co) => (
							<Link key={co.id} href={`/companies/${co.slug}`} className="atlas-fw-co">
								<Logo co={{ name: co.name, website: co.website }} size={36} radius={7} />
								<div className="atlas-fw-co__info">
									<span className="atlas-fw-co__name">{co.name}</span>
									{co.hq_country && <span className="atlas-fw-co__meta">{co.hq_country}</span>}
								</div>
							</Link>
						))}
					</div>
				</>
			)}

			<hr className="atlas-fw-detail__rule atlas-fw-detail__rule--full" />
			<Link href={exploreHref(pillar.slug, c.slug)} className="atlas-btn atlas-btn--primary">
				Explore {count == null ? '' : `${count.toLocaleString()} `}companies in this category <ArrowUpRight />
			</Link>
		</section>
	);
}
