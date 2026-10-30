'use client';

import dynamic from 'next/dynamic';
import { ReportErrorBoundary } from '@/components/features/reports/gster26/error-boundary';

// The ported STX VC Deal Sourcing Benchmark, same URL as on STX. Client-only
// (it reads the reader's theme from localStorage on first render).
const ReportBenchmark26 = dynamic(() => import('@/components/features/reports/benchmark26/report-benchmark26'), { ssr: false });

export default function Benchmark26Page() {
	return (
		// If edited content breaks the page, readers get the report with its published copy instead.
		<ReportErrorBoundary fallback={<ReportErrorBoundary><ReportBenchmark26 content={{}} /></ReportErrorBoundary>}>
			<ReportBenchmark26 />
		</ReportErrorBoundary>
	);
}
