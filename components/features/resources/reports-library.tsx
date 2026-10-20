'use client';

import { useMemo } from 'react';
import useSWR from 'swr';
import { qk } from '@/lib/query-keys';
import { downloadReport, viewReport } from '@/lib/report-pdf';
import type { Page, ReportListItem } from '@/types/api';
import { ResourceLibrary } from './resource-library';
import type { Resource } from './resource-contract';

const toResource = (r: ReportListItem): Resource => ({
	id: r.id,
	title: r.title,
	desc: r.description ?? '',
	date: r.report_year
		? `${r.report_year}-${String(r.report_month ?? 1).padStart(2, '0')}-01`
		: r.created_at,
	access: r.has_pro_version ? 'Premium' : 'Free',
	tags: r.tags ?? [],
	cover: r.cover_url,
	// Both kinds open in a NEW TAB: section reports → the chrome-less in-app
	// renderer, legacy cover+PDF reports → the signed PDF (viewReport already
	// opens its own tab), so reading a report never loses the library you were on.
	onView: r.has_sections
		? () => window.open(`/reports/${r.slug ?? r.id}`, '_blank', 'noopener')
		: () => void viewReport(r.slug ?? r.id),
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
