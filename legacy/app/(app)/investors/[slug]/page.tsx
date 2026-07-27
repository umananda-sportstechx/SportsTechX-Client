'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { ArrowLeft, ExternalLink, Heart, Send } from 'lucide-react';
import { qk } from '@/lib/query-keys';
import { openClaim } from '@/lib/claim-events';
import { useFavorite } from '@/hooks/use-favorite';
import { Page, Flag, Tag, Empty, VerifiedBadge, Logo } from '@/components/ui/atoms';
import { SortHeader, applySort, parseMoney, type SortState } from '@/components/ui/sort-header';
import { PieDonut, type PieSegment } from '@/components/ui/analytics-charts';

interface Investor {
	id: string;
	name: string;
	slug?: string;
	description?: string | null;
	thesis?: string | null;
	website?: string | null;
	logo_url?: string | null;
	category?: string | null;
	hq_country?: string | null;
	hq_city?: string | null;
	total_aum_usd?: number | string | null;
	total_funding?: number | string | null;
	num_investments?: number | null;
	deals_count?: number | null;
	primary_focus?: string | null;
	year_launched?: number | null;
	recent_investment?: string | null;
	is_verified?: boolean | null;
	// Social/contact — joined from social_profiles on the detail endpoint.
	contact_email?: string | null;
	twitter_url?: string | null;
	instagram_url?: string | null;
	facebook_url?: string | null;
	linkedin_url?: string | null;
}

interface Deal {
	id: string;
	company_name?: string | null;
	company_slug?: string | null;
	announced_date?: string | null;
	amount_usd?: number | string | null;
	round_type_name?: string | null;
	// Returned by the deals list endpoint — used for the portfolio breakdown.
	primary_sector?: string | null;
	sector_slug?: string | null;
	hq_country?: string | null;
}

const SPLIT_COLORS = [
	'oklch(58% 0.22 290)', 'oklch(58% 0.22 240)', 'oklch(58% 0.22 160)',
	'oklch(62% 0.18 30)', 'oklch(62% 0.18 60)', 'oklch(62% 0.18 350)',
	'oklch(62% 0.14 140)', 'oklch(62% 0.18 200)',
];

/** Aggregate portfolio deals into pie segments by a string key (top 8 + Other). */
function splitBy(deals: Deal[], keyOf: (d: Deal) => string | null | undefined): PieSegment[] {
	const counts = new Map<string, number>();
	for (const d of deals) {
		const k = keyOf(d);
		if (!k) continue;
		counts.set(k, (counts.get(k) ?? 0) + 1);
	}
	const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
	const top = sorted.slice(0, 8);
	const restCount = sorted.slice(8).reduce((s, [, v]) => s + v, 0);
	const segs: PieSegment[] = top.map(([name, v], i) => ({
		name, v, color: SPLIT_COLORS[i % SPLIT_COLORS.length], label: String(v),
	}));
	if (restCount > 0) segs.push({ name: 'Other', v: restCount, color: 'var(--fg-muted)', label: String(restCount) });
	return segs;
}

interface DealsResponse { data: Deal[]; total: number }

interface ThesisRef { id: string; name: string; slug: string }
interface ThesisBundle {
	sectors: ThesisRef[];
	sports: ThesisRef[];
	tech_tags: ThesisRef[];
	round_types: ThesisRef[];
	revenue_stages: string[];
	geo: Array<{ scope_type: string; scope_value: string }>;
}

interface Fund {
	id: string;
	fund_name?: string | null;
	announced_year?: number | null;
	announced_date?: string | null;
	fund_value_usd?: number | string | null;
}

const TYPE_COLORS: Record<string, string> = {
	venture_capital: 'oklch(62% 0.18 240)',
	financial_services: 'oklch(62% 0.16 160)',
	private_equity: 'oklch(62% 0.18 30)',
	family_investment_office: 'oklch(62% 0.20 290)',
	sovereign_wealth_fund: 'oklch(62% 0.18 60)',
	angel: 'oklch(62% 0.18 350)',
	other: 'oklch(62% 0.04 240)',
};

export default function InvestorDetailPage() {
	const params = useParams<{ slug: string }>();
	const slug = params?.slug ?? '';
	const [sort, setSort] = useState<SortState | null>({ key: 'announced_date', dir: 'desc' });
	const [shareToast, setShareToast] = useState<string | null>(null);

	const { data: investor, isLoading, error } = useSWR<Investor>(
		slug ? qk.investors.detail(slug) : null,
		{ dedupingInterval: 5 * 60_000 },
	);

	const fav = useFavorite('investors', investor?.id);

	const { data: dealsResp } = useSWR<DealsResponse>(
		investor?.id ? qk.deals.list({ investor_id: investor.id, limit: 30, sort: '-announced_date' }) : null,
		{ dedupingInterval: 5 * 60_000 },
	);
	const deals = dealsResp?.data ?? [];

	const { data: thesis } = useSWR<ThesisBundle>(
		slug ? qk.investors.thesis(slug) : null,
		{ dedupingInterval: 5 * 60_000 },
	);

	const { data: funds } = useSWR<Fund[]>(
		slug ? qk.investors.funds(slug) : null,
		{ dedupingInterval: 5 * 60_000 },
	);

	// Investment timeline aggregated by year from tracked deals.
	const timeline = useMemo(() => buildTimeline(deals), [deals]);

	const onShare = async () => {
		if (!investor) return;
		const target = investor.slug ?? investor.id;
		const url = `${window.location.origin}/investors/${target}`;
		try {
			await navigator.clipboard.writeText(url);
			setShareToast('Link copied');
			setTimeout(() => setShareToast(null), 1800);
		} catch {
			setShareToast('Copy failed');
			setTimeout(() => setShareToast(null), 1800);
		}
	};

	if (isLoading) return <Page><Empty msg="Loading investor…" /></Page>;
	if (error || !investor?.id) {
		return (
			<Page>
				<Link href="/investors" className="co-back">
					<ArrowLeft size={12} /> Back to investors
				</Link>
				<Empty msg="Investor not found" />
			</Page>
		);
	}

	const cc = investor.hq_country ? countryCode(investor.hq_country) : '';
	const color = TYPE_COLORS[investor.category ?? 'other'] ?? TYPE_COLORS.other;
	const initials = investor.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
	const typeLabel = formatCategory(investor.category);
	const isVerified = !!investor.is_verified;
	const aum = formatDollars(investor.total_aum_usd ?? investor.total_funding);

	// Geo scope from thesis → Continent / Region rail rows.
	const continent = thesis?.geo?.find((g) => g.scope_type === 'continent')?.scope_value;
	const region = thesis?.geo?.find((g) => g.scope_type === 'region')?.scope_value;
	const stageFocus = thesis?.round_types?.map((r) => r.name).join(', ');

	const sortedDeals = applySort(deals, sort, {
		announced_date: (d) => (d.announced_date ? Date.parse(d.announced_date) : null),
		company_name: (d) => d.company_name ?? '',
		amount_usd: (d) => parseMoney(d.amount_usd),
		round_type_name: (d) => d.round_type_name ?? '',
	});

	// Portfolio breakdown segments derived from the investor's tracked deals.
	const sectorSplit = useMemo(() => splitBy(deals, (d) => d.primary_sector), [deals]);
	const countrySplit = useMemo(() => splitBy(deals, (d) => d.hq_country), [deals]);
	const roundSplit = useMemo(() => splitBy(deals, (d) => d.round_type_name), [deals]);

	return (
		<Page>
			<Link href="/investors" className="co-back">
				<ArrowLeft size={12} /> Back to investors
			</Link>

			{/* Hero with color bar accent */}
			<div className="card inv-card" style={{ padding: 0, marginBottom: 'var(--space-5)', position: 'relative' }}>
				<div className="inv-bar" style={{ background: color, height: 4 }} />
				<div style={{ padding: 'var(--space-5)', display: 'flex', alignItems: 'flex-start', gap: 'var(--space-4)' }}>
					<Logo co={{ name: investor.name, website: investor.website, custom_logo_url: investor.logo_url, color, logo: initials }} size={72} />
					<div style={{ flex: 1, minWidth: 0 }}>
						<div className="co-hero-meta" style={{ marginBottom: 6 }}>
							{cc && <Flag cc={cc} />}
							<span>{[investor.hq_city, investor.hq_country].filter(Boolean).join(', ') || '—'}</span>
						</div>
						<div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
							<h1 style={{ fontFamily: 'var(--font-display)', fontSize: 38, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1, margin: 0 }}>
								{investor.name}
							</h1>
							{isVerified && <VerifiedBadge size={22} title="Verified investor" />}
						</div>
						<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
							{typeLabel && (
								<Tag>
									<span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: color, marginRight: 6, verticalAlign: 'middle' }} />
									{typeLabel}
								</Tag>
							)}
							{investor.primary_focus && <Tag>{investor.primary_focus}</Tag>}
						</div>
						{investor.website && (
							<div style={{ marginTop: 14 }}>
								<a href={investor.website} target="_blank" rel="noopener noreferrer" className="btn ghost">
									Website <ExternalLink size={12} />
								</a>
							</div>
						)}
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
					</div>
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
			</div>

			{/* Thesis + details rail */}
			<div className="co-page-grid" style={{ marginBottom: 'var(--space-5)' }}>
				<div>
					{(investor.thesis || investor.description) && (
						<div className="card" style={{ padding: 'var(--space-5)', marginBottom: 'var(--space-4)' }}>
							<div className="co-stat-label" style={{ marginBottom: 8 }}>Investment thesis</div>
							<p style={{ margin: 0, color: 'var(--fg-2)', lineHeight: 1.6, fontSize: 15 }}>
								{investor.thesis ?? investor.description}
							</p>
						</div>
					)}

					{/* Thesis focus tag groups */}
					{thesis && (thesis.sectors.length > 0 || thesis.sports.length > 0 || thesis.tech_tags.length > 0) && (
						<div className="card" style={{ padding: 'var(--space-5)' }}>
							<div className="co-stat-label" style={{ marginBottom: 12 }}>Focus areas</div>
							<TagGroup label="Sectors" items={thesis.sectors.map((s) => s.name)} />
							<TagGroup label="Sports" items={thesis.sports.map((s) => s.name)} />
							<TagGroup label="Technology" items={thesis.tech_tags.map((t) => t.name)} />
							<TagGroup label="Revenue stage" items={thesis.revenue_stages} />
						</div>
					)}
				</div>

				<aside className="co-page-rail">
					<div className="card co-rail-card">
						<div className="co-rail-h">Details</div>
						<div className="co-kv">
							<span className="co-kv-k">Location</span>
							<span className="co-kv-v">
								<span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
									{cc && <Flag cc={cc} />}
									{[investor.hq_city, investor.hq_country].filter(Boolean).join(', ') || '—'}
								</span>
							</span>
						</div>
						{typeLabel && (
							<div className="co-kv"><span className="co-kv-k">Type</span><span className="co-kv-v">{typeLabel}</span></div>
						)}
						{investor.year_launched && (
							<div className="co-kv"><span className="co-kv-k">Year Launched</span><span className="co-kv-v">{investor.year_launched}</span></div>
						)}
						{continent && (
							<div className="co-kv"><span className="co-kv-k">Continent</span><span className="co-kv-v">{continent}</span></div>
						)}
						{region && (
							<div className="co-kv"><span className="co-kv-k">Region</span><span className="co-kv-v">{region}</span></div>
						)}
						{stageFocus && (
							<div className="co-kv"><span className="co-kv-k">Stage focus</span><span className="co-kv-v">{stageFocus}</span></div>
						)}
						<div className="co-kv"><span className="co-kv-k">AUM</span><span className="co-kv-v"><b>{aum ?? '—'}</b></span></div>
						<div className="co-kv"><span className="co-kv-k">Investments</span><span className="co-kv-v">{investor.deals_count ?? investor.num_investments ?? '—'}</span></div>
						{investor.recent_investment && (
							<div className="co-kv"><span className="co-kv-k">Recent</span><span className="co-kv-v">{investor.recent_investment}</span></div>
						)}
					</div>
				<ConnectCard investor={investor} />
					</aside>
			</div>

			{/* Investment timeline */}
			{timeline.length > 0 && (
				<section className="co-sec">
					<h3 className="co-sec-h">Investment timeline</h3>
					<div className="co-timeline">
						{timeline.map((d) => (
							<div key={d.year} className="co-timeline-step">
								<div className="co-timeline-dot" />
								<div className="co-timeline-stage">{d.count} deal{d.count === 1 ? '' : 's'}</div>
								<div className="co-timeline-amt">{d.amount > 0 ? (formatDollars(d.amount) ?? '—') : '—'}</div>
								<div className="co-timeline-date">{d.year}</div>
							</div>
						))}
					</div>
				</section>
			)}

			{/* Fund history */}
			{funds && funds.length > 0 && (
				<section className="co-sec">
					<h3 className="co-sec-h">
						Fund history
						<span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-muted)', fontWeight: 400, marginLeft: 12 }}>
							{funds.length} {funds.length === 1 ? 'fund' : 'funds'}
						</span>
					</h3>
					<div className="card" style={{ padding: 0 }}>
						<table className="data-table">
							<thead>
								<tr>
									<th>Name</th>
									<th>Year</th>
									<th style={{ textAlign: 'right' }}>Amount</th>
								</tr>
							</thead>
							<tbody>
								{funds.map((f) => (
									<tr key={f.id}>
										<td style={{ fontWeight: 600 }}>{f.fund_name ?? '—'}</td>
										<td className="num">{f.announced_year ?? '—'}</td>
										<td className="num" style={{ textAlign: 'right', fontWeight: 700 }}>{formatDollars(f.fund_value_usd) ?? '—'}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</section>
			)}

			{/* Portfolio breakdown — sector / geography / stage splits over the
			    investor's tracked deals. */}
			{deals.length > 0 && (
				<section className="co-sec">
					<h3 className="co-sec-h">Portfolio breakdown</h3>
					<div className="grid-3">
						<div className="card">
							<div className="co-rail-h">By sector</div>
							<div style={{ padding: 'var(--space-4)' }}>
								{sectorSplit.length === 0 ? <Empty msg="No sector data." /> : <PieDonut segments={sectorSplit} mode="donut" />}
							</div>
						</div>
						<div className="card">
							<div className="co-rail-h">By geography</div>
							<div style={{ padding: 'var(--space-4)' }}>
								{countrySplit.length === 0 ? <Empty msg="No geography data." /> : <PieDonut segments={countrySplit} mode="bar" />}
							</div>
						</div>
						<div className="card">
							<div className="co-rail-h">By stage</div>
							<div style={{ padding: 'var(--space-4)' }}>
								{roundSplit.length === 0 ? <Empty msg="No stage data." /> : <PieDonut segments={roundSplit} mode="bar" />}
							</div>
						</div>
					</div>
				</section>
			)}

			{/* Portfolio deals */}
			<section className="co-sec">
				<h3 className="co-sec-h">
					Portfolio deals
					{dealsResp?.total ? (
						<span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-muted)', fontWeight: 400, marginLeft: 12 }}>
							{dealsResp.total} total
						</span>
					) : null}
				</h3>
				{deals.length === 0 ? (
					<div className="co-empty">No tracked portfolio deals yet.</div>
				) : (
					<div className="card" style={{ padding: 0 }}>
						<table className="data-table">
							<thead>
								<tr>
									<SortHeader label="Date" sortKey="announced_date" sort={sort} setSort={setSort} defaultDir="desc" />
									<SortHeader label="Company" sortKey="company_name" sort={sort} setSort={setSort} />
									<SortHeader label="Round" sortKey="round_type_name" sort={sort} setSort={setSort} />
									<SortHeader label="Amount" sortKey="amount_usd" sort={sort} setSort={setSort} align="right" defaultDir="desc" />
								</tr>
							</thead>
							<tbody>
								{sortedDeals.map((d) => (
									<tr key={d.id}>
										<td className="num">{formatShortDate(d.announced_date)}</td>
										<td>
											<Link href={`/companies/${d.company_slug ?? d.id}`} style={{ fontWeight: 600 }}>
												{d.company_name ?? '—'}
											</Link>
										</td>
										<td>{d.round_type_name ? <Tag>{d.round_type_name}</Tag> : '—'}</td>
										<td className="num" style={{ textAlign: 'right', fontWeight: 700 }}>{formatDollars(d.amount_usd) ?? '—'}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</section>

			<InvestorVerifyFooter investor={investor} />
		</Page>
	);
}

function InvestorVerifyFooter({ investor }: { investor: Investor }) {
	const claim = () => openClaim({ role: 'investor', id: investor.id, name: investor.name, website: investor.website });
	if (investor.is_verified) {
		return (
			<footer className="co-verify-foot verified" aria-label="Verified profile">
				<VerifiedBadge size={22} />
				<div className="co-verify-text">
					<div className="co-verify-h">Verified profile</div>
					<div className="co-verify-sub">Claimed and maintained by {investor.name}</div>
				</div>
				<div className="co-verify-actions">
					<button className="btn ghost" onClick={claim}>Report an issue</button>
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
				<div className="co-verify-h">Is this your firm?</div>
				<div className="co-verify-sub">
					Claim {investor.name} to keep your thesis, funds and portfolio accurate — and earn a verified badge on your profile.
				</div>
			</div>
			<div className="co-verify-actions">
				<button className="btn" onClick={claim}>Claim &amp; verify</button>
			</div>
		</footer>
	);
}

function TagGroup({ label, items }: { label: string; items: string[] }) {
	if (!items.length) return null;
	return (
		<div style={{ marginBottom: 14 }}>
			<div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--fg-muted)', marginBottom: 6 }}>
				{label}
			</div>
			<div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
				{items.map((it) => <Tag key={it}>{it}</Tag>)}
			</div>
		</div>
	);
}

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

/** Real socials/website only — nothing rendered if the investor has none. */
function ConnectCard({ investor }: { investor: Investor }) {
	const socials: Array<{ kind: 'twitter' | 'instagram' | 'facebook' | 'linkedin'; url: string }> = [];
	if (investor.twitter_url) socials.push({ kind: 'twitter', url: investor.twitter_url });
	if (investor.instagram_url) socials.push({ kind: 'instagram', url: investor.instagram_url });
	if (investor.facebook_url) socials.push({ kind: 'facebook', url: investor.facebook_url });
	if (investor.linkedin_url) socials.push({ kind: 'linkedin', url: investor.linkedin_url });

	if (!investor.contact_email && !investor.website && socials.length === 0) return null;

	return (
		<div className="card co-rail-card">
			<div className="co-rail-h">Connect</div>
			<div style={{ padding: 12 }}>
				{investor.contact_email && (
					<a className="co-social-mail" href={`mailto:${investor.contact_email}`} title={investor.contact_email}>
						<SocialIcon kind="mail" size={14} />
						<span>{investor.contact_email}</span>
					</a>
				)}
				{!investor.contact_email && investor.website && (
					<a className="co-social-mail" href={investor.website} target="_blank" rel="noopener noreferrer" title={investor.website}>
						<ExternalLink size={14} />
						<span>{investor.website.replace(/^https?:\/\//, '')}</span>
					</a>
				)}
				{socials.length > 0 && (
					<div className="co-social-icons" style={{ marginTop: investor.contact_email || investor.website ? 8 : 0 }}>
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

function buildTimeline(deals: Deal[]): Array<{ year: number; count: number; amount: number }> {
	const byYear = new Map<number, { count: number; amount: number }>();
	for (const d of deals) {
		if (!d.announced_date) continue;
		const year = new Date(d.announced_date).getFullYear();
		if (Number.isNaN(year)) continue;
		const entry = byYear.get(year) ?? { count: 0, amount: 0 };
		entry.count += 1;
		const amt = typeof d.amount_usd === 'string' ? Number(d.amount_usd) : d.amount_usd;
		if (Number.isFinite(amt) && amt != null) entry.amount += amt;
		byYear.set(year, entry);
	}
	return [...byYear.entries()]
		.map(([year, v]) => ({ year, ...v }))
		.sort((a, b) => a.year - b.year);
}

function formatCategory(c: string | null | undefined): string {
	if (!c) return '';
	switch (c) {
		case 'venture_capital': return 'Venture Capital';
		case 'private_equity': return 'PE';
		case 'financial_services': return 'Corporate VC';
		case 'family_investment_office': return 'Family Office';
		case 'sovereign_wealth_fund': return 'SWF';
		case 'angel': return 'Angel';
		default: return c.replace(/_/g, ' ');
	}
}

function formatDollars(value: number | string | null | undefined): string | null {
	if (value == null) return null;
	const n = typeof value === 'string' ? Number(value) : value;
	if (!Number.isFinite(n) || n <= 0) return null;
	if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
	if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(0)}M`;
	if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
	return `$${n.toFixed(0)}`;
}

function formatShortDate(iso: string | null | undefined): string {
	if (!iso) return '—';
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return '—';
	return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
}

function countryCode(countryName: string): string {
	const map: Record<string, string> = {
		'United States': 'US', USA: 'US', 'United Kingdom': 'GB', UK: 'GB',
		Germany: 'DE', France: 'FR', Italy: 'IT', Spain: 'ES', Netherlands: 'NL',
		Sweden: 'SE', Switzerland: 'CH', Belgium: 'BE', Austria: 'AT', Poland: 'PL',
		India: 'IN', China: 'CN', Japan: 'JP', Singapore: 'SG', Australia: 'AU',
		Brazil: 'BR', Canada: 'CA', Portugal: 'PT',
	};
	return map[countryName] ?? countryName.slice(0, 2).toUpperCase();
}
