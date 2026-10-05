'use client';

import { useMemo, useState } from 'react';
import { CardGrid, Empty, FilterBar, PlaceholderTag, type FilterDef } from '@/components/atlas';
import { FeaturedResource, ResourceCard, fmtLongDate } from './resource-card';
import type { SampleResource } from './sample-resources';

/**
 * Featured item + filterable library, shared by Reports and Newsletter in every
 * product. Backend Not Connected: rows are sample data (sample-resources.ts).
 */
const SORTS: [string, string][] = [['new', 'Newest'], ['old', 'Oldest'], ['az', 'Title A–Z']];
const ACCESS: [string, string][] = [['Free', 'Free'], ['Premium', 'Premium']];

export function ResourceLibrary({ items, featuredLabel, libraryTitle, noun }: {
	items: SampleResource[];
	/** e.g. "Latest report". */
	featuredLabel: string;
	/** e.g. "Reports library". */
	libraryTitle: string;
	/** Singular noun for counts, e.g. "report". */
	noun: string;
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

	return (
		<>
			{featured && (
				<FeaturedResource
					meta={`${featuredLabel} · Published ${fmtLongDate(featured.date)} · ${featured.access}`}
					title={<>{featured.title}<PlaceholderTag /></>}
					desc={featured.desc}
					tags={featured.tags}
				/>
			)}
			<h2 className="atlas-h2 atlas-res-section">{libraryTitle}</h2>
			<FilterBar
				search={{ value: q, onChange: setQ, placeholder: `Search ${noun}s` }}
				groups={[{ label: 'Filters', filters: [sel('topic', 'Topic', tag, tags, setTag), sel('access', 'Access', access, ACCESS, setAccess)] }]}
				sort={{ value: sort, options: SORTS, onChange: setSort }}
				canClear={!!(q || tag || access)}
				onClear={() => { setQ(''); setTag(''); setAccess(''); }}
				count={`${rows.length} ${noun}${rows.length === 1 ? '' : 's'}`}
			/>
			{rows.length === 0 ? <Empty>No {noun}s match your filters.</Empty> : <CardGrid>{rows.map((r) => <ResourceCard key={r.title} r={r} />)}</CardGrid>}
		</>
	);
}
