'use client';

import dynamic from 'next/dynamic';
import { ReportErrorBoundary } from '@/components/features/reports/gster26/error-boundary';

// The ported STX flagship is a fully client-side, self-chromed report (particle
// canvas, gsap/ScrollTrigger, Lenis smooth-scroll, Next-incompatible SSR). Mount
// it client-only; a static `gster26` segment takes priority over `[slug]`, so
// this overrides the generic section renderer for this one report (Phase 1).
const ReportGSTER26 = dynamic(
	() => import('@/components/features/reports/gster26/report-gster26'),
	{ ssr: false, loading: () => <div style={{ minHeight: '100vh', background: '#0c0f1a' }} /> },
);

export default function Gster26ReportPage() {
	return (
		<ReportErrorBoundary>
			<ReportGSTER26 />
		</ReportErrorBoundary>
	);
}
