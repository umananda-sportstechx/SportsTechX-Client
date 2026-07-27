'use client';

import { useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { ArrowRight, Check, Loader2, ExternalLink } from 'lucide-react';
import { Page, SectionHead, Empty } from '@/components/ui/atoms';
import { WorkspaceHeader } from '@/components/copilot/workspace-ui';
import { qk } from '@/lib/query-keys';

/**
 * FounderCompany (f-company) — the founder's own profile + Locker Room report
 * (the legacy "Verified Company Report"). Wired to:
 *   - GET /api/claims/mine          → the company claim (profile + verify state)
 *   - GET /api/verified-reports/mine → the generated Locker Room report
 * The report is generated server-side once the company claim is verified.
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
interface ClaimRow {
	id: string;
	claim_type: string;
	target_name_snapshot: string;
	target_website_snapshot: string | null;
	is_verified: boolean;
	created_at: string;
}

/** Prefer a ready report; otherwise the most recently updated one. */
function pickReport(reports: VerifiedReport[]): VerifiedReport | null {
	if (reports.length === 0) return null;
	const ready = reports.filter((r) => r.status === 'ready');
	const pool = ready.length > 0 ? ready : reports;
	return [...pool].sort((a, b) => (b.updated_at ?? '').localeCompare(a.updated_at ?? ''))[0] ?? null;
}

export default function FounderCompanyPage() {
	const { data: reports, isLoading: reportsLoading } = useSWR<VerifiedReport[]>(qk.verifiedReports.mine());
	const { data: claims } = useSWR<ClaimRow[]>(qk.claims.mine());
	const [open, setOpen] = useState(false);

	const companyClaim = (claims ?? []).find((c) => c.claim_type === 'company') ?? null;
	const report = pickReport(reports ?? []);
	const rd = report?.report_data ?? null;
	const companyName = rd?.company?.name ?? companyClaim?.target_name_snapshot ?? null;
	const website = rd?.company?.website ?? companyClaim?.target_website_snapshot ?? null;
	const verified = companyClaim?.is_verified ?? false;
	const initials = (companyName ?? 'My company').split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();

	return (
		<Page>
			<WorkspaceHeader
				eyebrow="Fundraising Copilot · My company"
				title="My company"
				sub="The profile the ecosystem sees — keep it accurate, verified and raise-ready."
			/>

			{!companyClaim ? (
				<div className="card" style={{ padding: 'var(--space-5)' }}>
					<Empty msg="You haven't claimed a company yet. Claim and verify it to generate your Locker Room report." />
					<div style={{ marginTop: 12, textAlign: 'center' }}>
						<Link href="/get-verified" className="btn">Claim your company <ArrowRight size={12} /></Link>
					</div>
				</div>
			) : (
				<div className="grid-2">
					{/* Profile */}
					<div className="card">
						<SectionHead title="Profile" meta={verified ? 'Verified' : 'Under review'} />
						<div style={{ padding: 'var(--space-4)' }}>
							<div className="cp-co-row">
								<div style={{ width: 56, height: 56, background: 'var(--accent)', color: 'var(--accent-fg)', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 20 }}>{initials}</div>
								<div>
									<div className="cp-co-name" style={{ fontSize: 18 }}>{companyName}</div>
									<div className="cp-co-meta">
										{[rd?.company?.city, rd?.company?.country].filter(Boolean).join(', ') || (website ?? '—')}
									</div>
								</div>
							</div>
							{rd?.company?.description && (
								<p style={{ fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.55, marginBottom: 16 }}>{rd.company.description}</p>
							)}
							<div className="cp-verify-bar">
								<Check size={18} />
								<div>
									<b>{verified ? 'Verified profile' : 'Verification pending'}</b>
									<span>{verified ? 'Data shown to investors comes from you.' : 'Your claim is being reviewed — the report generates once verified.'}</span>
								</div>
								<Link href="/get-verified" className="btn ghost">Edit</Link>
							</div>
						</div>
					</div>

					{/* Locker Room report */}
					<div className="card">
						<SectionHead title="Locker Room report" meta="diligence-ready" />
						<div style={{ padding: 'var(--space-4)' }}>
							{reportsLoading ? (
								<div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
							) : !report ? (
								<p style={{ fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.55 }}>
									{verified
										? 'Your report is queued — check back shortly.'
										: 'Your Locker Room report generates automatically once your company claim is verified.'}
								</p>
							) : report.status === 'pending' ? (
								<div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Generating your Locker Room report…</div>
							) : report.status === 'failed' ? (
								<p style={{ fontSize: 13, color: 'var(--destructive)' }}>Report generation failed. Our team can re-run it — please contact support.</p>
							) : (
								<>
									{rd?.marketOverview?.headline && (
										<p style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>{rd.marketOverview.headline}</p>
									)}
									<div className="cp-locker-stats">
										<div><b>{rd?.investors?.length ?? 0}</b><span>relevant investors</span></div>
										<div><b>{rd?.competitors?.length ?? 0}</b><span>competitors mapped</span></div>
										<div><b>{rd?.ecosystem?.length ?? 0}</b><span>programs & events</span></div>
									</div>
									<button className="btn cp-full" onClick={() => setOpen((v) => !v)}>
										{open ? 'Hide report' : 'Open Locker Room report'} <ArrowRight size={12} />
									</button>
								</>
							)}
						</div>
					</div>
				</div>
			)}

			{/* Expanded report body */}
			{open && rd && (
				<div className="card" style={{ marginTop: 'var(--space-4)' }}>
					<SectionHead title="Market overview" />
					<div style={{ padding: 'var(--space-4)' }}>
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
