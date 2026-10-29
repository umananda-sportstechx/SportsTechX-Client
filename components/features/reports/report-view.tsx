'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import useSWR from 'swr';
import { ArrowLeft } from 'lucide-react';
import { qk } from '@/lib/query-keys';
import { Loading, Empty } from '@/components/atlas';
import type { ReportDetail, Section } from './report-kit/types';
import { ReportPage } from './report-page';

// PDF reports read in-app; PDF.js loads only when one is opened.
const PdfReportView = dynamic(() => import('./pdf-report-view').then((m) => m.PdfReportView), {
	ssr: false,
	loading: () => <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}><Loading /></div>,
});

/**
 * Chrome-less report page (no Atlas shell). Fetches the report + its section
 * feed and the viewer's dark/light choice, then hands them to `ReportPage`
 * (theming, sticky nav, sections with reveal-on-scroll) — the same component
 * the admin editor's preview renders.
 */
export function ReportView({ slug }: { slug: string }) {
	const detail = useSWR<ReportDetail>(qk.reports.detail(slug));
	// A PDF report has no section feed — don't ask for one.
	const sections = useSWR<{ data: Section[] }>(detail.data?.has_sections ? qk.reports.sections(slug) : null);

	const defaultDark = detail.data?.theme?.default_dark ?? true;
	const [isDark, setIsDark] = useState(defaultDark);
	const [touched, setTouched] = useState(false);
	// Adopt the report's default theme until the viewer toggles; then persist.
	useEffect(() => {
		if (touched) return;
		try { const s = localStorage.getItem(`rk-theme:${slug}`); if (s) { setIsDark(s === 'dark'); setTouched(true); return; } } catch { /* ignore */ }
		setIsDark(defaultDark);
	}, [defaultDark, slug, touched]);
	const toggle = () => {
		const next = !isDark;
		setIsDark(next); setTouched(true);
		try { localStorage.setItem(`rk-theme:${slug}`, next ? 'dark' : 'light'); } catch { /* ignore */ }
	};

	if (detail.isLoading || sections.isLoading) return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}><Loading /></div>;
	if (!detail.data) return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}><Empty>Report not found. <Link href="/reports">Back to reports</Link></Empty></div>;
	if (!detail.data.has_sections) return <PdfReportView slug={slug} report={detail.data} />;

	return (
		<ReportPage
			sections={sections.data?.data ?? []}
			theme={detail.data.theme}
			isDark={isDark}
			onToggleDark={toggle}
			back={<Link href="/reports" className="rk-iconbtn" aria-label="Back to reports" title="Back to reports"><ArrowLeft size={16} /></Link>}
			empty={<Empty>This report has no content yet.</Empty>}
		/>
	);
}
