'use client';

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Loader2 } from 'lucide-react';
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';

// pdf.js worker (matches the bundled pdfjs-dist version).
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export interface DeckHighlight { page: number; quote?: string | null; nonce: number }

interface Box { left: number; top: number; width: number; height: number }

/** Lowercase, strip punctuation to spaces — tolerant matching so quotes hit even
 *  when spacing/symbols ($, =, commas) differ from the PDF's text layer. */
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

function DeckViewerImpl({ fileUrl, highlight }: { fileUrl: string; highlight: DeckHighlight | null }) {
	const containerRef = useRef<HTMLDivElement>(null);
	const pageEls = useRef<Map<number, HTMLDivElement>>(new Map());
	const ready = useRef<Set<number>>(new Set());
	const [numPages, setNumPages] = useState(0);
	const [width, setWidth] = useState(0);
	const [boxes, setBoxes] = useState<{ page: number; rects: Box[] }>({ page: 0, rects: [] });

	// Measure once on mount, then only on WINDOW resize (debounced). We avoid a
	// ResizeObserver on the container on purpose: expanding the app's side-nav
	// changes the container width and would otherwise re-rasterize every page
	// (the "goes white / reloads" flicker). Page width stays put on nav toggles.
	useEffect(() => {
		const measure = () => { const el = containerRef.current; if (el && el.clientWidth) setWidth(el.clientWidth); };
		measure();
		let t: ReturnType<typeof setTimeout>;
		const onResize = () => { clearTimeout(t); t = setTimeout(measure, 250); };
		window.addEventListener('resize', onResize);
		return () => { window.removeEventListener('resize', onResize); clearTimeout(t); };
	}, []);

	const computeBoxes = useCallback((page: number, quote?: string | null) => {
		const wrap = pageEls.current.get(page);
		const q = quote ? norm(quote) : '';
		if (!wrap || !q) { setBoxes({ page: 0, rects: [] }); return; }
		const layer = wrap.querySelector('.react-pdf__Page__textContent');
		if (!layer) { setBoxes({ page: 0, rects: [] }); return; }
		const spans = Array.from(layer.querySelectorAll('span')) as HTMLSpanElement[];
		let concat = '';
		const ranges: Array<{ span: HTMLSpanElement; start: number; end: number }> = [];
		for (const sp of spans) {
			const txt = norm(sp.textContent ?? '');
			if (!txt) continue;
			const start = concat.length;
			concat += txt + ' ';
			ranges.push({ span: sp, start, end: concat.length });
		}
		// Try the full quote; fall back to its first ~6 words (handles paraphrase/truncation).
		let idx = concat.indexOf(q);
		let needle = q;
		if (idx === -1) {
			const short = q.split(' ').slice(0, 6).join(' ');
			if (short.length >= 8) { idx = concat.indexOf(short); needle = short; }
		}
		if (idx === -1) { setBoxes({ page: 0, rects: [] }); return; }
		const end = idx + needle.length;
		const wrapRect = wrap.getBoundingClientRect();
		const rects: Box[] = [];
		for (const r of ranges) {
			if (r.end <= idx || r.start >= end) continue;
			const b = r.span.getBoundingClientRect();
			rects.push({ left: b.left - wrapRect.left, top: b.top - wrapRect.top, width: b.width, height: b.height });
		}
		setBoxes({ page, rects });
	}, []);

	useEffect(() => {
		if (!highlight) { setBoxes({ page: 0, rects: [] }); return; }
		const wrap = pageEls.current.get(highlight.page);
		wrap?.scrollIntoView({ behavior: 'smooth', block: 'start' });
		if (ready.current.has(highlight.page)) {
			const t = setTimeout(() => computeBoxes(highlight.page, highlight.quote), 220);
			return () => clearTimeout(t);
		}
		return undefined;
	}, [highlight, computeBoxes]);

	const onTextReady = (page: number) => {
		ready.current.add(page);
		if (highlight && highlight.page === page) computeBoxes(page, highlight.quote);
	};

	const pageWidth = width ? Math.min(width - 24, 1100) : undefined;

	return (
		<div ref={containerRef} className="ai-thin-scroll h-full overflow-y-auto bg-muted/30">
			<Document
				file={fileUrl}
				onLoadSuccess={(d) => setNumPages(d.numPages)}
				loading={<div className="flex h-full items-center justify-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading deck…</div>}
				error={<div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">Couldn&apos;t render the PDF in-app.</div>}
			>
				{Array.from({ length: numPages }, (_, i) => i + 1).map((n) => (
					<div key={n} ref={(el) => { if (el) pageEls.current.set(n, el); }} className="relative mx-auto my-2 w-fit shadow-sm">
						<Page pageNumber={n} width={pageWidth} onRenderTextLayerSuccess={() => onTextReady(n)} />
						{boxes.page === n && boxes.rects.map((b, bi) => (
							<div key={bi} className="pointer-events-none absolute rounded-sm bg-yellow-300/40 ring-1 ring-yellow-500/70" style={{ left: b.left, top: b.top, width: b.width, height: b.height }} />
						))}
					</div>
				))}
			</Document>
		</div>
	);
}

// Memoized: streaming markdown updates in the parent must NOT re-render (and
// re-rasterize) the PDF. Only a new file or highlight target re-renders.
export const DeckViewer = memo(DeckViewerImpl, (a, b) =>
	a.fileUrl === b.fileUrl && a.highlight?.nonce === b.highlight?.nonce);
