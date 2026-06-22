'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { ArrowRight } from 'lucide-react';
import { Page, SectionHead, Tag, Empty } from '@/components/ui/atoms';
import { WorkspaceHeader, FitBar } from '@/components/copilot/workspace-ui';
import { qk } from '@/lib/query-keys';

/**
 * FounderBenchmarks (f-benchmarks) — the founder's company vs its sector cohort
 * on observable funding signals (total raised, rounds, latest round, age), with
 * cohort medians + percentiles. Wired to GET /api/recommendations/benchmarks.
 * Exit comps come from the live acquisitions feed.
 */

interface BenchMetric { key: string; label: string; unit: 'usd' | 'count' | 'years'; value: number | null; median: number | null; percentile: number | null }
interface BenchPeer { id: string; name: string; slug: string | null; total_raised: number; last_round: string | null; country: string | null }
interface BenchResponse {
	company: { id: string; name: string } | null;
	reason?: 'no_company_claim';
	cohort: { sector: string | null; n: number };
	metrics: BenchMetric[];
	peers: BenchPeer[];
}
interface AcqRow { id: string; acquiree_name?: string | null; acquirer_name?: string | null; acquisition_year?: number | string | null; amount_usd?: number | string | null }
interface AcqResponse { data: AcqRow[] }

function fmtUsd(v: number | null): string {
	if (v == null || v <= 0) return '—';
	if (v >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(1)}B`;
	if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
	if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
	return `$${v.toFixed(0)}`;
}
function fmtMetric(m: BenchMetric): string {
	if (m.value == null) return '—';
	if (m.unit === 'usd') return fmtUsd(m.value);
	if (m.unit === 'years') return `${m.value} yr${m.value === 1 ? '' : 's'}`;
	return String(m.value);
}
function fmtMedian(m: BenchMetric): string {
	if (m.median == null) return 'no cohort data';
	if (m.unit === 'usd') return `vs ${fmtUsd(m.median)} median`;
	if (m.unit === 'years') return `vs ${Math.round(m.median)} yr median`;
	return `vs ${Math.round(m.median)} median`;
}

export default function FounderBenchmarksPage() {
	const { data, isLoading } = useSWR<BenchResponse>(qk.benchmarks());
	const { data: acq } = useSWR<AcqResponse>(qk.acquisitions.list({ sort: '-amount_usd', disclosed_only: true, limit: 4 }), { dedupingInterval: 10 * 60_000 });

	const company = data?.company;
	const metrics = data?.metrics ?? [];
	const peers = data?.peers ?? [];
	const exits = acq?.data ?? [];

	return (
		<Page>
			<WorkspaceHeader
				eyebrow="Fundraising Copilot · Benchmarks"
				title="Benchmarks"
				sub={company
					? `How ${company.name} sits against its sector cohort on the funding signals investors can see.`
					: 'How your company sits against its sector cohort on observable funding signals.'}
			/>

			{isLoading ? (
				<div className="card" style={{ padding: 'var(--space-5)' }}><Empty msg="Computing benchmarks…" /></div>
			) : !company ? (
				<div className="card" style={{ padding: 'var(--space-5)' }}>
					<Empty msg="Claim and verify your company to see how it benchmarks against its cohort." />
					<div style={{ marginTop: 12, textAlign: 'center' }}>
						<Link href="/get-verified" className="btn">Get verified <ArrowRight size={12} /></Link>
					</div>
				</div>
			) : (
				<>
					<div className="card" style={{ marginBottom: 'var(--space-5)' }}>
						<SectionHead title="Your metrics vs cohort" meta={data?.cohort.sector ? `${data.cohort.sector} · n=${data.cohort.n}` : `n=${data?.cohort.n ?? 0}`} />
						<div style={{ padding: 'var(--space-4)' }}>
							{data && data.cohort.n < 2 && (
								<p style={{ fontSize: 12.5, color: 'var(--fg-muted)', marginBottom: 12 }}>
									Too few comparable companies in this sector for a meaningful cohort yet — showing your raw figures.
								</p>
							)}
							{metrics.map((m) => (
								<div key={m.key} className="bm-row bm-row-lg">
									<div className="bm-metric">{m.label}</div>
									<div className="bm-vals"><b>{fmtMetric(m)}</b><span>{fmtMedian(m)}</span></div>
									<div className="bm-bar">{m.percentile != null ? <FitBar pct={m.percentile} /> : <span style={{ fontSize: 11, color: 'var(--fg-muted)' }}>—</span>}</div>
									<div className="bm-pct">{m.percentile != null ? <>{m.percentile}<small>pct</small></> : '—'}</div>
								</div>
							))}
						</div>
					</div>

					<div className="grid-2">
						<div className="card">
							<SectionHead title="Top funded in your sector" meta="cohort" />
							{peers.length === 0 ? (
								<div style={{ padding: 'var(--space-4)' }}><Empty msg="No cohort peers yet." /></div>
							) : (
								<table className="data-table">
									<thead>
										<tr><th>Company</th><th>Last round</th><th style={{ textAlign: 'right' }}>Raised</th></tr>
									</thead>
									<tbody>
										{peers.map((c) => (
											<tr key={c.id}>
												<td style={{ fontWeight: 700 }}><Link href={`/companies/${c.slug ?? c.id}`}>{c.name}</Link></td>
												<td>{c.last_round ? <Tag variant="pos">{c.last_round}</Tag> : '—'}</td>
												<td className="num" style={{ textAlign: 'right', fontWeight: 700 }}>{fmtUsd(c.total_raised)}</td>
											</tr>
										))}
									</tbody>
								</table>
							)}
						</div>

						<div className="card">
							<SectionHead title="Exit comps" meta="recent M&A" />
							{exits.length === 0 ? (
								<div style={{ padding: 'var(--space-4)' }}><Empty msg="No disclosed exits yet." /></div>
							) : (
								<table className="data-table">
									<thead>
										<tr><th>Target</th><th>Acquirer</th><th>Year</th><th style={{ textAlign: 'right' }}>Value</th></tr>
									</thead>
									<tbody>
										{exits.map((e) => (
											<tr key={e.id}>
												<td style={{ fontWeight: 700 }}>{e.acquiree_name ?? '—'}</td>
												<td style={{ color: 'var(--fg-muted)' }}>{e.acquirer_name ?? '—'}</td>
												<td className="num">{e.acquisition_year ?? '—'}</td>
												<td className="num" style={{ textAlign: 'right', fontWeight: 700 }}>{fmtUsd(e.amount_usd == null ? null : Number(e.amount_usd))}</td>
											</tr>
										))}
									</tbody>
								</table>
							)}
						</div>
					</div>
				</>
			)}
		</Page>
	);
}
