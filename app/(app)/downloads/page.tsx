'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { Download } from 'lucide-react';
import { qk } from '@/lib/query-keys';
import { Page, Empty } from '@/components/ui/atoms';

interface DownloadRow {
	id: string;
	report_id: string;
	report_title: string;
	report_slug: string | null;
	report_short_title: string | null;
	downloaded_at: string;
}

export default function DownloadsPage() {
	const { data, isLoading } = useSWR<{ data: DownloadRow[] }>(qk.me.downloads(), {
		dedupingInterval: 5 * 60_000,
	});
	const rows = data?.data ?? [];

	return (
		<Page>
			<div style={{ marginBottom: 'var(--space-5)' }}>
				<div style={{
					fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-muted)',
					textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6,
				}}>
					Account · {rows.length.toLocaleString()} downloads
				</div>
				<h1 style={{
					fontFamily: 'var(--font-display)', fontSize: 38, fontWeight: 800,
					letterSpacing: '-0.02em', lineHeight: 1, margin: '0 0 6px',
				}}>
					Downloads
				</h1>
				<p style={{ fontSize: 14, color: 'var(--fg-2)', margin: 0 }}>
					Reports you&apos;ve opened or downloaded.
				</p>
			</div>

			{isLoading && rows.length === 0 ? (
				<Empty msg="Loading…" />
			) : rows.length === 0 ? (
				<Empty msg="You haven't downloaded any reports yet." />
			) : (
				<div className="card">
					<table className="data-table">
						<thead>
							<tr>
								<th>Report</th>
								<th>Code</th>
								<th>Date</th>
								<th style={{ textAlign: 'right' }}></th>
							</tr>
						</thead>
						<tbody>
							{rows.map((r) => (
								<tr key={r.id}>
									<td>
										<Link href={`/reports/${r.report_slug ?? r.report_id}`} style={{ fontWeight: 600 }}>
											{r.report_title}
										</Link>
									</td>
									<td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fg-muted)' }}>
										{r.report_short_title ?? '—'}
									</td>
									<td className="num">{formatDate(r.downloaded_at)}</td>
									<td style={{ textAlign: 'right' }}>
										<Link href={`/reports/${r.report_slug ?? r.report_id}`} className="btn ghost">
											<Download size={12} /> Open
										</Link>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</Page>
	);
}

function formatDate(iso: string): string {
	if (!iso) return '—';
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return '—';
	return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
