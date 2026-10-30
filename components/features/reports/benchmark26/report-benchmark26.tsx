"use client";

import useSWR from "swr";
import { qk } from "@/lib/query-keys";
import PublicReport, { type PublicReportData } from "./public-report";
import { BENCHMARK26_DEFAULTS } from "./content-defaults";

/**
 * The Sports Tech VC Deal Sourcing Benchmark 2026 — its document lives in
 * reports.content (slug `investors-survey26`), each top-level block
 * (`meta`, `intro`, `sections`, `closing`, `methodology`) over the published
 * JSON the STX app shipped. `content` (the admin preview's draft) skips the fetch.
 */
export default function ReportBenchmark26({ content }: { content?: Record<string, unknown> | null; preview?: boolean } = {}) {
	const { data: doc } = useSWR<{ content?: Record<string, unknown> | null }>(content !== undefined ? null : qk.reports.detail("investors-survey26"));
	const ov = (content !== undefined ? content : doc?.content) ?? {};
	const data = { ...BENCHMARK26_DEFAULTS } as Record<string, unknown>;
	for (const k of Object.keys(BENCHMARK26_DEFAULTS)) if (ov[k] !== undefined && ov[k] !== null) data[k] = ov[k];
	return <PublicReport data={data as unknown as PublicReportData} />;
}
