'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { ReportErrorBoundary } from '@/components/features/reports/gster26/error-boundary';
import { GSTER26_DEFAULTS } from '@/components/features/reports/gster26/content-defaults';

const ReportGSTER26 = dynamic(
	() => import('@/components/features/reports/gster26/report-gster26'),
	{ ssr: false, loading: () => <div style={{ minHeight: '100vh', background: '#0c0f1a' }} /> },
);

/** Only the admin panel may drive this page (and only it may frame it — next.config). */
const ADMIN_ORIGIN = process.env.NEXT_PUBLIC_ADMIN_URL ?? 'https://admin.sportstechx.com';
const allowed = (origin: string) => origin === ADMIN_ORIGIN || /^http:\/\/localhost(:\d+)?$/.test(origin);

/**
 * The admin editor's live preview of the GSTER26 report: the real report
 * component, rendered from the draft content the editor posts in — not from
 * the database — so every keystroke shows exactly as it will on
 * /reports/gster26. Shows nothing until the editor has sent content.
 *
 * Messages (from the framing admin window only):
 *   → { type: 'gster26:hello' }            ← { type: 'gster26:ready', defaults }
 *   → { type: 'gster26:content', content } re-render with this content
 *   → { type: 'gster26:jump', anchor }     scroll to a part (e.g. '#peak2026')
 */
export default function Gster26PreviewPage() {
	const [content, setContent] = useState<Record<string, unknown> | null>(null);
	const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

	useEffect(() => {
		const jump = (anchor: string) => {
			timers.current.forEach(clearTimeout);
			// The report lazy-loads parts and lays out after mount; re-aim as it settles.
			timers.current = [0, 400, 1200].map((ms) => setTimeout(() => window.dispatchEvent(new CustomEvent('gster26:jump', { detail: anchor })), ms));
		};
		const onMessage = (e: MessageEvent) => {
			if (e.source !== window.parent || !allowed(e.origin)) return;
			const m = e.data as { type?: string; content?: unknown; anchor?: unknown };
			if (m?.type === 'gster26:hello') window.parent.postMessage({ type: 'gster26:ready', defaults: GSTER26_DEFAULTS }, e.origin);
			else if (m?.type === 'gster26:content' && m.content && typeof m.content === 'object') setContent(m.content as Record<string, unknown>);
			else if (m?.type === 'gster26:jump' && typeof m.anchor === 'string' && /^#[\w-]+$/.test(m.anchor)) jump(m.anchor);
		};
		window.addEventListener('message', onMessage);
		// Announce once listening — the editor's hello can arrive before this page
		// has hydrated. The embedding page's origin comes from the referrer.
		try {
			const parentOrigin = document.referrer ? new URL(document.referrer).origin : '';
			if (window.parent !== window && allowed(parentOrigin)) window.parent.postMessage({ type: 'gster26:ready', defaults: GSTER26_DEFAULTS }, parentOrigin);
		} catch { /* no usable referrer: the editor's hello still works */ }
		return () => { window.removeEventListener('message', onMessage); timers.current.forEach(clearTimeout); };
	}, []);

	if (!content) return <div style={{ minHeight: '100vh', background: '#0c0f1a' }} />;
	return (
		<ReportErrorBoundary>
			<ReportGSTER26 content={content} preview />
		</ReportErrorBoundary>
	);
}
