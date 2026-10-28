'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { Document, Page, pdfjs } from 'react-pdf';
import { ArrowLeft, Download, Minus, Plus, Maximize2 } from 'lucide-react';
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import { qk } from '@/lib/query-keys';
import { downloadReport } from '@/lib/report-pdf';
import { track } from '@/lib/analytics';
import { Loading } from '@/components/atlas';
import type { ReportDetail } from './report-kit/types';
import './pdf-report-view.css';

pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

interface Version { id: string; language_code: string | null; access_tier: string }

const GAP = 16;          // px between pages
const AHEAD = 3;         // pages rendered either side of the one in view
const MAX_WIDTH = 1100;  // "fit width" never stretches past this
const ZOOMS = [0.5, 0.75, 1, 1.25, 1.5, 2];

// Pro beats Lite when the plan allows both; English first among languages.
const rank = (v: Version) => (v.access_tier === 'explore' ? 0 : 1) * 10 + (v.language_code === 'en' ? 1 : 0);
const label = (v: Version) => `${v.access_tier === 'explore' ? 'Lite' : 'Pro'}${v.language_code ? ` · ${v.language_code.toUpperCase()}` : ''}`;

/**
 * A PDF report read inside Atlas. The file comes from a short-lived signed URL
 * minted per visit (tier-gated server-side) and is never put in the address bar,
 * so the link people share is this page — which asks for a login and the plan.
 * It doesn't stop a determined reader saving the bytes; the server gate does
 * the protecting. Pages render around the one in view, so long reports stay light.
 */
export function PdfReportView({ slug, report }: { slug: string; report: ReportDetail }) {
	const versions = useSWR<Version[]>(qk.reports.versions(slug), { revalidateOnFocus: false });
	const sorted = useMemo(() => [...(versions.data ?? [])].sort((a, b) => rank(b) - rank(a)), [versions.data]);
	const [picked, setPicked] = useState<string | null>(null);
	const versionId = picked ?? sorted[0]?.id ?? null;
	// One URL per visit and version: re-minting would reload the document.
	const file = useSWR<{ url: string }>(versionId ? qk.reports.pdfUrl(versionId, 'viewer') : null,
		{ revalidateOnFocus: false, revalidateOnReconnect: false, revalidateIfStale: false, shouldRetryOnError: false });

	const wrapRef = useRef<HTMLDivElement>(null);
	const [boxWidth, setBoxWidth] = useState(0);
	useEffect(() => {
		const el = wrapRef.current;
		if (!el) return;
		// Ignore a 0: the box reads 0 wide while a Suspense boundary above hides it,
		// and dropping to the spinner then would throw the loaded document away.
		const ro = new ResizeObserver(() => { if (el.clientWidth > 0) setBoxWidth(el.clientWidth); });
		ro.observe(el);
		return () => ro.disconnect();
	}, []);
	const [zoom, setZoom] = useState(1);
	const width = Math.max(240, Math.floor(Math.min(boxWidth - 32, MAX_WIDTH) * zoom));

	const [pages, setPages] = useState(0);
	const [ratio, setRatio] = useState(1.414); // A4 until the first page says otherwise
	const [current, setCurrent] = useState(1);
	const pageH = width * ratio + GAP;
	const pagesTop = useRef(0);

	// Which page is in view, from the scroll position (pages share the first page's ratio).
	useEffect(() => {
		if (!pages) return;
		const onScroll = () => {
			const y = window.scrollY + window.innerHeight * 0.3 - pagesTop.current;
			setCurrent(Math.min(pages, Math.max(1, Math.floor(y / pageH) + 1)));
		};
		onScroll();
		window.addEventListener('scroll', onScroll, { passive: true });
		return () => window.removeEventListener('scroll', onScroll);
	}, [pages, pageH]);

	const goTo = (n: number) => window.scrollTo({ top: pagesTop.current + (n - 1) * pageH - 72, behavior: 'smooth' });
	const tracked = useRef(false);
	const v = sorted.find((x) => x.id === versionId);

	const noAccess = (versions.data && !sorted.length) || (file.error as { status?: number } | undefined)?.status === 404;
	const toolbar = (
		<header className="pdfv-bar">
			<Link href="/reports" className="pdfv-back" aria-label="Back to reports"><ArrowLeft size={16} /><span className="pdfv-hide-sm">Reports</span></Link>
			<div className="pdfv-title">{report.title}</div>
			{sorted.length > 1 && (
				<select className="pdfv-select" value={versionId ?? ''} onChange={(e) => { setPicked(e.target.value); setPages(0); tracked.current = false; }} aria-label="Edition">
					{sorted.map((x) => <option key={x.id} value={x.id}>{label(x)}</option>)}
				</select>
			)}
			{pages > 0 && <span className="pdfv-count">{current} / {pages}</span>}
			<div className="pdfv-zoom pdfv-hide-sm">
				<button type="button" aria-label="Zoom out" disabled={zoom <= ZOOMS[0]} onClick={() => setZoom(ZOOMS[Math.max(0, ZOOMS.indexOf(zoom) - 1)])}><Minus size={14} /></button>
				<span>{Math.round(zoom * 100)}%</span>
				<button type="button" aria-label="Zoom in" disabled={zoom >= ZOOMS[ZOOMS.length - 1]} onClick={() => setZoom(ZOOMS[Math.min(ZOOMS.length - 1, ZOOMS.indexOf(zoom) + 1)])}><Plus size={14} /></button>
				<button type="button" aria-label="Fit to width" disabled={zoom === 1} onClick={() => setZoom(1)}><Maximize2 size={14} /></button>
			</div>
			{versionId && !noAccess && (
				<button type="button" className="atlas-btn atlas-btn--outline atlas-btn--sm" onClick={() => { track('Report Downloaded', { slug, edition: v && label(v) }); void downloadReport(slug, versionId); }}>
					<Download size={13} /><span className="pdfv-hide-sm">Download</span>
				</button>
			)}
		</header>
	);

	let body: React.ReactNode;
	if (noAccess) {
		body = (
			<div className="pdfv-msg">
				<h2>This report is part of a paid plan</h2>
				<p>Upgrade to read {report.title}.</p>
				<div className="pdfv-msg-actions"><Link className="atlas-btn atlas-btn--primary" href="/billing">See plans</Link><Link className="atlas-btn atlas-btn--ghost" href="/reports">Back to reports</Link></div>
			</div>
		);
	} else if (versions.error || file.error) {
		body = <div className="pdfv-msg"><h2>This report couldn&apos;t be opened</h2><p>Please try again in a moment.</p><div className="pdfv-msg-actions"><button type="button" className="atlas-btn atlas-btn--primary" onClick={() => { void versions.mutate(); void file.mutate(); }}>Try again</button></div></div>;
	} else if (!file.data || !boxWidth) {
		body = <div className="pdfv-msg"><Loading /></div>;
	} else {
		body = (
			<Document
				key={file.data.url}
				file={file.data.url}
				loading={<div className="pdfv-msg"><Loading /></div>}
				error={<div className="pdfv-msg"><h2>This report couldn&apos;t be opened</h2><p>Please try again, or download it instead.</p></div>}
				onLoadSuccess={async (pdf) => {
					setPages(pdf.numPages);
					const vp = (await pdf.getPage(1)).getViewport({ scale: 1 });
					setRatio(vp.height / vp.width);
					if (!tracked.current) { tracked.current = true; track('Report Viewed', { slug, edition: v && label(v), pages: pdf.numPages, format: 'pdf' }); }
				}}
				onItemClick={({ pageNumber }) => goTo(pageNumber)}
			>
				<div ref={(el) => { if (el) pagesTop.current = el.getBoundingClientRect().top + window.scrollY; }}>
					{Array.from({ length: pages }, (_, i) => {
						const n = i + 1;
						const near = Math.abs(n - current) <= AHEAD;
						return (
							<div key={n} className="pdfv-page" style={{ width, minHeight: width * ratio, marginBottom: GAP }} data-page={n}>
								{/* Each page suspends while it loads; without its own boundary the
								    page-level one hid the whole reader (display:none) for a frame,
								    the document collapsed and scroll snapped back to page 1. */}
								{near && <Suspense fallback={null}><Page pageNumber={n} width={width} loading={null} renderTextLayer renderAnnotationLayer /></Suspense>}
							</div>
						);
					})}
				</div>
			</Document>
		);
	}

	return (
		<div className="atlas pdfv">
			{toolbar}
			<div ref={wrapRef} className="pdfv-body">{body}</div>
		</div>
	);
}
