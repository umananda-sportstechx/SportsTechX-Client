'use client';

import { useMemo } from 'react';
import useSWR from 'swr';
import { qk } from '@/lib/query-keys';
import { hrefOf } from '@/lib/routes';
import { downloadReport } from '@/lib/report-pdf';
import type { Page, ReportListItem } from '@/types/api';
import { ResourceLibrary } from './resource-library';
import type { Resource } from './resource-contract';

/**
 * Reports — latest report + library. Live against `GET /api/reports`, shared by
 * Raise, Scout and Explore.
 *
 * Every card used to end in a "Not connected" tag: there was no way to open a
 * report at all, although all 33 have a PDF and the API mints signed URLs for
 * them. "View" now opens the report page; "Download" saves the PDF directly.
 *
 * The Topic facet is built from `tags`, which default to empty — the dropdown
 * stays blank until reports are tagged in admin. That is expected, not a bug.
 */
const reportHref = (r: ReportListItem) => `${hrefOf('reports')}/${encodeURIComponent(r.slug ?? r.id)}`;

const toResource = (r: ReportListItem): Resource => ({
	id: r.id,
	title: r.title,
	desc: r.description ?? '',
	// No published-at column exists. `report_month` / `report_year` is the
	// editorial date the card means by "Published …"; `created_at` is the
	// fallback for rows that never set one (month is often null on its own).
	date: r.report_year
		? `${r.report_year}-${String(r.report_month ?? 1).padStart(2, '0')}-01`
		: r.created_at,
	access: r.has_pro_version ? 'Premium' : 'Free',
	// `?? []` covers the deploy window only: client and server ship separately.
	tags: r.tags ?? [],
	cover: r.cover_url,
	href: reportHref(r),
	onDownload: () => void downloadReport(r.slug ?? r.id),
});

export function ReportsLibrary() {
	// One page covers the whole library — 33 reports today. `pageQuerySchema`
	// caps limit at 200.
	const res = useSWR<Page<ReportListItem>>(qk.reports.list({ limit: 100 }));
	// Sort on the displayed date rather than trusting the server's `-report_year`,
	// which puts year-less rows first — wrong for a hero.
	const items = useMemo(
		() => (res.data?.data ?? []).map(toResource).sort((a, b) => Date.parse(b.date) - Date.parse(a.date)),
		[res.data],
	);

	return (
		<ResourceLibrary
			items={items}
			kind="report"
			isLoading={res.isLoading}
			intro="Market sizing, funding trends and category maps from SportsTechX research — across regions, sports and sectors."
			featuredLabel="Latest report"
			libraryTitle="Reports library"
			noun="report"
			viewLabel="View report"
		/>
	);
}
