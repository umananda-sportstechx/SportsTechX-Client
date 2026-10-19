'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { ArrowLeft, Moon, Sun } from 'lucide-react';
import { qk } from '@/lib/query-keys';
import { Loading, Empty } from '@/components/atlas';
import { resolveTheme } from './report-kit/report-theme';
import { useReveal } from './report-kit/use-reveal';
import type { ReportDetail, Section } from './report-kit/types';
import { SectionRenderer } from './section-renderer';
import './report-kit/report-kit.css';

/**
 * Chrome-less report page (no Atlas shell). Fetches the report + its section
 * feed, themes the whole page from `reports.theme` via --rk-* CSS vars, renders
 * the report's own sticky nav (anchors + dark/light + back-to-hub), and streams
 * the sections through SectionRenderer with reveal-on-scroll.
 */
export function ReportView({ slug }: { slug: string }) {
	const detail = useSWR<ReportDetail>(qk.reports.detail(slug));
	const sections = useSWR<{ data: Section[] }>(qk.reports.sections(slug));

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

	const t = resolveTheme(isDark, detail.data?.theme);
	const vars = useMemo<CSSProperties>(() => ({
		'--rk-bg': t.bg, '--rk-bg-sec': t.bgSec, '--rk-bg-card': t.bgCard, '--rk-bg-card-hover': t.bgCardHover,
		'--rk-fg': t.text, '--rk-fg-sec': t.textSec, '--rk-fg-muted': t.textMuted,
		'--rk-border': t.border, '--rk-title': t.titleColor, '--rk-nav-bg': t.navBg,
		'--rk-divider': t.divider, '--rk-row-alt': t.tableRowAlt, '--rk-accent': t.accent,
		...(detail.data?.theme?.font_display ? { '--rk-font-display': detail.data.theme.font_display } : {}),
		...(detail.data?.theme?.font_mono ? { '--rk-font-mono': detail.data.theme.font_mono } : {}),
	} as CSSProperties), [t, detail.data?.theme]);

	if (detail.isLoading || sections.isLoading) return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}><Loading /></div>;
	if (!detail.data) return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}><Empty>Report not found. <Link href="/reports">Back to reports</Link></Empty></div>;

	const rows = sections.data?.data ?? [];
	const anchors = rows.filter((s) => s.title && s.slug).map((s) => ({ slug: s.slug as string, title: s.title as string }));

	return (
		<div className="rk-report" style={vars}>
			<nav className="rk-nav">
				<Link href="/reports" className="rk-iconbtn" aria-label="Back to reports" title="Back to reports"><ArrowLeft size={16} /></Link>
				<div className="rk-nav__links">
					{anchors.map((a) => (
						<button key={a.slug} type="button" className="rk-nav__link" onClick={() => document.getElementById(a.slug)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>{a.title}</button>
					))}
				</div>
				<button type="button" className="rk-iconbtn" aria-label="Toggle theme" title="Toggle theme" onClick={toggle}>{isDark ? <Sun size={15} /> : <Moon size={15} />}</button>
			</nav>

			{rows.length === 0
				? <div className="rk-section"><Empty>This report has no content yet.</Empty></div>
				: rows.map((s) => (s.kind === 'hero' ? <SectionRenderer key={s.id} section={s} /> : <Reveal key={s.id}><SectionRenderer section={s} /></Reveal>))}
		</div>
	);
}

function Reveal({ children }: { children: React.ReactNode }) {
	const { ref, shown } = useReveal<HTMLDivElement>();
	return <div ref={ref} className={`rk-reveal${shown ? ' is-shown' : ''}`}>{children}</div>;
}
