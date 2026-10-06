'use client';

import { useMemo } from 'react';
import useSWR from 'swr';
import { qk } from '@/lib/query-keys';
import type { Page, ReportListItem } from '@/types/api';
import { ResourceLibrary } from './resource-library';
import type { SampleResource } from './resource-contract';

/**
 * Reports — latest report + library. Live against `GET /api/reports`, shared by
 * Raise, Scout and Explore.
 *
 * The Topic facet is built from `tags`, which default to empty — the dropdown
 * stays blank until reports are tagged in admin. That is expected, not a bug.
 */
const toResource = (r: ReportListItem): SampleResource => ({
	title: r.title,
	desc: r.description ?? '',
	// No published-at column exists. `report_month` / `report_year` is the
	// editorial date the card means by "Published …"; `created_at` is the
	// fallback for rows that never set one (month is often null on its own).
	date: r.report_year
		? `${r.report_year}-${String(r.report_month ?? 1).padStart(2, '0')}-01`
		: r.created_at,
	access: r.has_pro_version ? 'Premium' : 'Free',
	// `?? []` covers the deploy window only: client and server ship
	// separately, and ResourceLibrary flatMaps this, so an older API
	// without the column would throw rather than render untagged.
	tags: r.tags ?? [],
});

export function ReportsLibrary() {
	// One page covers the whole library — 33 reports today, and `ResourceLibrary`
	// has no pager. `pageQuerySchema` caps limit at 200.
	const res = useSWR<Page<ReportListItem>>(qk.reports.list({ limit: 100 }));
	// Sort on the displayed date rather than trusting the server's `-report_year`,
	// which puts year-less rows first — wrong for a hero. ResourceLibrary takes
	// items[0] as the featured card and its 'old' sort is a positional reverse.
	const items = useMemo(
		() => (res.data?.data ?? []).map(toResource).sort((a, b) => Date.parse(b.date) - Date.parse(a.date)),
		[res.data],
	);

	return (
		<ResourceLibrary
			items={items}
			isLoading={res.isLoading}
			featuredLabel="Latest report"
			libraryTitle="Reports library"
			noun="report"
		/>
	);
}
