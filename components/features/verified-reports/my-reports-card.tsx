'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { Card } from '@/components/atlas';
import { ago } from '@/components/features/market/format';
import { qk } from '@/lib/query-keys';

/**
 * The caller's verified-company reports, on the Get Verified page.
 *
 * `/verified-reports/mine` had no caller, so the report a verified claim
 * generates was reachable only from the email — and that link went to a page
 * that did not exist. This gives the report a findable home in the product.
 *
 * Renders nothing when there are none: a report only exists once a claim has
 * been verified, so an empty state here would be noise for most visitors.
 */
interface ReportRow {
	id: string;
	status: string;
	company_website: string | null;
	created_at: string;
}

const STATUS: Record<string, string> = {
	ready: 'Ready',
	pending: 'Queued',
	running: 'Generating',
	error: 'Failed',
};

export function MyReportsCard() {
	const { data } = useSWR<ReportRow[]>(qk.verifiedReports.mine());
	const rows = data ?? [];
	if (rows.length === 0) return null;

	return (
		<Card style={{ maxWidth: 640, marginTop: 20 }}>
			<div style={{ fontSize: 16, fontFamily: 'var(--a-font)', fontWeight: 700, color: 'var(--a-ink)', marginBottom: 6 }}>
				Your reports
			</div>
			<p style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--a-muted)', margin: '0 0 16px' }}>
				A market report is generated for each company you verify.
			</p>
			<div style={{ display: 'grid', gap: 10 }}>
				{rows.map((r) => {
					const label = (r.company_website ?? 'Your company').replace(/^https?:\/\//i, '').replace(/\/$/, '');
					const meta = `${STATUS[r.status] ?? r.status} · ${ago(r.created_at)}`;
					// Only a finished report is worth opening; the page explains the
					// other states, but a link to a queued one just reads as broken.
					return r.status === 'ready' ? (
						<Link
							key={r.id}
							href={`/verified-reports/${r.id}`}
							style={{ display: 'block', padding: '11px 13px', borderRadius: 'var(--a-radius-sm)', background: 'var(--a-inset)', textDecoration: 'none' }}
						>
							<span style={{ display: 'block', fontSize: 13, color: 'var(--a-ink)' }}>{label}</span>
							<span style={{ display: 'block', fontFamily: 'var(--a-mono)', fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--a-faint)', marginTop: 3 }}>{meta}</span>
						</Link>
					) : (
						<div key={r.id} style={{ padding: '11px 13px', borderRadius: 'var(--a-radius-sm)', background: 'var(--a-inset)' }}>
							<span style={{ display: 'block', fontSize: 13, color: 'var(--a-muted)' }}>{label}</span>
							<span style={{ display: 'block', fontFamily: 'var(--a-mono)', fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--a-faint)', marginTop: 3 }}>{meta}</span>
						</div>
					);
				})}
			</div>
		</Card>
	);
}
