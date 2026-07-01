'use client';

/**
 * CompanyDrawer — quick-peek side panel triggered from companies list row.
 * Ported from `ui_design_2/app/company-detail.jsx:55-227`.
 *
 * Tabs: General / Funding / M&A. Header carries verified + raising badges.
 * "Open full profile →" CTA navigates to `/companies/[slug]`.
 */

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import useSWR from 'swr';
import { ArrowRight, Send, Heart, Link2, Lock, Plus, Zap } from 'lucide-react';
import { qk } from '@/lib/query-keys';
import { useFavorite } from '@/hooks/use-favorite';
import { useFeatureAccess } from '@/contexts/feature-access-context';

interface PrimaryContactData {
	id: string;
	full_name: string | null;
	job_position: string | null;
	email: string | null;
	linkedin_url: string | null;
	phone: string | null;
	role: string | null;
}
import { openClaim } from '@/lib/claim-events';
import {
	Drawer, DrawerHead, DrawerTabs, DrawerBody, DrawerFoot,
} from './drawer';
import {
	Logo, Flag, Tag, AudiencePill, VerifiedBadge, RaisingPill, KV, Empty,
} from './atoms';
import { WatchlistPicker } from './watchlist-picker';

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
	last_round_type?: string | null;
	last_deal_date?: string | null;
	deal_count?: number | null;
	business_model?: string | null;
	is_verified?: boolean | null;
	is_actively_raising?: boolean | null;
	is_unicorn?: boolean | null;
	// Optional socials — rendered only when the API provides them (no fakes).
	contact_email?: string | null;
	twitter_url?: string | null;
	instagram_url?: string | null;
	facebook_url?: string | null;
	linkedin_url?: string | null;
}

interface InvestorLink { name: string; slug?: string | null; is_lead?: boolean | null }

interface Deal {
	id: string;
	announced_date?: string | null;
	amount_usd?: number | string | null;
	round_type_name?: string | null;
	round_type?: string | null;
	lead_investor?: string | null;
	investors?: string[] | null;
	investor_links?: InvestorLink[] | null;
}

interface DealsResponse { data: Deal[] }

interface Acquisition {
	id: string;
	acquisition_date?: string | null;
	amount_usd?: number | string | null;
	acquirer_name?: string | null;
	acquiree_name?: string | null;
	acquisition_type?: string | null;
}

interface AcqResponse { data: Acquisition[] }

type Tab = 'general' | 'funding' | 'mna' | 'investors';

export function CompanyDrawer({
	idOrSlug, onClose,
}: {
	idOrSlug: string | null;
	onClose: () => void;
}) {
	const router = useRouter();
	const [tab, setTab] = useState<Tab>('general');
	const [shareToast, setShareToast] = useState<string | null>(null);
	const [pickerOpen, setPickerOpen] = useState(false);

	const { data: company, isLoading } = useSWR<Company>(
		idOrSlug ? qk.companies.detail(idOrSlug) : null,
		{ dedupingInterval: 5 * 60_000 },
	);

	const fav = useFavorite('companies', company?.id);

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

	const { data: dealsResp } = useSWR<DealsResponse>(
		company?.id ? qk.deals.list({ company_id: company.id, limit: 30, sort: '-announced_date' }) : null,
		{ dedupingInterval: 5 * 60_000 },
	);
	const deals = dealsResp?.data ?? [];

	const { data: acqResp } = useSWR<AcqResponse>(
		company?.id ? ['/api/acquisitions', { acquiree_company_id: company.id, limit: 20 }] : null,
		{ dedupingInterval: 5 * 60_000 },
	);
	const acquisitions = acqResp?.data ?? [];

	// Lead-investor roster derived from real deal data.
	const investors = buildInvestorRoster(deals);

	const open = idOrSlug != null;

	return (
		<Drawer open={open} onClose={onClose} ariaLabel="Company details">
			{!company && isLoading && (
				<DrawerBody>
					<Empty msg="Loading…" />
				</DrawerBody>
			)}
			{!company && !isLoading && (
				<DrawerBody>
					<Empty msg="Company not found" />
				</DrawerBody>
			)}
			{company && (
				<>
					<DrawerHead onClose={onClose}>
						<Logo co={{ name: company.name, website: company.website, custom_logo_url: company.custom_logo_url }} size={40} />
						<div style={{ flex: 1, minWidth: 0 }}>
							<div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
								<button
									className="co-drawer-name"
									onClick={() => {
										const target = company.slug ?? company.id;
										router.push(`/companies/${target}`);
									}}
									title="Open full profile"
								>
									{company.name}
								</button>
								{company.is_verified && <VerifiedBadge size={15} />}
								{company.is_actively_raising && <RaisingPill compact />}
							</div>
							{company.website && (
								<a
									href={/^https?:\/\//i.test(company.website) ? company.website : `https://${company.website}`}
									target="_blank"
									rel="noopener noreferrer"
									className="co-drawer-url"
								>
									{company.website.replace(/^https?:\/\//, '')}
								</a>
							)}
						</div>
						<div style={{ display: 'flex', gap: 4 }}>
							<button className="icon-btn" title="Share link" onClick={onShare}>
								<Send size={14} />
							</button>
							<button
								className="icon-btn"
								title={fav.isFavorite ? 'Saved' : 'Save'}
								disabled={fav.pending}
								onClick={() => void fav.toggle()}
							>
								<Heart
									size={14}
									style={fav.isFavorite ? { color: 'var(--accent)', fill: 'currentColor' } : undefined}
								/>
							</button>
							<button className="icon-btn" title="Add to watchlist" onClick={() => setPickerOpen(true)}>
								<Plus size={14} />
							</button>
						</div>
					</DrawerHead>

					{company.is_actively_raising && (
						<div className="co-drawer-raising">
							<Zap size={14} style={{ color: 'var(--pos)' }} />
							<span style={{ fontWeight: 700, fontSize: 12 }}>Actively raising</span>
							{company.last_round_type && (
								<span className="co-drawer-raising-meta">
									Next · {company.last_round_type}
								</span>
							)}
						</div>
					)}

					{shareToast && (
						<div
							style={{
								position: 'absolute',
								top: 12,
								left: '50%',
								transform: 'translateX(-50%)',
								background: 'var(--fg)',
								color: 'var(--bg)',
								padding: '6px 12px',
								borderRadius: 4,
								fontSize: 12,
								fontWeight: 600,
								zIndex: 1000,
								pointerEvents: 'none',
							}}
						>
							{shareToast}
						</div>
					)}

					<DrawerTabs
						tabs={[
							{ key: 'general', label: 'General' },
							{ key: 'funding', label: 'Funding', count: deals.length },
							{ key: 'mna', label: 'M&A', count: acquisitions.length },
							...(investors.length > 0 ? [{ key: 'investors', label: 'Investors', count: investors.length }] : []),
						]}
						current={tab}
						onTab={(k) => setTab(k as Tab)}
					/>

					<DrawerBody>
						{tab === 'general' && <General company={company} />}
						{tab === 'funding' && (
							<Funding
								company={company}
								deals={deals}
								onOpenFull={() => router.push(`/companies/${company.slug ?? company.id}`)}
							/>
						)}
						{tab === 'mna' && <Mna acquisitions={acquisitions} />}
						{tab === 'investors' && <Investors investors={investors} roundCount={deals.length} />}
					</DrawerBody>

					<DrawerFoot>
						{!company.is_verified && (
							<button
								className="btn ghost"
								onClick={() => openClaim({ role: 'founder', id: company.id, name: company.name, website: company.website })}
								title="Is this your company?"
							>
								Claim
							</button>
						)}
						<button
							className="btn"
							onClick={() => {
								const target = company.slug ?? company.id;
								router.push(`/companies/${target}`);
							}}
						>
							Open full profile <ArrowRight size={12} />
						</button>
					</DrawerFoot>
				</>
			)}
			{company && (
				<WatchlistPicker
					open={pickerOpen}
					onClose={() => setPickerOpen(false)}
					companyId={company.id}
					companyName={company.name}
				/>
			)}
		</Drawer>
	);
}

function General({ company }: { company: Company }) {
	const cc = company.hq_country ? countryCode(company.hq_country) : '';
	const hq = [company.hq_city, company.hq_country].filter(Boolean).join(', ');
	return (
		<div>
			{company.description && <p className="co-drawer-desc">{company.description}</p>}
			<div className="co-kv-list">
				{hq && (
					<KV
						label="Location"
						value={
							<span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
								{cc && <Flag cc={cc} />} {hq}
							</span>
						}
					/>
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
				{company.primary_sport && (
					<KV label="Sport" value={<Tag>{company.primary_sport}</Tag>} />
				)}
				{company.founded_year && <KV label="Founded" value={company.founded_year} />}
				{company.business_model && (
					<KV label="Business model" value={company.business_model.toUpperCase()} />
				)}
				<KV
					label="Total raised"
					value={<b>{formatDollars(company.total_funding_usd)}</b>}
				/>
				{(company.deal_count ?? 0) > 0 && (
					<KV label="Rounds tracked" value={company.deal_count} />
				)}
				{company.is_unicorn && <KV label="Unicorn" value="Yes 🦄" />}
			</div>

			<ConnectBlock company={company} />
			<PrimaryContact company={company} />
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

/** Connect block — real socials/website only, nothing fabricated. */
function ConnectBlock({ company }: { company: Company }) {
	const socials: Array<{ kind: 'twitter' | 'instagram' | 'facebook' | 'linkedin'; url: string }> = [];
	if (company.twitter_url) socials.push({ kind: 'twitter', url: company.twitter_url });
	if (company.instagram_url) socials.push({ kind: 'instagram', url: company.instagram_url });
	if (company.facebook_url) socials.push({ kind: 'facebook', url: company.facebook_url });
	if (company.linkedin_url) socials.push({ kind: 'linkedin', url: company.linkedin_url });

	if (!company.contact_email && socials.length === 0) return null;

	return (
		<>
			<h4 className="co-drawer-h4">Connect</h4>
			<div className="co-social-row">
				{company.contact_email && (
					<a className="co-social co-social-mail" href={`mailto:${company.contact_email}`} title={company.contact_email}>
						<SocialIcon kind="mail" size={14} />
						<span>{company.contact_email}</span>
					</a>
				)}
				{socials.length > 0 && (
					<div className="co-social-icons">
						{socials.map((s) => (
							<a key={s.kind} className="co-social-ico" href={s.url} target="_blank" rel="noopener noreferrer" title={s.kind}>
								<SocialIcon kind={s.kind} size={s.kind === 'twitter' ? 13 : 14} />
							</a>
						))}
					</div>
				)}
			</div>
		</>
	);
}

/**
 * Primary-contact block. Pro-gated via the `company_contacts` feature:
 *   - not entitled → upgrade teaser with a working link to /subscriptions;
 *   - entitled → the real contact, or an honest empty state. No fabricated data.
 */
function PrimaryContact({ company }: { company: Company }) {
	const access = useFeatureAccess('company_contacts');
	const entitled = !access.isLoading && !access.isLocked;
	const { data: contact } = useSWR<PrimaryContactData | null>(
		entitled ? qk.companies.contacts(company.id) : null,
	);

	if (access.isLoading) return null;

	if (access.isLocked) {
		return (
			<div className="co-locked-block" style={{ marginTop: 18 }}>
				<div className="co-locked-head">
					<h4 className="co-drawer-h4" style={{ margin: 0 }}>Primary contact</h4>
					<span className="co-pro-tag">PRO</span>
				</div>
				<div className="co-locked-stack">
					<div className="co-locked-cover">
						<div className="co-locked-icon"><Lock size={20} /></div>
						<div className="co-locked-title">Unlock contact details</div>
						<div className="co-locked-sub">Pro members can see the founder&apos;s email and LinkedIn for every company.</div>
						<Link href="/subscriptions" className="btn co-locked-btn">Upgrade to Pro</Link>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="co-locked-block" style={{ marginTop: 18 }}>
			<div className="co-locked-head">
				<h4 className="co-drawer-h4" style={{ margin: 0 }}>Primary contact</h4>
			</div>
			{contact ? (
				<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '4px 2px' }}>
					<div style={{ minWidth: 0 }}>
						<div style={{ fontWeight: 700 }}>{contact.full_name ?? '—'}</div>
						{(contact.role || contact.job_position) && (
							<div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 2 }}>
								{contact.role ?? contact.job_position}
							</div>
						)}
					</div>
					<div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
						{contact.linkedin_url && (
							<a href={contact.linkedin_url} target="_blank" rel="noreferrer" className="icon-btn" title="LinkedIn" aria-label="LinkedIn">
								<Link2 size={16} />
							</a>
						)}
						{contact.email && (
							<a href={`mailto:${contact.email}`} className="icon-btn" title={contact.email} aria-label="Email">
								<Send size={16} />
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

function Funding({ company, deals, onOpenFull }: { company: Company; deals: Deal[]; onOpenFull?: () => void }) {
	if (deals.length === 0) {
		return <div className="co-empty">No funding rounds on record yet.</div>;
	}
	return (
		<div>
			<div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
				<MiniStat label="Total raised" value={formatDollars(company.total_funding_usd)} />
				<MiniStat label="Last round" value={company.last_round_type ?? '—'} />
				<MiniStat label="Rounds" value={deals.length} />
			</div>
			<FundingByYearChart deals={deals} />
			<h4 className="co-drawer-h4">Round history</h4>
			<div className="co-rounds">
				{deals.map((r) => (
					<div key={r.id} className="co-round">
						<div className="co-round-dot" />
						<div style={{ flex: 1 }}>
							<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
								<span style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
									{r.round_type_name ?? r.round_type ?? '—'}
								</span>
								<span className="num" style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
									{formatDollars(r.amount_usd)}
								</span>
							</div>
							<div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>
								{r.announced_date ? formatShortDate(r.announced_date) : '—'}
							</div>
							{r.investor_links && r.investor_links.length > 0 && (
								<div style={{ fontSize: 11, marginTop: 3, display: 'flex', flexWrap: 'wrap', gap: 4, color: 'var(--fg-2)' }}>
									{r.investor_links.map((iv, i) => (
										<span key={(iv.slug ?? iv.name) + i}>
											{iv.slug ? (
												<Link
													href={`/investors/${iv.slug}`}
													onClick={(e) => e.stopPropagation()}
													style={{ color: 'var(--accent)', textDecoration: 'none' }}
												>
													{iv.name}
												</Link>
											) : (
												<span>{iv.name}</span>
											)}
											{iv.is_lead ? ' (lead)' : ''}{i < r.investor_links!.length - 1 ? ',' : ''}
										</span>
									))}
								</div>
							)}
						</div>
					</div>
				))}
			</div>
			{onOpenFull && (
				<button className="co-drawer-cta" type="button" onClick={onOpenFull}>
					View all analytics <ArrowRight size={12} />
				</button>
			)}
		</div>
	);
}

/** Funding raised per year — compact SVG bar chart (x = year, y = amount). */
function FundingByYearChart({ deals }: { deals: Deal[] }) {
	const byYear = new Map<number, number>();
	for (const d of deals) {
		if (!d.announced_date) continue;
		const y = new Date(d.announced_date).getUTCFullYear();
		if (!Number.isFinite(y)) continue;
		const amt = Number(d.amount_usd ?? 0);
		byYear.set(y, (byYear.get(y) ?? 0) + (Number.isFinite(amt) ? amt : 0));
	}
	if (byYear.size < 2) return null; // need at least two years to be worth a chart
	const years = [...byYear.keys()].sort((a, b) => a - b);
	const max = Math.max(...years.map((y) => byYear.get(y) ?? 0), 1);
	const W = 320, H = 90, pad = 18, bw = (W - pad) / years.length;
	return (
		<div style={{ marginBottom: 16 }}>
			<h4 className="co-drawer-h4">Funding by year</h4>
			<svg width="100%" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Funding raised per year">
				{years.map((y, i) => {
					const v = byYear.get(y) ?? 0;
					const h = Math.max(1, (v / max) * (H - pad - 14));
					const x = pad + i * bw;
					return (
						<g key={y}>
							<rect x={x} y={H - pad - h} width={Math.max(2, bw - 4)} height={h} rx={2} fill="var(--accent)">
								<title>{`${y}: ${formatDollars(v)}`}</title>
							</rect>
							<text x={x + (bw - 4) / 2} y={H - pad + 10} textAnchor="middle" fontSize={8} fill="var(--fg-muted)">
								{`'${String(y).slice(2)}`}
							</text>
						</g>
					);
				})}
			</svg>
		</div>
	);
}

function Mna({ acquisitions }: { acquisitions: Acquisition[] }) {
	if (acquisitions.length === 0) {
		return <div className="co-empty">No tracked acquisitions involving this company.</div>;
	}
	return (
		<div>
			<h4 className="co-drawer-h4">Acquisitions</h4>
			<div className="co-rounds">
				{acquisitions.map((m) => (
					<div key={m.id} className="co-round">
						<div className="co-round-dot" />
						<div style={{ flex: 1 }}>
							<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
								<span style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{m.acquirer_name ?? '—'}</span>
								<span className="num" style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
									{formatDollars(m.amount_usd)}
								</span>
							</div>
							<div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>
								{m.acquisition_date ? formatShortDate(m.acquisition_date) : '—'}
								{m.acquisition_type && <> · {m.acquisition_type}</>}
							</div>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

interface InvestorRow { name: string; slug?: string | null; rounds: number }

/** Investor roster across all rounds, aggregated by name. Prefers the linked
 *  slug (from the investors DB) so each row can deep-link to a profile. Falls
 *  back to the flat `investors`/`lead_investor` names when links are absent. */
function buildInvestorRoster(deals: Deal[]): InvestorRow[] {
	const byName = new Map<string, { slug?: string | null; rounds: number }>();
	deals.forEach((d) => {
		const links = d.investor_links?.length
			? d.investor_links
			: (d.investors ?? (d.lead_investor ? [d.lead_investor] : [])).map((n) => ({ name: n, slug: null }));
		for (const l of links) {
			const name = (l.name ?? '').trim();
			if (!name) continue;
			const prev = byName.get(name);
			byName.set(name, { slug: l.slug ?? prev?.slug ?? null, rounds: (prev?.rounds ?? 0) + 1 });
		}
	});
	return [...byName.entries()]
		.map(([name, v]) => ({ name, slug: v.slug, rounds: v.rounds }))
		.sort((a, b) => b.rounds - a.rounds || a.name.localeCompare(b.name));
}

function Investors({ investors, roundCount }: { investors: InvestorRow[]; roundCount: number }) {
	if (investors.length === 0) {
		return <div className="co-empty">No disclosed investors yet.</div>;
	}
	return (
		<div>
			<div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
				<MiniStat label="Investors" value={investors.length} />
				<MiniStat label="Rounds" value={roundCount} />
			</div>
			<h4 className="co-drawer-h4">Investor roster</h4>
			<div className="co-inv-list">
				{investors.map((inv) => {
					const initials = inv.name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
					const inner = (
						<>
							<span className="co-inv-logo">{initials}</span>
							<span className="co-inv-text">
								<span className="co-inv-name">{inv.name}</span>
								<span className="co-inv-meta">
									{inv.rounds} round{inv.rounds === 1 ? '' : 's'}
								</span>
							</span>
						</>
					);
					return inv.slug ? (
						<Link key={inv.name} href={`/investors/${inv.slug}`} className="co-inv-row" style={{ cursor: 'pointer', textDecoration: 'none', color: 'inherit' }}>
							{inner}
						</Link>
					) : (
						<div key={inv.name} className="co-inv-row" style={{ cursor: 'default' }}>
							{inner}
						</div>
					);
				})}
			</div>
		</div>
	);
}

function MiniStat({ label, value }: { label: string; value: React.ReactNode }) {
	return (
		<div className="co-mini-stat" style={{ flex: 1 }}>
			<div className="co-mini-stat-l">{label}</div>
			<div className="co-mini-stat-v">{value}</div>
		</div>
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
		Sweden: 'SE', Switzerland: 'CH', Belgium: 'BE', Austria: 'AT', Poland: 'PL',
		India: 'IN', China: 'CN', Japan: 'JP', Singapore: 'SG', Australia: 'AU',
		Brazil: 'BR', Canada: 'CA', Portugal: 'PT',
	};
	return map[countryName] ?? countryName.slice(0, 2).toUpperCase();
}
