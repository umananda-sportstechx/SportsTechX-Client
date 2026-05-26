'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import useSWR from 'swr';
import { ArrowLeft, Heart, Plus, Send } from 'lucide-react';
import { qk } from '@/lib/query-keys';
import {
	Page, Logo, Flag, SectorPill, Tag, Empty,
	VerifiedBadge, RaisingPill, KV,
} from '@/components/ui/atoms';

/**
 * Company detail — ported from ui_design_2/app/company-detail.jsx CompanyDetailScreen.
 *
 * Layout:
 *   - Back link
 *   - Hero (logo + name + verified/raising badges + meta + actions)
 *   - Tabs: Overview / Funding / M&A / News / Similar
 *   - Overview = main content + right rail (Key facts, Primary contact when present)
 *   - Other tabs render full-width
 *   - Footer: Verified strip OR claim-this-company CTA
 *
 * Data source: `/api/companies/:idOrSlug` + `/api/deals?company_id=`. Tabs hide
 * themselves when their data array is empty. Acquisitions / News / Similar
 * default to API fields when present; we never fabricate.
 */

interface Company {
	id: string;
	name: string;
	slug?: string;
	description?: string | null;
	long_description?: string | null;
	website?: string | null;
	primary_sector?: string | null;
	primary_sector_slug?: string | null;
	sub_sector?: string | null;
	hq_city?: string | null;
	hq_country?: string | null;
	country_code?: string | null;
	founded_year?: number | null;
	employees?: number | string | null;
	total_funding_usd?: number | string | null;
	stage?: string | null;
	last_round?: string | null;
	is_verified?: boolean | null;
	is_actively_raising?: boolean | null;
	verified_at?: string | null;
	tags?: string[] | null;
}

interface Deal {
	id: string;
	announced_date?: string | null;
	amount_usd?: number | string | null;
	round_type_name?: string | null;
	round_type?: string | null;
	lead_investor?: string | null;
}

interface DealsResponse { data: Deal[]; total: number }

type Tab = 'overview' | 'funding' | 'mna' | 'news' | 'similar';

export default function CompanyDetailPage() {
	const params = useParams<{ slug: string }>();
	const slug = params?.slug ?? '';
	const [tab, setTab] = useState<Tab>('overview');

	const { data: company, isLoading, error } = useSWR<Company>(
		slug ? qk.companies.detail(slug) : null,
		{ dedupingInterval: 5 * 60_000 },
	);

	const { data: dealsResp } = useSWR<DealsResponse>(
		company?.id ? qk.deals.list({ company_id: company.id, limit: 30, sort: '-announced_date' }) : null,
		{ dedupingInterval: 5 * 60_000 },
	);

	const deals = useMemo(() => dealsResp?.data ?? [], [dealsResp]);

	if (isLoading) {
		return <Page><Empty msg="Loading company…" /></Page>;
	}
	if (error || !company || !company.id) {
		return (
			<Page>
				<Link href="/companies" className="co-back">
					<ArrowLeft size={12} /> Back to companies
				</Link>
				<Empty msg="Company not found" />
			</Page>
		);
	}

	const cc = company.country_code ?? (company.hq_country ? countryCode(company.hq_country) : '');
	const hq = [company.hq_city, company.hq_country].filter(Boolean).join(', ');
	const isVerified = company.is_verified === true;
	const isRaising = company.is_actively_raising === true;
	const hasFunding = deals.length > 0;

	const visibleTabs: Array<{ key: Tab; label: string; count?: number; show: boolean }> = [
		{ key: 'overview', label: 'Overview', show: true },
		{ key: 'funding', label: 'Funding', count: deals.length, show: hasFunding },
		{ key: 'mna', label: 'M&A', show: false },         // wire when /api/acquisitions?acquirer_id= lands
		{ key: 'news', label: 'News', show: false },        // wire when /api/news?company_id= lands
		{ key: 'similar', label: 'Similar companies', show: false }, // wire when /api/companies/:id/similar lands
	];

	return (
		<Page>
			<Link href="/companies" className="co-back">
				<ArrowLeft size={12} /> Back to companies
			</Link>

			{/* Hero */}
			<header className="co-hero">
				<Logo co={{ name: company.name }} size={72} />
				<div style={{ flex: 1, minWidth: 0 }}>
					<div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
						<h1
							style={{
								fontFamily: 'var(--font-display)',
								fontSize: 38,
								fontWeight: 800,
								letterSpacing: '-0.02em',
								lineHeight: 1,
								margin: 0,
							}}
						>
							{company.name}
						</h1>
						{isVerified && <VerifiedBadge size={22} />}
						{isRaising && <RaisingPill />}
					</div>
					{company.description && (
						<p style={{ margin: '8px 0 10px', fontSize: 15, color: 'var(--fg-2)', maxWidth: 720 }}>
							{company.description}
						</p>
					)}
					<div className="co-hero-meta">
						{(cc || hq) && (
							<span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
								{cc && <Flag cc={cc} />}
								{hq || '—'}
							</span>
						)}
						{company.founded_year && (
							<>
								<span className="dot-sep">·</span>
								<span>Founded {company.founded_year}</span>
							</>
						)}
						{company.employees && (
							<>
								<span className="dot-sep">·</span>
								<span>{company.employees} employees</span>
							</>
						)}
						{company.website && (
							<>
								<span className="dot-sep">·</span>
								<a href={company.website} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>
									{company.website.replace(/^https?:\/\//, '')} ↗
								</a>
							</>
						)}
					</div>
				</div>
				<div className="co-hero-actions">
					<button className="btn ghost"><Heart size={12} /> Save</button>
					<button className="btn ghost"><Send size={12} /> Share</button>
					<button className="btn"><Plus size={12} /> Add to watchlist</button>
				</div>
			</header>

			{/* Tabs */}
			<nav className="co-page-tabs" role="tablist">
				{visibleTabs.filter((t) => t.show).map((t) => (
					<button
						key={t.key}
						role="tab"
						aria-selected={tab === t.key}
						className={`co-page-tab ${tab === t.key ? 'on' : ''}`}
						onClick={() => setTab(t.key)}
					>
						{t.label}
						{t.count != null && t.count > 0 && <span className="co-page-tab-count">{t.count}</span>}
					</button>
				))}
			</nav>

			{/* Tab body */}
			{tab === 'overview' ? (
				<div className="co-page-grid">
					<main className="co-page-main">
						<Overview company={company} deals={deals} />
					</main>
					<aside className="co-page-rail">
						<div className="card co-rail-card">
							<div className="co-rail-h">Key facts</div>
							<KV label="Total raised" value={<b>{formatDollars(company.total_funding_usd)}</b>} />
							<KV label="Last round" value={company.last_round ?? '—'} />
							<KV label="Stage" value={company.stage ? <Tag>{company.stage}</Tag> : '—'} />
							<KV
								label="Sector"
								value={company.primary_sector ? <SectorPill name={company.primary_sector} /> : '—'}
							/>
							{company.sub_sector && <KV label="Sub-sector" value={company.sub_sector} />}
							<KV label="Founded" value={company.founded_year ?? '—'} />
							{company.employees && <KV label="Employees" value={company.employees} />}
							<KV label="Tags" value={(company.tags ?? []).join(', ') || '—'} />
						</div>
					</aside>
				</div>
			) : (
				<div className="co-page-main">
					{tab === 'funding' && <Funding company={company} deals={deals} />}
				</div>
			)}

			{/* Verify footer */}
			<VerifyFooter company={company} />
		</Page>
	);
}

function Overview({ company, deals }: { company: Company; deals: Deal[] }) {
	return (
		<>
			<section className="co-sec">
				<h3 className="co-sec-h">About</h3>
				<p style={{ fontSize: 14, lineHeight: 1.65, color: 'var(--fg-2)' }}>
					{company.long_description ?? company.description ?? 'No description on file yet.'}
				</p>
			</section>

			{deals.length > 0 && (
				<section className="co-sec">
					<h3 className="co-sec-h">Funding timeline</h3>
					<FundingTimeline deals={deals} />
				</section>
			)}
		</>
	);
}

function Funding({ company, deals }: { company: Company; deals: Deal[] }) {
	if (deals.length === 0) {
		return (
			<section className="co-sec">
				<h3 className="co-sec-h">Funding rounds</h3>
				<div className="co-empty">No funding rounds on record yet.</div>
			</section>
		);
	}
	return (
		<section className="co-sec">
			<h3 className="co-sec-h">Funding rounds</h3>

			<div className="co-stat-strip">
				<div className="co-mini-stat">
					<div className="co-mini-stat-l">Total raised</div>
					<div className="co-mini-stat-v">{formatDollars(company.total_funding_usd)}</div>
				</div>
				<div className="co-mini-stat">
					<div className="co-mini-stat-l">Latest round</div>
					<div className="co-mini-stat-v">{company.stage ?? '—'}</div>
				</div>
				<div className="co-mini-stat">
					<div className="co-mini-stat-l">Rounds</div>
					<div className="co-mini-stat-v">{deals.length}</div>
				</div>
				<div className="co-mini-stat">
					<div className="co-mini-stat-l">Last close</div>
					<div className="co-mini-stat-v" style={{ fontSize: 14, fontFamily: 'var(--font-mono)' }}>
						{deals[0]?.announced_date ? formatShortDate(deals[0].announced_date) : '—'}
					</div>
				</div>
			</div>

			<h4 className="co-sec-sub">Round detail</h4>
			<div className="card" style={{ padding: 0 }}>
				<table className="data-table">
					<thead>
						<tr>
							<th>Date</th>
							<th>Stage</th>
							<th>Lead investor</th>
							<th style={{ textAlign: 'right' }}>Amount</th>
						</tr>
					</thead>
					<tbody>
						{deals.map((r) => {
							const round = r.round_type_name ?? r.round_type ?? '—';
							return (
								<tr key={r.id}>
									<td className="num">{r.announced_date ? formatShortDate(r.announced_date) : '—'}</td>
									<td><Tag variant={round.toLowerCase().includes('series') ? 'pos' : ''}>{round}</Tag></td>
									<td>{r.lead_investor ?? '—'}</td>
									<td className="num" style={{ textAlign: 'right', fontWeight: 700 }}>
										{formatDollars(r.amount_usd)}
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>
		</section>
	);
}

function FundingTimeline({ deals }: { deals: Deal[] }) {
	// Oldest → newest, max 4 for the strip
	const rounds = [...deals].reverse().slice(-4);
	return (
		<div className="co-timeline">
			{rounds.map((r) => (
				<div key={r.id} className="co-timeline-step">
					<div className="co-timeline-dot" />
					<div className="co-timeline-stage">{r.round_type_name ?? r.round_type ?? '—'}</div>
					<div className="co-timeline-amt">{formatDollars(r.amount_usd)}</div>
					<div className="co-timeline-date">
						{r.announced_date ? formatShortDate(r.announced_date) : '—'}
					</div>
				</div>
			))}
		</div>
	);
}

function VerifyFooter({ company }: { company: Company }) {
	if (company.is_verified) {
		return (
			<footer className="co-verify-foot verified" aria-label="Verified profile">
				<VerifiedBadge size={22} />
				<div className="co-verify-text">
					<div className="co-verify-h">Verified profile</div>
					<div className="co-verify-sub">
						Claimed and maintained by {company.name}
						{company.verified_at ? ` · last reviewed ${formatShortDate(company.verified_at)}` : ''}
					</div>
				</div>
				<div className="co-verify-actions">
					<button className="btn ghost">Report an issue</button>
				</div>
			</footer>
		);
	}
	return (
		<footer className="co-verify-foot unverified" aria-label="Get verified">
			<div className="co-verify-icon">
				<svg width="22" height="22" viewBox="0 0 16 16" aria-hidden="true">
					<path
						d="M8 1.2l1.6 1.4 2.1-.2.5 2 1.8 1.1-.9 1.9.5 2.1-1.9.9-.8 2-2.1-.4L8 13.5l-1.6-1.4-2.1.4-.8-2-1.9-.9.5-2.1L1.2 5.5l1.8-1.1.5-2 2.1.2L7.2 1.2z"
						stroke="currentColor"
						strokeWidth="1.3"
						fill="none"
						strokeLinejoin="round"
					/>
				</svg>
			</div>
			<div className="co-verify-text">
				<div className="co-verify-h">Is this your company?</div>
				<div className="co-verify-sub">
					Claim {company.name} to keep your funding, stage and contact details accurate — and earn a verified badge on your profile.
				</div>
			</div>
			<div className="co-verify-actions">
				<button className="btn">Claim &amp; verify</button>
			</div>
		</footer>
	);
}

function formatDollars(value: number | string | null | undefined): string {
	if (value == null) return '—';
	const n = typeof value === 'string' ? Number(value) : value;
	if (!Number.isFinite(n) || n <= 0) return '—';
	if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
	if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
	if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
	return `$${n.toFixed(0)}`;
}

function formatShortDate(iso: string): string {
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return iso;
	return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
}

function countryCode(countryName: string): string {
	const map: Record<string, string> = {
		'United States': 'US', USA: 'US', 'United Kingdom': 'GB', UK: 'GB',
		Germany: 'DE', France: 'FR', Italy: 'IT', Spain: 'ES', Netherlands: 'NL',
		'The Netherlands': 'NL', Sweden: 'SE', Switzerland: 'CH', Belgium: 'BE',
		Austria: 'AT', Poland: 'PL', India: 'IN', China: 'CN', Japan: 'JP',
		Singapore: 'SG', Australia: 'AU', Brazil: 'BR', Canada: 'CA', Portugal: 'PT',
	};
	return map[countryName] ?? countryName.slice(0, 2).toUpperCase();
}
