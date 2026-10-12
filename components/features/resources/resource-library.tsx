'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { ArrowUpRight, Download, FileText, Newspaper } from 'lucide-react';
import { Action, Empty, FeaturedPost, FilterBar, Loading, PostCard, type FilterDef } from '@/components/atlas';
import type { Resource } from './resource-contract';
import './resources.css';

/**
 * Featured item + filterable library, shared by Reports and Newsletter in every
 * product. Built on the Figma post cards (`FeaturedPost` / `PostCard`). Takes a
 * ready array — each caller owns its fetch and maps rows onto `Resource`, so
 * this stays presentation-only.
 *
 * `items` must arrive **newest first**: the first element becomes the hero and
 * the `'old'` sort is a positional `reverse()`, not a date comparison.
 */
const SORTS: [string, string][] = [['new', 'Newest'], ['old', 'Oldest'], ['az', 'Title A–Z']];
const ACCESS: [string, string][] = [['Free', 'Free'], ['Premium', 'Premium']];

export const fmtLongDate = (d?: string | null) =>
	(d ? new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) : '');

export function ResourceLibrary({ items, kind, intro, featuredLabel, libraryTitle, noun, viewLabel, isLoading, aside }: {
	items: Resource[];
	/** Picks the meta icon. */
	kind: 'report' | 'edition';
	/** One-line description under the tabs. */
	intro?: string;
	/** e.g. "Latest report". */
	featuredLabel: string;
	/** e.g. "Reports library". */
	libraryTitle: string;
	/** Singular noun for counts, e.g. "report". */
	noun: string;
	/** e.g. "View report". */
	viewLabel: string;
	/** First load with nothing to show yet. Distinguishes "fetching" from "none". */
	isLoading?: boolean;
	/** Right-hand note on the library heading, e.g. the publishing cadence. */
	aside?: ReactNode;
}) {
	const [featured, ...rest] = items;
	const [q, setQ] = useState('');
	const [tag, setTag] = useState('');
	const [access, setAccess] = useState('');
	const [sort, setSort] = useState('new');
	const tags = useMemo(() => [...new Set(rest.flatMap((r) => r.tags))].sort().map((t) => [t, t] as [string, string]), [rest]);
	const sel = (key: string, label: string, value: string, options: [string, string][], set: (v: string) => void): FilterDef => ({ kind: 'select', key, label, value, options, onChange: set });

	const rows = useMemo(() => {
		const term = q.trim().toLowerCase();
		const out = rest.filter((r) => (!term || `${r.title} ${r.desc}`.toLowerCase().includes(term)) && (!tag || r.tags.includes(tag)) && (!access || r.access === access));
		if (sort === 'old') return [...out].reverse();
		if (sort === 'az') return [...out].sort((a, b) => a.title.localeCompare(b.title));
		return out;
	}, [rest, q, tag, access, sort]);

	const MetaIcon = kind === 'report' ? FileText : Newspaper;
	const actionsFor = (r: Resource) => (
		<>
			{r.onView
				? <Action icon={<ArrowUpRight />} onClick={r.onView}>{viewLabel}</Action>
				: r.href ? <Action icon={<ArrowUpRight />} href={r.href} external={r.external}>{viewLabel}</Action> : null}
			{r.onDownload && <Action icon={<Download />} onClick={r.onDownload}>Download {noun}</Action>}
		</>
	);
	const metaFor = (r: Resource) => (
		<>
			<span>{fmtLongDate(r.date)}</span>
			<span aria-hidden="true">·</span>
			<span className={r.access === 'Premium' ? 'is-premium' : undefined}>{r.access}</span>
		</>
	);

	if (isLoading && items.length === 0) return <Loading />;
	if (!featured) return <Empty>No {noun}s published yet.</Empty>;

	return (
		<>
			{intro && <p className="atlas-res-intro">{intro}</p>}

			<FeaturedPost
				cover={featured.cover}
				metaIcon={<MetaIcon size={12} strokeWidth={1.5} aria-hidden="true" />}
				meta={<>{featuredLabel} · Published {fmtLongDate(featured.date)} · <span className={featured.access === 'Premium' ? 'is-premium' : undefined}>{featured.access}</span></>}
				title={featured.title}
				desc={featured.desc}
				tags={featured.tags}
				actions={actionsFor(featured)}
			/>

			<div className="atlas-res-head">
				<h2 className="atlas-h2">{libraryTitle}</h2>
			</div>
			<FilterBar
				search={{ value: q, onChange: setQ, placeholder: `Search ${noun}s` }}
				groups={[{ label: 'Filters', filters: [sel('topic', 'Topic', tag, tags, setTag), sel('access', 'Access', access, ACCESS, setAccess)] }]}
				sort={{ value: sort, options: SORTS, onChange: setSort }}
				canClear={!!(q || tag || access)}
				onClear={() => { setQ(''); setTag(''); setAccess(''); }}
				count={aside ?? `${rows.length} ${noun}${rows.length === 1 ? '' : 's'}`}
			/>
			<div className="atlas-res-rule" />
			{rows.length === 0 ? <Empty>No {noun}s match your filters.</Empty> : (
				<div className="atlas-post-grid">
					{rows.map((r) => (
						<PostCard key={r.id} cover={r.cover} meta={metaFor(r)} title={r.title} desc={r.desc} tags={r.tags} actions={actionsFor(r)} />
					))}
				</div>
			)}
		</>
	);
}
