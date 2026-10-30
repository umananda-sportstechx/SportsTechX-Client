'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { ReportErrorBoundary } from '@/components/features/reports/gster26/error-boundary';
import { BENCHMARK26_DEFAULTS } from '@/components/features/reports/benchmark26/content-defaults';

const ReportBenchmark26 = dynamic(
	() => import('@/components/features/reports/benchmark26/report-benchmark26'),
	{ ssr: false, loading: () => <div style={{ minHeight: '100vh', background: '#2d3b49' }} /> },
);

/** Only the admin panel may drive this page (and only it may frame it — next.config). */
const ADMIN_ORIGIN = process.env.NEXT_PUBLIC_ADMIN_URL ?? 'https://admin.sportstechx.com';
const allowed = (origin: string) => origin === ADMIN_ORIGIN || /^http:\/\/localhost(:\d+)?$/.test(origin);

/**
 * The admin editor's live preview of the VC Deal Sourcing Benchmark: the real report
 * component rendered from the draft content the editor posts in. Same protocol
 * as /report-preview/gster26, with the `investors-survey26:` prefix:
 *   → investors-survey26:hello  ← investors-survey26:ready { defaults }
 *   → investors-survey26:content { content }   → investors-survey26:jump { anchor }
 */
export default function Benchmark26PreviewPage() {
	const [content, setContent] = useState<Record<string, unknown> | null>(null);
	const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

	useEffect(() => {
		const jump = (anchor: string) => {
			timers.current.forEach(clearTimeout);
			// The report lazy-loads parts and lays out after mount; re-aim as it settles.
			timers.current = [0, 400, 1200].map((ms) => setTimeout(() => document.querySelector(anchor)?.scrollIntoView({ block: 'start' }), ms));
		};
		const onMessage = (e: MessageEvent) => {
			if (e.source !== window.parent || !allowed(e.origin)) return;
			const m = e.data as { type?: string; content?: unknown; anchor?: unknown };
			if (m?.type === 'investors-survey26:hello') window.parent.postMessage({ type: 'investors-survey26:ready', defaults: BENCHMARK26_DEFAULTS }, e.origin);
			else if (m?.type === 'investors-survey26:content' && m.content && typeof m.content === 'object') setContent(m.content as Record<string, unknown>);
			else if (m?.type === 'investors-survey26:jump' && typeof m.anchor === 'string' && /^#[\w-]+$/.test(m.anchor)) jump(m.anchor);
		};
		window.addEventListener('message', onMessage);
		// Announce once listening — the editor's hello can arrive before this page has hydrated.
		try {
			const parentOrigin = document.referrer ? new URL(document.referrer).origin : '';
			if (window.parent !== window && allowed(parentOrigin)) window.parent.postMessage({ type: 'investors-survey26:ready', defaults: BENCHMARK26_DEFAULTS }, parentOrigin);
		} catch { /* no usable referrer: the editor's hello still works */ }
		return () => { window.removeEventListener('message', onMessage); timers.current.forEach(clearTimeout); };
	}, []);

	if (!content) return <div style={{ minHeight: '100vh', background: '#2d3b49' }} />;
	return (
		<ReportErrorBoundary resetKey={content}>
			<ReportBenchmark26 content={content} preview />
		</ReportErrorBoundary>
	);
}
