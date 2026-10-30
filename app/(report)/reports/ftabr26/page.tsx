'use client';

import dynamic from 'next/dynamic';
import { ReportErrorBoundary } from '@/components/features/reports/gster26/error-boundary';

// The ported STX Football Tech & Business Report: fully client-side and self-
// chromed (particle canvas, gsap/ScrollTrigger, Lenis), so it mounts client-only.
// A static `ftabr26` segment takes priority over `[slug]`.
const ReportFTABR26 = dynamic(
	() => import('@/components/features/reports/ftabr26/report-ftabr26'),
	{ ssr: false, loading: () => <div style={{ minHeight: '100vh', background: '#2d3b49' }} /> },
);

export default function Ftabr26ReportPage() {
	return (
		// If edited content breaks the page, readers get the report with its original content instead.
		<ReportErrorBoundary fallback={<ReportErrorBoundary><ReportFTABR26 content={{}} /></ReportErrorBoundary>}>
			<ReportFTABR26 />
		</ReportErrorBoundary>
	);
}
