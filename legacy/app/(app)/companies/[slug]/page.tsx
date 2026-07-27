'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import { ArrowLeft, ArrowRight, ChevronRight, ExternalLink, Heart, Link2, Lock, Plus, Send } from 'lucide-react';
import { qk } from '@/lib/query-keys';
import { openClaim } from '@/lib/claim-events';
import { useFavorite } from '@/hooks/use-favorite';
import { useFeatureAccess } from '@/contexts/feature-access-context';
import {
	Page, Logo, Flag, Tag, Empty, AudiencePill, SectorPill,
	VerifiedBadge, RaisingPill, KV,
} from '@/components/ui/atoms';
import { WatchlistPicker } from '@/components/ui/watchlist-picker';
import { ProLockedTab, TabLockBadge } from '@/components/ui/pro-locked-tab';

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
	// Optional social/contact fields — present only when the API joins the
	// company's `social_profiles` row. Rendered conditionally (no fakes).
	contact_email?: string | null;
	twitter_url?: string | null;
	instagram_url?: string | null;
	facebook_url?: string | null;
	linkedin_url?: string | null;
	youtube_url?: string | null;
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
	acquisition_year?: number | null;
	amount_usd?: number | string | null;
	acquirer_name?: string | null;
	acquiree_name?: string | null;
	acquisition_type?: string | null;
	primary_sector?: string | null;
	primary_sector_slug?: string | null;
	hq_country?: string | null;
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

type Tab = 'overview' | 'funding' | 'mna' | 'investors' | 'news' | 'team' | 'similar';

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

	// Investor roster derived from the real `lead_investor` on each deal.
	const investors = useMemo(() => buildInvestorRoster(deals), [deals]);

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

	const visibleTabs: Array<{ key: Tab; label: string; count?: number; show: boolean; slug?: string }> = [
		{ key: 'overview', label: 'Overview', show: true },
		{ key: 'funding', label: 'Funding', count: deals.length, show: deals.length > 0, slug: 'deals_full' },
		{ key: 'mna', label: 'M&A', count: acquisitions.length, show: acquisitions.length > 0, slug: 'acquisitions_full' },
		{ key: 'investors', label: 'Investors', count: investors.length, show: investors.length > 0, slug: 'investors_full' },
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
						{t.slug && <TabLockBadge slug={t.slug} />}
					</button>
				))}
			</nav>

			{/* Tab body */}
			{tab === 'overview' && (
				<div className="co-page-grid">
					<main className="co-page-main">
						<Overview company={company} deals={deals} news={news} />
					</main>
					<aside className="co-page-rail">
						<KeyFactsCard company={company} />
						<ConnectCard company={company} />
						<PrimaryContactCard company={company} />
					</aside>
				</div>
			)}
			{tab === 'funding' && (
				<div className="co-page-main">
					<ProLockedTab slug="deals_full" title="Funding">
						<Funding company={company} deals={deals} />
					</ProLockedTab>
				</div>
			)}
			{tab === 'mna' && (
				<div className="co-page-main">
					<ProLockedTab slug="acquisitions_full" title="M&A">
						<Mna acquisitions={acquisitions} companyName={company.name} />
					</ProLockedTab>
				</div>
			)}
			{tab === 'investors' && (
				<div className="co-page-main">
					<ProLockedTab slug="investors_full" title="Investors">
						<Investors investors={investors} companyName={company.name} roundCount={deals.length} />
					</ProLockedTab>
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

// ─── Right rail: Connect + Primary contact ─────────────────────────────────

function SocialIcon({ kind, size = 14 }: { kind: 'mail' | 'twitter' | 'instagram' | 'facebook' | 'linkedin'; size?: number }) {
	switch (kind) {
		case 'mail':
			return <svg width={size} height={size} viewBox="0 0 24 24"><path d="M3 5h18v14H3z M3 5l9 7 9-7" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinejoin="round" /></svg>;
		case 'twitter':
			return <svg width={size} height={size} viewBox="0 0 24 24"><path d="M18 4h3l-7 8 8 8h-6l-5-6-5 6H3l8-9-8-9h6l4 5z" fill="currentColor" /></svg>;
		case 'instagram':
			return <svg width={size} height={size} viewBox="0 0 24 24"><g fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="3" width="18" height="18" rx="4" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" /></g></svg>;
		case 'facebook':
			return <svg width={size} height={size} viewBox="0 0 24 24"><path d="M14 8h2V5h-2.5C12 5 11 6 11 7.5V10H9v3h2v8h3v-8h2l1-3h-3V8z" fill="currentColor" /></svg>;
		case 'linkedin':
			return <svg width={size} height={size} viewBox="0 0 24 24"><g fill="currentColor"><rect x="3" y="3" width="18" height="18" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.6" /><rect x="6" y="10" width="2.5" height="8" /><circle cx="7.2" cy="7.2" r="1.4" /><path d="M11 10h2.4v1.2c.5-.8 1.5-1.4 2.6-1.4 2 0 2.8 1.3 2.8 3.2V18h-2.5v-4.3c0-1-.4-1.7-1.3-1.7-.9 0-1.5.6-1.5 1.7V18H11v-8z" /></g></svg>;
	}
}

/** Real socials/website only — nothing rendered if the company has none. */
function ConnectCard({ company }: { company: Company }) {
	const socials: Array<{ kind: 'twitter' | 'instagram' | 'facebook' | 'linkedin'; url: string }> = [];
	if (company.twitter_url) socials.push({ kind: 'twitter', url: company.twitter_url });
	if (company.instagram_url) socials.push({ kind: 'instagram', url: company.instagram_url });
	if (company.facebook_url) socials.push({ kind: 'facebook', url: company.facebook_url });
	if (company.linkedin_url) socials.push({ kind: 'linkedin', url: company.linkedin_url });

	if (!company.contact_email && !company.website && socials.length === 0) return null;

	return (
		<div className="card co-rail-card">
			<div className="co-rail-h">Connect</div>
			<div style={{ padding: 12 }}>
				{company.contact_email && (
					<a className="co-social-mail" href={`mailto:${company.contact_email}`} title={company.contact_email}>
						<SocialIcon kind="mail" size={14} />
						<span>{company.contact_email}</span>
					</a>
				)}
				{!company.contact_email && company.website && (
					<a className="co-social-mail" href={company.website} target="_blank" rel="noopener noreferrer" title={company.website}>
						<Link2 size={14} />
						<span>{company.website.replace(/^https?:\/\//, '')}</span>
					</a>
				)}
				{socials.length > 0 && (
					<div className="co-social-icons" style={{ marginTop: company.contact_email || company.website ? 8 : 0 }}>
						{socials.map((s) => (
							<a key={s.kind} className="co-social-ico" href={s.url} target="_blank" rel="noopener noreferrer" title={s.kind}>
								<SocialIcon kind={s.kind} size={s.kind === 'twitter' ? 13 : 14} />
							</a>
						))}
					</div>
				)}
			</div>
		</div>
	);
}

interface PrimaryContactData {
	id: string;
	full_name: string | null;
	job_position: string | null;
	email: string | null;
	linkedin_url: string | null;
	phone: string | null;
	role: string | null;
}

/**
 * Primary-contact rail card. Pro-gated via the `company_contacts` feature:
 *   - not entitled → upgrade teaser linking to /subscriptions;
 *   - entitled → the real contact, or an honest empty state. No fabricated data.
 */
function PrimaryContactCard({ company }: { company: Company }) {
	const access = useFeatureAccess('company_contacts');
	const target = (company.slug ?? company.id) as string;
	const entitled = !access.isLoading && !access.isLocked;
	const { data: contact } = useSWR<PrimaryContactData | null>(
		entitled && target ? qk.companies.contacts(target) : null,
	);

	if (access.isLoading) return null;

	if (access.isLocked) {
		return (
			<div className="card co-rail-card co-locked-block">
				<div className="co-locked-head">
					<div className="co-rail-h" style={{ margin: 0, padding: 0, borderBottom: 0 }}>Primary contact</div>
					<span className="co-pro-tag">PRO</span>
				</div>
				<div className="co-locked-stack">
					<div className="co-locked-cover">
						<div className="co-locked-icon">
							<Lock size={20} />
						</div>
						<div className="co-locked-title">Unlock contact details</div>
						<div className="co-locked-sub">Pro members can see the founder&apos;s email and LinkedIn for every company.</div>
						<Link href="/subscriptions" className="btn co-locked-btn">Upgrade to Pro</Link>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="card co-rail-card">
			<div className="co-rail-h">Primary contact</div>
			{contact ? (
				<div style={{ padding: '4px 2px' }}>
					<div style={{ fontWeight: 700 }}>{contact.full_name ?? '—'}</div>
					{(contact.role || contact.job_position) && (
						<div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 2 }}>
							{contact.role ?? contact.job_position}
						</div>
					)}
					<div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
						{contact.email && (
							<a href={`mailto:${contact.email}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
								<Send size={12} /> {contact.email}
							</a>
						)}
						{contact.linkedin_url && (
							<a href={contact.linkedin_url} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
								<Link2 size={12} /> LinkedIn
							</a>
						)}
					</div>
				</div>
			) : (
				<Empty msg="No contact on record yet." />
			)}
		</div>
	);
}

// ─── Overview tab ─────────────────────────────────────────────────────────

function Overview({ company, deals, news }: { company: Company; deals: Deal[]; news: NewsItem[] }) {
	const signals = news.slice(0, 6);
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

			{signals.length > 0 && (
				<section className="co-sec">
					<h3 className="co-sec-h">Recent signals</h3>
					<div className="co-news">
						{signals.map((n) => (
							<div key={n.id} className="co-news-row">
								{n.source && <span className="co-news-kind">{n.source}</span>}
								<span style={{ flex: 1, minWidth: 0 }}>
									{n.url ? (
										<a href={n.url} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>
											{n.title} <ExternalLink size={11} style={{ verticalAlign: 'middle' }} />
										</a>
									) : (
										n.title
									)}
								</span>
								{n.published_at && (
									<span style={{ fontSize: 11, color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
										{formatShortDate(n.published_at)}
									</span>
								)}
							</div>
						))}
					</div>
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
	const router = useRouter();
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

			{/* Capital raised over time — one bar per disclosed round, oldest → newest */}
			{(() => {
				const chartRounds = [...deals]
					.reverse()
					.map((r) => ({
						amount: Number(r.amount_usd) || 0,
						stage: r.round_type_name ?? r.round_type ?? '—',
						date: r.announced_date ? formatShortDate(r.announced_date) : '—',
					}))
					.filter((r) => r.amount > 0);
				if (chartRounds.length === 0) return null;
				return (
					<>
						<h4 className="co-sec-sub">Capital raised over time</h4>
						<div className="card co-chart-card">
							<RoundsChart rounds={chartRounds} />
						</div>
					</>
				);
			})()}

			<div className="co-sec-sub-row">
				<h4 className="co-sec-sub" style={{ margin: 0 }}>Round detail</h4>
				<Link className="co-callback-link" href={`/funding?q=${encodeURIComponent(company.name)}`}>
					Open in Funding Tracker <ArrowRight size={11} />
				</Link>
			</div>
			<div className="card" style={{ padding: 0 }}>
				<table className="data-table">
					<thead>
						<tr>
							<th>Date</th>
							<th>Stage</th>
							<th>Lead investor</th>
							<th style={{ textAlign: 'right' }}>Amount</th>
							<th style={{ width: 28 }}></th>
						</tr>
					</thead>
					<tbody>
						{deals.map((r) => {
							const round = r.round_type_name ?? r.round_type ?? '—';
							return (
								<tr
									key={r.id}
									style={{ cursor: 'pointer' }}
									onClick={() => router.push(`/funding?q=${encodeURIComponent(company.name)}`)}
									title="Open in Funding Tracker"
								>
									<td className="num">{r.announced_date ? formatShortDate(r.announced_date) : '—'}</td>
									<td><Tag variant={round.toLowerCase().includes('series') ? 'pos' : ''}>{round}</Tag></td>
									<td>{r.lead_investor ?? '—'}</td>
									<td className="num" style={{ textAlign: 'right', fontWeight: 700 }}>
										{formatDollars(r.amount_usd)}
									</td>
									<td style={{ color: 'var(--fg-muted)', textAlign: 'right' }}><ChevronRight size={12} /></td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>
		</section>
	);
}

// Bar chart: one bar per disclosed funding round, oldest → newest.
// Ported from ui_design_3 RoundsChart; amounts shown in $M.
function RoundsChart({ rounds }: { rounds: Array<{ amount: number; stage: string; date: string }> }) {
	if (!rounds.length) return <div className="co-empty">No rounds to chart yet.</div>;
	const W = 760, H = 240, PAD_L = 48, PAD_R = 24, PAD_T = 28, PAD_B = 48;
	// amounts are raw USD; render axis/bars in $M
	const toM = (n: number) => n / 1_000_000;
	const maxAmt = Math.max(...rounds.map((r) => toM(r.amount)), 1);
	const innerW = W - PAD_L - PAD_R;
	const innerH = H - PAD_T - PAD_B;
	const slot = innerW / rounds.length;
	const bw = Math.min(slot * 0.55, 80);
	const fmtM = (m: number) => (m >= 100 ? m.toFixed(0) : m.toFixed(1));
	return (
		<svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
			{[0, 0.25, 0.5, 0.75, 1].map((t) => {
				const y = PAD_T + innerH * (1 - t);
				return (
					<g key={t}>
						<line x1={PAD_L} x2={W - PAD_R} y1={y} y2={y} stroke="var(--border)" strokeDasharray="2 4" />
						<text x={PAD_L - 8} y={y + 3} textAnchor="end" fontSize="10" fontFamily="var(--font-mono)" fill="var(--fg-muted)">
							${fmtM(maxAmt * t)}M
						</text>
					</g>
				);
			})}
			{rounds.map((r, i) => {
				const m = toM(r.amount);
				const cx = PAD_L + slot * (i + 0.5);
				const bh = (m / maxAmt) * innerH;
				const y = PAD_T + innerH - bh;
				return (
					<g key={i}>
						<rect x={cx - bw / 2} y={y} width={bw} height={bh} fill={i % 2 === 0 ? '#79CABD' : '#C0F4DE'} />
						<text x={cx} y={y - 8} textAnchor="middle" fontSize="11" fontFamily="var(--font-mono)" fontWeight="700" fill="var(--fg)">
							${fmtM(m)}M
						</text>
						<text x={cx} y={H - PAD_B + 16} textAnchor="middle" fontSize="11" fontFamily="var(--font-mono)" fontWeight="600" fill="var(--fg)">
							{r.stage}
						</text>
						<text x={cx} y={H - PAD_B + 30} textAnchor="middle" fontSize="10" fontFamily="var(--font-mono)" fill="var(--fg-muted)">
							{r.date}
						</text>
					</g>
				);
			})}
			<path
				d={rounds.map((r, i) => {
					const cx = PAD_L + slot * (i + 0.5);
					const y = PAD_T + innerH - (toM(r.amount) / maxAmt) * innerH;
					return `${i === 0 ? 'M' : 'L'}${cx},${y}`;
				}).join(' ')}
				stroke="var(--accent)" strokeWidth="1.5" fill="none" opacity="0.7"
			/>
		</svg>
	);
}

// ─── M&A tab ──────────────────────────────────────────────────────────────

function Mna({ acquisitions, companyName }: { acquisitions: Acquisition[]; companyName: string }) {
	const router = useRouter();
	if (acquisitions.length === 0) {
		return (
			<section className="co-sec">
				<h3 className="co-sec-h">M&amp;A activity</h3>
				<div className="co-empty">{companyName} has not been involved in any tracked acquisitions.</div>
			</section>
		);
	}
	const disclosed = acquisitions.filter((a) => Number(a.amount_usd) > 0);
	const disclosedValue = disclosed.reduce((s, a) => s + (Number(a.amount_usd) || 0), 0);
	const latest = acquisitions[0];

	// Deal year derived from `acquisition_year` (falls back to the date).
	const dealYear = (a: Acquisition): number | null => {
		if (a.acquisition_year) return a.acquisition_year;
		if (a.acquisition_date) {
			const y = new Date(a.acquisition_date).getFullYear();
			return Number.isFinite(y) ? y : null;
		}
		return null;
	};

	// Last-6-years bar chart of deal counts.
	const thisYear = new Date().getFullYear();
	const yearCounts: Record<number, number> = {};
	acquisitions.forEach((a) => {
		const y = dealYear(a);
		if (y != null) yearCounts[y] = (yearCounts[y] || 0) + 1;
	});
	const chartYears: Array<{ year: number; count: number }> = [];
	for (let y = thisYear - 5; y <= thisYear; y++) chartYears.push({ year: y, count: yearCounts[y] || 0 });

	// Sector + country distributions (real fields from the acquisitions join).
	const sectors: Record<string, { label: string; slug: string | null; count: number }> = {};
	const countries: Record<string, number> = {};
	acquisitions.forEach((a) => {
		if (a.primary_sector) {
			const key = a.primary_sector_slug ?? a.primary_sector;
			sectors[key] = sectors[key]
				? { ...sectors[key], count: sectors[key].count + 1 }
				: { label: a.primary_sector, slug: a.primary_sector_slug ?? null, count: 1 };
		}
		if (a.hq_country) {
			const cc = countryCode(a.hq_country);
			countries[cc] = (countries[cc] || 0) + 1;
		}
	});
	const sectorData = Object.values(sectors).map((s) => ({
		key: s.slug ?? s.label, label: s.label, count: s.count,
		icon: <SectorPill slug={s.slug} name={s.label} />,
	}));
	const countryData = Object.entries(countries).map(([cc, n]) => ({
		key: cc, label: cc, count: n, icon: <Flag cc={cc} />,
	}));

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
					<div className="co-mini-stat-l">Disclosed deals</div>
					<div className="co-mini-stat-v">{disclosed.length} / {acquisitions.length}</div>
				</div>
				<div className="co-mini-stat">
					<div className="co-mini-stat-l">Latest</div>
					<div className="co-mini-stat-v" style={{ fontSize: 14, fontFamily: 'var(--font-mono)' }}>
						{latest?.acquisition_date ? formatShortDate(latest.acquisition_date) : '—'}
					</div>
				</div>
			</div>

			<h4 className="co-sec-sub">Acquisitions by year</h4>
			<div className="card co-chart-card">
				<MnaYearChart data={chartYears} />
			</div>

			{(sectorData.length > 0 || countryData.length > 0) && (
				<div className="co-split-grid">
					{sectorData.length > 0 && (
						<div>
							<h4 className="co-sec-sub">Sector split</h4>
							<div className="card co-chart-card">
								<MnaSplitChart data={sectorData} total={acquisitions.length} />
							</div>
						</div>
					)}
					{countryData.length > 0 && (
						<div>
							<h4 className="co-sec-sub">Country split</h4>
							<div className="card co-chart-card">
								<MnaSplitChart data={countryData} total={acquisitions.length} />
							</div>
						</div>
					)}
				</div>
			)}

			<h4 className="co-sec-sub">Acquisition timeline</h4>
			<div className="card co-chart-card">
				<MnaTimeline acquisitions={acquisitions} />
			</div>

			<div className="co-sec-sub-row">
				<h4 className="co-sec-sub" style={{ margin: 0 }}>Acquisition detail</h4>
				<Link className="co-callback-link" href={`/ma?q=${encodeURIComponent(companyName)}`}>
					Open in M&amp;A Tracker <ArrowRight size={11} />
				</Link>
			</div>
			<div className="card" style={{ padding: 0 }}>
				<table className="data-table">
					<thead>
						<tr>
							<th>Date</th>
							<th>Acquirer</th>
							<th>Type</th>
							<th style={{ textAlign: 'right' }}>Value</th>
							<th style={{ width: 28 }}></th>
						</tr>
					</thead>
					<tbody>
						{acquisitions.map((m) => (
							<tr
								key={m.id}
								style={{ cursor: 'pointer' }}
								onClick={() => router.push(`/ma?q=${encodeURIComponent(companyName)}`)}
								title="Open in M&A Tracker"
							>
								<td className="num">{m.acquisition_date ? formatShortDate(m.acquisition_date) : '—'}</td>
								<td style={{ fontWeight: 600 }}>{m.acquirer_name ?? '—'}</td>
								<td>{m.acquisition_type ? <Tag>{formatType(m.acquisition_type)}</Tag> : '—'}</td>
								<td className="num" style={{ textAlign: 'right', fontWeight: 700 }}>
									{formatDollars(m.amount_usd)}
								</td>
								<td style={{ color: 'var(--fg-muted)', textAlign: 'right' }}><ChevronRight size={12} /></td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</section>
	);
}

// Acquisitions per year — bar chart, last 6 years. Ported from ui_design_3.
function MnaYearChart({ data }: { data: Array<{ year: number; count: number }> }) {
	const W = 760, H = 200, PAD_L = 40, PAD_R = 20, PAD_T = 24, PAD_B = 36;
	const innerW = W - PAD_L - PAD_R;
	const innerH = H - PAD_T - PAD_B;
	const max = Math.max(...data.map((d) => d.count), 1);
	const slot = innerW / data.length;
	const bw = slot * 0.55;
	const ticks: number[] = [];
	for (let t = 0; t <= max; t++) ticks.push(t);
	return (
		<svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
			{ticks.map((t) => {
				const y = PAD_T + innerH * (1 - t / max);
				return (
					<g key={t}>
						<line x1={PAD_L} x2={W - PAD_R} y1={y} y2={y} stroke="var(--border)" strokeDasharray="2 4" />
						<text x={PAD_L - 8} y={y + 3} textAnchor="end" fontSize="10" fontFamily="var(--font-mono)" fill="var(--fg-muted)">{t}</text>
					</g>
				);
			})}
			{data.map((d, i) => {
				const cx = PAD_L + slot * (i + 0.5);
				const bh = (d.count / max) * innerH;
				const y = PAD_T + innerH - bh;
				return (
					<g key={i}>
						{d.count > 0 && (
							<>
								<rect x={cx - bw / 2} y={y} width={bw} height={bh} fill="var(--accent)" />
								<text x={cx} y={y - 6} textAnchor="middle" fontSize="11" fontFamily="var(--font-mono)" fontWeight="700" fill="var(--fg)">{d.count}</text>
							</>
						)}
						<text x={cx} y={H - PAD_B + 16} textAnchor="middle" fontSize="11" fontFamily="var(--font-mono)" fill="var(--fg-2)">{`'${String(d.year).slice(-2)}`}</text>
					</g>
				);
			})}
		</svg>
	);
}

// Horizontal-bar split chart for sector + country (and investor) splits.
interface SplitDatum { key: string; label: string; count: number; icon?: React.ReactNode }
function MnaSplitChart({ data, total }: { data: SplitDatum[]; total: number }) {
	if (!data.length) return <div className="co-empty">No data.</div>;
	const sorted = [...data].sort((a, b) => b.count - a.count);
	const max = sorted[0].count || 1;
	return (
		<div className="co-split-list">
			{sorted.map((d) => {
				const pct = total ? Math.round((d.count / total) * 100) : 0;
				return (
					<div key={d.key} className="co-split-row">
						<span className="co-split-label">
							{d.icon}
							<span>{d.label}</span>
						</span>
						<div className="co-split-bar-wrap">
							<div className="co-split-bar" style={{ width: `${(d.count / max) * 100}%`, background: 'var(--accent)' }} />
						</div>
						<span className="co-split-meta">
							<b>{d.count}</b><span style={{ color: 'var(--fg-muted)' }}> · {pct}%</span>
						</span>
					</div>
				);
			})}
		</div>
	);
}

// Horizontal timeline of acquisitions — one node per deal along a baseline.
function MnaTimeline({ acquisitions }: { acquisitions: Acquisition[] }) {
	const W = 760, H = 180, PAD_L = 60, PAD_R = 60, PAD_T = 50;
	const innerW = W - PAD_L - PAD_R;
	const items = [...acquisitions].reverse(); // oldest → newest
	return (
		<svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
			<line x1={PAD_L} x2={W - PAD_R} y1={PAD_T + 40} y2={PAD_T + 40} stroke="var(--border-strong)" strokeWidth="2" />
			{items.map((m, i) => {
				const cx = items.length === 1 ? PAD_L + innerW / 2 : PAD_L + (innerW * i) / (items.length - 1);
				const amount = Number(m.amount_usd) || 0;
				const hasValue = amount > 0;
				const label = m.acquirer_name ?? '—';
				return (
					<g key={m.id}>
						<circle cx={cx} cy={PAD_T + 40} r="9" fill="var(--bg)" stroke="var(--pos)" strokeWidth="2.5" />
						<circle cx={cx} cy={PAD_T + 40} r="3" fill="var(--pos)" />
						<text x={cx} y={PAD_T + 20} textAnchor="middle" fontSize="13" fontFamily="var(--font-display)" fontWeight="700" fill="var(--fg)">{label}</text>
						{m.acquisition_type && (
							<text x={cx} y={PAD_T + 4} textAnchor="middle" fontSize="10" fontFamily="var(--font-mono)" fill="var(--fg-muted)">
								{formatType(m.acquisition_type).toUpperCase()}
							</text>
						)}
						<text x={cx} y={PAD_T + 65} textAnchor="middle" fontSize="11" fontFamily="var(--font-mono)" fill="var(--fg)">
							{m.acquisition_date ? formatShortDate(m.acquisition_date) : (m.acquisition_year ?? '—')}
						</text>
						<text x={cx} y={PAD_T + 82} textAnchor="middle" fontSize="11" fontFamily="var(--font-mono)" fontWeight="700" fill={hasValue ? 'var(--fg)' : 'var(--fg-muted)'}>
							{hasValue ? formatDollars(amount) : 'undisclosed'}
						</text>
					</g>
				);
			})}
		</svg>
	);
}

// ─── Investors tab ──────────────────────────────────────────────────────────

interface InvestorRow { name: string; rounds: number }

/** Roster built from each deal's real `lead_investor`, aggregated by name. */
function buildInvestorRoster(deals: Deal[]): InvestorRow[] {
	const byName: Record<string, number> = {};
	deals.forEach((d) => {
		const name = (d.lead_investor ?? '').trim();
		if (!name) return;
		byName[name] = (byName[name] || 0) + 1;
	});
	return Object.entries(byName)
		.map(([name, rounds]) => ({ name, rounds }))
		.sort((a, b) => b.rounds - a.rounds || a.name.localeCompare(b.name));
}

function Investors({ investors, companyName, roundCount }: { investors: InvestorRow[]; companyName: string; roundCount: number }) {
	if (investors.length === 0) {
		return (
			<section className="co-sec">
				<h3 className="co-sec-h">Investors</h3>
				<div className="co-empty">No disclosed lead investors for {companyName} yet.</div>
			</section>
		);
	}
	return (
		<section className="co-sec">
			<h3 className="co-sec-h">Investors</h3>
			<p style={{ fontSize: 13, color: 'var(--fg-muted)', marginBottom: 14 }}>
				Lead investors that have participated in funding rounds of {companyName}.
			</p>

			<div className="co-stat-strip">
				<div className="co-mini-stat">
					<div className="co-mini-stat-l">Lead investors</div>
					<div className="co-mini-stat-v">{investors.length}</div>
				</div>
				<div className="co-mini-stat">
					<div className="co-mini-stat-l">Rounds</div>
					<div className="co-mini-stat-v">{roundCount}</div>
				</div>
				<div className="co-mini-stat">
					<div className="co-mini-stat-l">Most active</div>
					<div className="co-mini-stat-v" style={{ fontSize: 16 }}>{investors[0].rounds} round{investors[0].rounds === 1 ? '' : 's'}</div>
				</div>
			</div>

			<h4 className="co-sec-sub">Investor roster</h4>
			<div className="card" style={{ padding: 0 }}>
				<table className="data-table">
					<thead>
						<tr>
							<th>Investor</th>
							<th className="num" style={{ textAlign: 'right' }}>Rounds led</th>
						</tr>
					</thead>
					<tbody>
						{investors.map((inv) => {
							const initials = inv.name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
							return (
								<tr key={inv.name}>
									<td>
										<div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
											<span className="co-inv-logo">{initials}</span>
											<span style={{ fontWeight: 600 }}>{inv.name}</span>
										</div>
									</td>
									<td className="num" style={{ textAlign: 'right', fontWeight: 700 }}>
										{inv.rounds} of {roundCount}
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
					<button
						className="btn ghost"
						onClick={() => openClaim({ role: 'founder', id: company.id, name: company.name, website: company.website })}
					>
						Report an issue
					</button>
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
				<button
					className="btn"
					onClick={() => openClaim({ role: 'founder', id: company.id, name: company.name, website: company.website })}
				>
					Claim &amp; verify
				</button>
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
