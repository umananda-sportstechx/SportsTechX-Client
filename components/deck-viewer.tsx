'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Loader2 } from 'lucide-react';
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';

// pdf.js worker (matches the bundled pdfjs-dist version).
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

/** A focus target: scroll to `page` and highlight `quote` on it. `nonce` lets the
 *  same target re-trigger (clicking the same finding twice). */
export interface DeckHighlight { page: number; quote?: string | null; nonce: number }

interface Box { left: number; top: number; width: number; height: number }

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ');

export function DeckViewer({ fileUrl, highlight }: { fileUrl: string; highlight: DeckHighlight | null }) {
	const containerRef = useRef<HTMLDivElement>(null);
	const pageEls = useRef<Map<number, HTMLDivElement>>(new Map());
	const ready = useRef<Set<number>>(new Set());
	const [numPages, setNumPages] = useState(0);
	const [width, setWidth] = useState(0);
	const [boxes, setBoxes] = useState<{ page: number; rects: Box[] }>({ page: 0, rects: [] });

	useEffect(() => {
		const el = containerRef.current;
		if (!el) return;
		const ro = new ResizeObserver(() => setWidth(el.clientWidth));
		ro.observe(el);
		setWidth(el.clientWidth);
		return () => ro.disconnect();
	}, []);

	// Match a verbatim quote against the rendered text-layer spans and compute
	// highlight rectangles (relative to the page wrapper). Whole covering spans are
	// highlighted — slightly generous but visually clean. No-op if the quote isn't
	// found (e.g. an image-only page with no selectable text).
	const computeBoxes = useCallback((page: number, quote?: string | null) => {
		const wrap = pageEls.current.get(page);
		const q = quote ? norm(quote).trim() : '';
		if (!wrap || !q) { setBoxes({ page: 0, rects: [] }); return; }
		const layer = wrap.querySelector('.react-pdf__Page__textContent');
		if (!layer) { setBoxes({ page: 0, rects: [] }); return; }
		const spans = Array.from(layer.querySelectorAll('span')) as HTMLSpanElement[];
		let concat = '';
		const ranges: Array<{ span: HTMLSpanElement; start: number; end: number }> = [];
		for (const sp of spans) {
			const txt = norm(sp.textContent ?? '');
			if (!txt.trim()) continue;
			const start = concat.length;
			concat += txt + ' ';
			ranges.push({ span: sp, start, end: concat.length });
		}
		const idx = concat.indexOf(q);
		if (idx === -1) { setBoxes({ page: 0, rects: [] }); return; }
		const end = idx + q.length;
		const wrapRect = wrap.getBoundingClientRect();
		const rects: Box[] = [];
		for (const r of ranges) {
			if (r.end <= idx || r.start >= end) continue;
			const b = r.span.getBoundingClientRect();
			rects.push({ left: b.left - wrapRect.left, top: b.top - wrapRect.top, width: b.width, height: b.height });
		}
		setBoxes({ page, rects });
	}, []);

	// On a new highlight: scroll to the page; compute boxes once its text layer is ready.
	useEffect(() => {
		if (!highlight) { setBoxes({ page: 0, rects: [] }); return; }
		const wrap = pageEls.current.get(highlight.page);
		wrap?.scrollIntoView({ behavior: 'smooth', block: 'start' });
		if (ready.current.has(highlight.page)) {
			const t = setTimeout(() => computeBoxes(highlight.page, highlight.quote), 200);
			return () => clearTimeout(t);
		}
		return undefined;
	}, [highlight, computeBoxes]);

	const onTextReady = (page: number) => {
		ready.current.add(page);
		if (highlight && highlight.page === page) computeBoxes(page, highlight.quote);
	};

	const pageWidth = width ? Math.min(width - 24, 1000) : undefined;

	return (
		<div ref={containerRef} className="h-full overflow-y-auto bg-muted/30">
			<Document
				file={fileUrl}
				onLoadSuccess={(d) => setNumPages(d.numPages)}
				loading={<div className="flex h-full items-center justify-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading deck…</div>}
				error={<div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">Couldn&apos;t render the PDF in-app.</div>}
			>
				{Array.from({ length: numPages }, (_, i) => i + 1).map((n) => (
					<div
						key={n}
						ref={(el) => { if (el) pageEls.current.set(n, el); }}
						className="relative mx-auto my-2 w-fit shadow-sm"
					>
						<Page pageNumber={n} width={pageWidth} onRenderTextLayerSuccess={() => onTextReady(n)} />
						{boxes.page === n && boxes.rects.map((b, bi) => (
							<div
								key={bi}
								className="pointer-events-none absolute rounded-sm bg-yellow-300/40 ring-1 ring-yellow-500/70"
								style={{ left: b.left, top: b.top, width: b.width, height: b.height }}
							/>
						))}
					</div>
				))}
			</Document>
		</div>
	);
}
