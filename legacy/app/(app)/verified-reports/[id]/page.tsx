'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import useSWR from 'swr';
import { ArrowRight, Loader2, ExternalLink } from 'lucide-react';
import { Page, SectionHead, Empty, PageTitle } from '@/components/ui/atoms';
import { qk } from '@/lib/query-keys';

/**
 * Standalone view for a single Verified Company ("Locker Room") report — the
 * target of the "View report" button in the verified_report_ready email
 * (`/verified-reports/{id}`). Owner-or-admin gated by the API; renders the same
 * report_data shape shown on /copilot/company.
 */
interface ReportData {
	company?: { name?: string; website?: string; description?: string; sector?: string; country?: string; city?: string };
	investors?: Array<{ id?: string; name?: string; category?: string; dealsCount?: number }>;
	competitors?: Array<{ id?: string; name?: string; website?: string; business_model?: string }>;
	ecosystem?: Array<{ kind?: string; name?: string; category?: string }>;
	marketOverview?: { headline?: string; bullets?: string[]; paragraphs?: string[] };
}
interface VerifiedReport {
	id: string;
	status: string;
	company_website: string | null;
	error: string | null;
	report_data: ReportData | null;
	created_at: string;
	updated_at: string;
}

export default function VerifiedReportPage() {
	const params = useParams();
	const id = String((params as { id?: string })?.id ?? '');
	const { data: report, isLoading, error } = useSWR<VerifiedReport>(
		id ? qk.verifiedReports.detail(id) : null,
		{ shouldRetryOnError: false },
	);

	const rd = report?.report_data ?? null;
	const companyName = rd?.company?.name ?? 'Verified company report';

	return (
		<Page>
			<PageTitle kicker="Locker Room · Verified report" title={companyName} />

			{isLoading ? (
				<div className="card" style={{ padding: 'var(--space-5)' }}>
					<div className="flex items-center gap-2 text-sm text-muted-foreground">
						<Loader2 className="h-4 w-4 animate-spin" /> Loading report…
					</div>
				</div>
			) : error || !report ? (
				<div className="card" style={{ padding: 'var(--space-5)' }}>
					<Empty msg="This report isn't available. It may have moved, or you need to sign in with the account that submitted the verification claim." />
					<div style={{ marginTop: 12, textAlign: 'center' }}>
						<Link href="/copilot/company" className="btn">Go to my company <ArrowRight size={12} /></Link>
					</div>
				</div>
			) : report.status === 'pending' ? (
				<div className="card" style={{ padding: 'var(--space-5)' }}>
					<div className="flex items-center gap-2 text-sm text-muted-foreground">
						<Loader2 className="h-4 w-4 animate-spin" /> Your report is still generating — check back shortly.
					</div>
				</div>
			) : report.status === 'failed' ? (
				<div className="card" style={{ padding: 'var(--space-5)' }}>
					<p style={{ fontSize: 13, color: 'var(--destructive, #dc2626)' }}>
						Report generation failed. Our team can re-run it — please contact support.
					</p>
				</div>
			) : !rd ? (
				<div className="card" style={{ padding: 'var(--space-5)' }}>
					<Empty msg="No report content yet." />
				</div>
			) : (
				<>
					<div className="card" style={{ marginBottom: 'var(--space-4)' }}>
						<SectionHead title="Company" meta="Verified" />
						<div style={{ padding: 'var(--space-4)' }}>
							<div style={{ fontWeight: 700, fontSize: 18 }}>{rd.company?.name ?? '—'}</div>
							<div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 2 }}>
								{[rd.company?.sector, rd.company?.city, rd.company?.country].filter(Boolean).join(' · ')
									|| (rd.company?.website ?? report.company_website ?? '')}
							</div>
							{rd.company?.description && (
								<p style={{ fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.55, marginTop: 12 }}>{rd.company.description}</p>
							)}
						</div>
					</div>

					<div className="card">
						<SectionHead title="Market overview" />
						<div style={{ padding: 'var(--space-4)' }}>
							{rd.marketOverview?.headline && (
								<p style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>{rd.marketOverview.headline}</p>
							)}
							{rd.marketOverview?.paragraphs?.map((p, i) => (
								<p key={i} style={{ fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.6, marginBottom: 10 }}>{p}</p>
							))}
							{(rd.marketOverview?.bullets?.length ?? 0) > 0 && (
								<ul style={{ margin: '4px 0 16px', paddingLeft: 18 }}>
									{rd.marketOverview!.bullets!.map((b, i) => (
										<li key={i} style={{ fontSize: 13, color: 'var(--fg-2)', marginBottom: 4 }}>{b}</li>
									))}
								</ul>
							)}

							<ReportList title="Relevant investors" items={(rd.investors ?? []).map((x) => ({
								key: x.id ?? x.name ?? '', name: x.name ?? '—',
								sub: [x.category, x.dealsCount != null ? `${x.dealsCount} deals` : null].filter(Boolean).join(' · '),
								href: x.id ? `/investors/${x.id}` : undefined,
							}))} />
							<ReportList title="Competitors" items={(rd.competitors ?? []).map((x) => ({
								key: x.id ?? x.name ?? '', name: x.name ?? '—', sub: x.business_model ?? '',
								href: x.id ? `/companies/${x.id}` : undefined, ext: x.website ?? undefined,
							}))} />
							<ReportList title="Programs & events" items={(rd.ecosystem ?? []).map((x) => ({
								key: x.name ?? '', name: x.name ?? '—', sub: [x.kind, x.category].filter(Boolean).join(' · '),
							}))} />
						</div>
					</div>
				</>
			)}
		</Page>
	);
}

function ReportList({ title, items }: { title: string; items: Array<{ key: string; name: string; sub?: string; href?: string; ext?: string }> }) {
	if (items.length === 0) return null;
	return (
		<div style={{ marginBottom: 18 }}>
			<div className="co-stat-label" style={{ marginBottom: 8 }}>{title}</div>
			{items.map((it) => (
				<div key={it.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
					<div style={{ flex: 1, minWidth: 0 }}>
						<div style={{ fontSize: 13, fontWeight: 600 }}>
							{it.href ? <Link href={it.href} className="ai-link">{it.name}</Link> : it.name}
						</div>
						{it.sub && <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{it.sub}</div>}
					</div>
					{it.ext && (
						<a href={it.ext.startsWith('http') ? it.ext : `https://${it.ext}`} target="_blank" rel="noopener noreferrer" className="btn ghost" aria-label="Website">
							<ExternalLink size={12} />
						</a>
					)}
				</div>
			))}
		</div>
	);
}
