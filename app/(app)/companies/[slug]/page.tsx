'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import { ArrowLeft, ExternalLink, Heart, Link2, Plus, Send } from 'lucide-react';
import { qk } from '@/lib/query-keys';
import { useFavorite } from '@/hooks/use-favorite';
import {
	Page, Logo, Flag, Tag, Empty, AudiencePill,
	VerifiedBadge, RaisingPill, KV,
} from '@/components/ui/atoms';
import { WatchlistPicker } from '@/components/ui/watchlist-picker';

/**
 * Company detail — pixel-aligned to `ui_design_2/app/company-detail.jsx`
 * CompanyDetailScreen.
 *
 * Layout:
 *   1. Back link
 *   2. Hero (logo + name + verified/raising badges + meta + actions)
 *   3. Tabs: Overview / Funding / M&A / Similar — hide tabs with no data
 *   4. Overview = main content + right rail (Key facts)
 *   5. Verify footer (verified strip OR claim-this-company CTA)
 *
 * Data: `/api/companies/:idOrSlug` (enriched with sector, location, primary
 * sport, last-round and deal counts via joins) + `/api/deals?company_id=` +
 * `/api/acquisitions?acquiree_company_id=` + similar-sector companies.
 */

interface Company {
	id: string;
	name: string;
	slug?: string | null;
	description?: string | null;
	website?: string | null;
	custom_logo_url?: string | null;
	primary_sector?: string | null;
	primary_sector_slug?: string | null;
	primary_sport?: string | null;
	hq_city?: string | null;
	hq_country?: string | null;
	hq_region?: string | null;
	founded_year?: number | null;
	total_funding_usd?: number | string | null;
	business_model?: string | null;
	last_round_type?: string | null;
	last_deal_date?: string | null;
	deal_count?: number | null;
	is_verified?: boolean | null;
	is_actively_raising?: boolean | null;
	is_unicorn?: boolean | null;
	updated_at?: string | null;
}

interface Deal {
	id: string;
	announced_date?: string | null;
	amount_usd?: number | string | null;
	round_type_name?: string | null;
	round_type?: string | null;
	lead_investor?: string | null;
}

interface Acquisition {
	id: string;
	acquisition_date?: string | null;
	amount_usd?: number | string | null;
	acquirer_name?: string | null;
	acquiree_name?: string | null;
	acquisition_type?: string | null;
}

interface DealsResponse { data: Deal[]; total: number }
interface AcqResponse { data: Acquisition[]; total: number }
interface SimilarCompany {
	id: string;
	name: string;
	slug?: string | null;
	description?: string | null;
	primary_sector?: string | null;
	hq_country?: string | null;
	total_funding_usd?: number | string | null;
	website?: string | null;
	custom_logo_url?: string | null;
}

interface NewsItem {
	id: string;
	title: string;
	url: string | null;
	source: string | null;
	summary: string | null;
	published_at: string | null;
}

interface TeamMember {
	id: string;
	full_name: string;
	title: string | null;
	linkedin_url: string | null;
	photo_url: string | null;
	is_founder: boolean;
}

type Tab = 'overview' | 'funding' | 'mna' | 'news' | 'team' | 'similar';

export default function CompanyDetailPage() {
	const params = useParams<{ slug: string }>();
	const router = useRouter();
	const slug = params?.slug ?? '';
	const [tab, setTab] = useState<Tab>('overview');
	const [shareToast, setShareToast] = useState<string | null>(null);
	const [pickerOpen, setPickerOpen] = useState(false);

	const { data: company, isLoading, error } = useSWR<Company>(
		slug && slug !== 'undefined' ? qk.companies.detail(slug) : null,
		{ dedupingInterval: 5 * 60_000 },
	);

	const fav = useFavorite('companies', company?.id);

	const { data: dealsResp } = useSWR<DealsResponse>(
		company?.id ? qk.deals.list({ company_id: company.id, limit: 30, sort: '-announced_date' }) : null,
		{ dedupingInterval: 5 * 60_000 },
	);
	const deals = useMemo(() => dealsResp?.data ?? [], [dealsResp]);

	const { data: acqResp } = useSWR<AcqResponse>(
		company?.id ? ['/api/acquisitions', { acquiree_company_id: company.id, limit: 20 }] as const : null,
		{ dedupingInterval: 5 * 60_000 },
	);
	const acquisitions = useMemo(() => acqResp?.data ?? [], [acqResp]);

	const { data: newsResp } = useSWR<NewsItem[]>(
		company?.slug || company?.id ? qk.companies.news((company.slug ?? company.id) as string) : null,
		{ dedupingInterval: 10 * 60_000 },
	);
	const news = useMemo(() => newsResp ?? [], [newsResp]);

	const { data: teamResp } = useSWR<TeamMember[]>(
		company?.slug || company?.id ? qk.companies.team((company.slug ?? company.id) as string) : null,
		{ dedupingInterval: 10 * 60_000 },
	);
	const team = useMemo(() => teamResp ?? [], [teamResp]);

	const { data: similarResp } = useSWR<SimilarCompany[]>(
		company?.slug || company?.id ? qk.companies.similar((company.slug ?? company.id) as string) : null,
		{ dedupingInterval: 10 * 60_000 },
	);
	const similar = useMemo(
		() => (similarResp ?? []).filter((c) => c.id !== company?.id).slice(0, 6),
		[similarResp, company?.id],
	);

	const onShare = async () => {
		if (!company) return;
		const target = company.slug ?? company.id;
		const url = `${window.location.origin}/companies/${target}`;
		try {
			await navigator.clipboard.writeText(url);
			setShareToast('Link copied');
			setTimeout(() => setShareToast(null), 1800);
		} catch {
			setShareToast('Copy failed');
			setTimeout(() => setShareToast(null), 1800);
		}
	};

	if (isLoading) {
		return <Page><Empty msg="Loading company…" /></Page>;
	}
	if (error || !company || !company.id || slug === 'undefined') {
		return (
			<Page>
				<Link href="/companies" className="co-back">
					<ArrowLeft size={12} /> Back to companies
				</Link>
				<Empty msg="Company not found" />
			</Page>
		);
	}

	const cc = company.hq_country ? countryCode(company.hq_country) : '';
	const hq = [company.hq_city, company.hq_country].filter(Boolean).join(', ');
	const isVerified = company.is_verified === true;
	const isRaising = company.is_actively_raising === true;

	const visibleTabs: Array<{ key: Tab; label: string; count?: number; show: boolean }> = [
		{ key: 'overview', label: 'Overview', show: true },
		{ key: 'funding', label: 'Funding', count: deals.length, show: deals.length > 0 },
		{ key: 'mna', label: 'M&A', count: acquisitions.length, show: acquisitions.length > 0 },
		{ key: 'team', label: 'Team', count: team.length, show: team.length > 0 },
		{ key: 'news', label: 'News', count: news.length, show: news.length > 0 },
		{ key: 'similar', label: 'Similar companies', count: similar.length, show: similar.length > 0 },
	];

	return (
		<Page>
			<Link href="/companies" className="co-back">
				<ArrowLeft size={12} /> Back to companies
			</Link>

			{/* Hero */}
			<header className="co-hero">
				<Logo co={{ name: company.name, website: company.website, custom_logo_url: company.custom_logo_url }} size={72} />
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
						{company.is_unicorn && (
							<Tag variant="pos">🦄 Unicorn</Tag>
						)}
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
						{company.primary_sport && (
							<>
								<span className="dot-sep">·</span>
								<span>{company.primary_sport}</span>
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
					<button
						className="btn ghost"
						disabled={fav.pending}
						onClick={() => void fav.toggle()}
						aria-pressed={fav.isFavorite}
					>
						<Heart
							size={12}
							style={fav.isFavorite ? { color: 'var(--accent)', fill: 'currentColor' } : undefined}
						/>
						{fav.isFavorite ? 'Saved' : 'Save'}
					</button>
					<button className="btn ghost" onClick={onShare}>
						<Send size={12} /> Share
					</button>
					<button className="btn" onClick={() => setPickerOpen(true)} title="Add to watchlist">
						<Plus size={12} /> Add to watchlist
					</button>
				</div>
				{shareToast && (
					<div
						style={{
							position: 'absolute',
							top: 12,
							right: 12,
							background: 'var(--fg)',
							color: 'var(--bg)',
							padding: '6px 12px',
							borderRadius: 4,
							fontSize: 12,
							fontWeight: 600,
							zIndex: 50,
						}}
					>
						{shareToast}
					</div>
				)}
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
			{tab === 'overview' && (
				<div className="co-page-grid">
					<main className="co-page-main">
						<Overview company={company} deals={deals} />
					</main>
					<aside className="co-page-rail">
						<KeyFactsCard company={company} />
					</aside>
				</div>
			)}
			{tab === 'funding' && (
				<div className="co-page-main">
					<Funding company={company} deals={deals} />
				</div>
			)}
			{tab === 'mna' && (
				<div className="co-page-main">
					<Mna acquisitions={acquisitions} companyName={company.name} />
				</div>
			)}
			{tab === 'team' && (
				<div className="co-page-main">
					<Team members={team} />
				</div>
			)}
			{tab === 'news' && (
				<div className="co-page-main">
					<News items={news} />
				</div>
			)}
			{tab === 'similar' && (
				<div className="co-page-main">
					<Similar companies={similar} />
				</div>
			)}

			<VerifyFooter company={company} />

			<WatchlistPicker
				open={pickerOpen}
				onClose={() => setPickerOpen(false)}
				companyId={company.id}
				companyName={company.name}
			/>
		</Page>
	);
}

// ─── Right rail ───────────────────────────────────────────────────────────

function KeyFactsCard({ company }: { company: Company }) {
	return (
		<div className="card co-rail-card">
			<div className="co-rail-h">Key facts</div>
			<KV label="Total raised" value={<b>{formatDollars(company.total_funding_usd)}</b>} />
			{company.last_round_type && (
				<KV label="Last round" value={<Tag variant="pos">{company.last_round_type}</Tag>} />
			)}
			{company.primary_sector && (
				<KV
					label="Sector"
					value={
						<AudiencePill
							sectorSlug={company.primary_sector_slug ?? company.primary_sector}
							label={company.primary_sector}
							size="sm"
						/>
					}
				/>
			)}
			{company.primary_sport && <KV label="Sport" value={company.primary_sport} />}
			{company.founded_year && <KV label="Founded" value={company.founded_year} />}
			{company.business_model && (
				<KV label="Business model" value={company.business_model.toUpperCase()} />
			)}
			{(company.deal_count ?? 0) > 0 && (
				<KV label="Rounds tracked" value={company.deal_count} />
			)}
		</div>
	);
}

// ─── Overview tab ─────────────────────────────────────────────────────────

function Overview({ company, deals }: { company: Company; deals: Deal[] }) {
	return (
		<>
			<section className="co-sec">
				<h3 className="co-sec-h">About</h3>
				<p style={{ fontSize: 14, lineHeight: 1.65, color: 'var(--fg-2)' }}>
					{company.description ?? 'No description on file yet.'}
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

// ─── Funding tab ──────────────────────────────────────────────────────────

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
					<div className="co-mini-stat-v">{company.last_round_type ?? '—'}</div>
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

// ─── M&A tab ──────────────────────────────────────────────────────────────

function Mna({ acquisitions, companyName }: { acquisitions: Acquisition[]; companyName: string }) {
	if (acquisitions.length === 0) {
		return (
			<section className="co-sec">
				<h3 className="co-sec-h">M&amp;A activity</h3>
				<div className="co-empty">{companyName} has not been involved in any tracked acquisitions.</div>
			</section>
		);
	}
	const disclosedValue = acquisitions.reduce((s, a) => s + (Number(a.amount_usd) || 0), 0);
	const latest = acquisitions[0];
	return (
		<section className="co-sec">
			<h3 className="co-sec-h">M&amp;A activity</h3>

			<div className="co-stat-strip">
				<div className="co-mini-stat">
					<div className="co-mini-stat-l">Acquisitions</div>
					<div className="co-mini-stat-v">{acquisitions.length}</div>
				</div>
				<div className="co-mini-stat">
					<div className="co-mini-stat-l">Disclosed value</div>
					<div className="co-mini-stat-v">{formatDollars(disclosedValue)}</div>
				</div>
				<div className="co-mini-stat">
					<div className="co-mini-stat-l">Latest</div>
					<div className="co-mini-stat-v" style={{ fontSize: 14, fontFamily: 'var(--font-mono)' }}>
						{latest?.acquisition_date ? formatShortDate(latest.acquisition_date) : '—'}
					</div>
				</div>
			</div>

			<h4 className="co-sec-sub">Acquisition detail</h4>
			<div className="card" style={{ padding: 0 }}>
				<table className="data-table">
					<thead>
						<tr>
							<th>Date</th>
							<th>Acquirer</th>
							<th>Type</th>
							<th style={{ textAlign: 'right' }}>Value</th>
						</tr>
					</thead>
					<tbody>
						{acquisitions.map((m) => (
							<tr key={m.id}>
								<td className="num">{m.acquisition_date ? formatShortDate(m.acquisition_date) : '—'}</td>
								<td style={{ fontWeight: 600 }}>{m.acquirer_name ?? '—'}</td>
								<td>{m.acquisition_type ? <Tag>{formatType(m.acquisition_type)}</Tag> : '—'}</td>
								<td className="num" style={{ textAlign: 'right', fontWeight: 700 }}>
									{formatDollars(m.amount_usd)}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</section>
	);
}

// ─── Team tab ─────────────────────────────────────────────────────────────

function Team({ members }: { members: TeamMember[] }) {
	if (members.length === 0) {
		return (
			<section className="co-sec">
				<h3 className="co-sec-h">Team</h3>
				<div className="co-empty">No team members on record yet.</div>
			</section>
		);
	}
	const founders = members.filter((m) => m.is_founder);
	const others = members.filter((m) => !m.is_founder);
	return (
		<section className="co-sec">
			<h3 className="co-sec-h">Team</h3>
			{founders.length > 0 && (
				<>
					<h4 className="co-sec-sub">Founders</h4>
					<div className="team-grid">
						{founders.map((m) => <TeamCard key={m.id} m={m} />)}
					</div>
				</>
			)}
			{others.length > 0 && (
				<>
					<h4 className="co-sec-sub" style={{ marginTop: 18 }}>Team</h4>
					<div className="team-grid">
						{others.map((m) => <TeamCard key={m.id} m={m} />)}
					</div>
				</>
			)}
		</section>
	);
}

function TeamCard({ m }: { m: TeamMember }) {
	const initials = m.full_name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
	return (
		<div className="team-card">
			<div className="team-card-photo" aria-hidden="true">
				{m.photo_url
					/* eslint-disable-next-line @next/next/no-img-element */
					? <img src={m.photo_url} alt="" />
					: <span>{initials}</span>}
			</div>
			<div className="team-card-name">{m.full_name}</div>
			{m.title && <div className="team-card-title">{m.title}</div>}
			{m.linkedin_url && (
				<a
					className="team-card-linkedin"
					href={m.linkedin_url}
					target="_blank"
					rel="noopener noreferrer"
					title="LinkedIn"
				>
					<Link2 size={12} />
				</a>
			)}
		</div>
	);
}

// ─── News tab ─────────────────────────────────────────────────────────────

function News({ items }: { items: NewsItem[] }) {
	if (items.length === 0) {
		return (
			<section className="co-sec">
				<h3 className="co-sec-h">News</h3>
				<div className="co-empty">No press signals tracked yet.</div>
			</section>
		);
	}
	return (
		<section className="co-sec">
			<h3 className="co-sec-h">Recent news</h3>
			<div className="co-news-list">
				{items.map((n) => (
					<article key={n.id} className="co-news-article">
						<div className="co-news-meta">
							{n.published_at && <span>{formatShortDate(n.published_at)}</span>}
							{n.source && (
								<>
									{n.published_at && <span className="dot-sep">·</span>}
									<span className="co-news-source">{n.source}</span>
								</>
							)}
						</div>
						<div className="co-news-title">
							{n.url ? (
								<a href={n.url} target="_blank" rel="noopener noreferrer">
									{n.title} <ExternalLink size={11} />
								</a>
							) : (
								n.title
							)}
						</div>
						{n.summary && <p className="co-news-summary">{n.summary}</p>}
					</article>
				))}
			</div>
		</section>
	);
}

// ─── Similar companies tab ────────────────────────────────────────────────

function Similar({ companies }: { companies: SimilarCompany[] }) {
	if (companies.length === 0) {
		return (
			<section className="co-sec">
				<h3 className="co-sec-h">Similar companies</h3>
				<div className="co-empty">No similar companies found.</div>
			</section>
		);
	}
	return (
		<section className="co-sec">
			<h3 className="co-sec-h">Similar companies</h3>
			<div className="co-similar">
				{companies.map((c) => {
					const cc = c.hq_country ? countryCode(c.hq_country) : '';
					return (
						<Link key={c.id} href={`/companies/${c.slug ?? c.id}`} className="co-similar-card">
							<div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
								<Logo co={{ name: c.name, website: c.website, custom_logo_url: c.custom_logo_url }} size={32} />
								<div style={{ minWidth: 0 }}>
									<div style={{ fontWeight: 700, fontSize: 14 }}>{c.name}</div>
									<div style={{ fontSize: 11, color: 'var(--fg-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
										{cc && <Flag cc={cc} />} {c.hq_country ?? '—'}
									</div>
								</div>
							</div>
							{c.description && (
								<p
									style={{
										fontSize: 12,
										color: 'var(--fg-2)',
										margin: 0,
										display: '-webkit-box',
										WebkitLineClamp: 2,
										WebkitBoxOrient: 'vertical',
										overflow: 'hidden',
									}}
								>
									{c.description}
								</p>
							)}
							<div style={{ marginTop: 10, fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--fg-muted)' }}>
								Raised <b style={{ color: 'var(--fg)' }}>{formatDollars(c.total_funding_usd)}</b>
							</div>
						</Link>
					);
				})}
			</div>
		</section>
	);
}

// ─── Verify footer ────────────────────────────────────────────────────────

function VerifyFooter({ company }: { company: Company }) {
	if (company.is_verified) {
		return (
			<footer className="co-verify-foot verified" aria-label="Verified profile">
				<VerifiedBadge size={22} />
				<div className="co-verify-text">
					<div className="co-verify-h">Verified profile</div>
					<div className="co-verify-sub">
						Claimed and maintained by {company.name}
						{company.updated_at ? ` · last updated ${formatShortDate(company.updated_at)}` : ''}
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

// ─── Helpers ──────────────────────────────────────────────────────────────

function formatType(t: string): string {
	switch (t) {
		case 'acquisition': return 'Strategic';
		case 'merger': return 'Merger';
		case 'asset_purchase': return 'Asset';
		default: return t;
	}
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
		Ireland: 'IE', Finland: 'FI', Norway: 'NO', Denmark: 'DK', Israel: 'IL',
		'Saudi Arabia': 'SA', UAE: 'AE', 'United Arab Emirates': 'AE',
		Mexico: 'MX', 'South Korea': 'KR', Korea: 'KR',
	};
	return map[countryName] ?? countryName.slice(0, 2).toUpperCase();
}
