'use client';

import { useMemo } from 'react';
import useSWR from 'swr';
import { qk } from '@/lib/query-keys';
import { downloadReport } from '@/lib/report-pdf';
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
	// Reports are dated by month (or only year) — never show an invented day.
	dateLabel: r.report_year
		? (r.report_month ? new Date(r.report_year, r.report_month - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) : String(r.report_year))
		: undefined,
	access: r.has_pro_version ? 'Premium' : 'Free',
	tags: r.tags ?? [],
	cover: r.cover_url,
	// Only buttons that work. View opens the in-app report page in a NEW TAB
	// (section renderer, or the PDF reader — a locked PDF shows its upgrade
	// message there), so it needs something to read: a web report or a PDF.
	// Download needs a PDF this plan can open. (Undefined = older API: keep both.)
	onView: r.has_sections || r.has_pdf !== false
		? () => window.open(`/reports/${r.slug ?? r.id}`, '_blank', 'noopener')
		: undefined,
	onDownload: r.can_download !== false ? () => void downloadReport(r.slug ?? r.id) : undefined,
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
