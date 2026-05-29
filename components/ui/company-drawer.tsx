'use client';

/**
 * CompanyDrawer — quick-peek side panel triggered from companies list row.
 * Ported from `ui_design_2/app/company-detail.jsx:55-227`.
 *
 * Tabs: General / Funding / M&A. Header carries verified + raising badges.
 * "Open full profile →" CTA navigates to `/companies/[slug]`.
 */

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import useSWR from 'swr';
import { ArrowRight, Send, Heart, Link2, Lock, Plus, Zap } from 'lucide-react';
import { qk } from '@/lib/query-keys';
import { useFavorite } from '@/hooks/use-favorite';
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

interface Deal {
	id: string;
	announced_date?: string | null;
	amount_usd?: number | string | null;
	round_type_name?: string | null;
	round_type?: string | null;
	lead_investor?: string | null;
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
									href={company.website}
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
				{company.last_round_type && (
					<KV label="Last round" value={<Tag variant="pos">{company.last_round_type}</Tag>} />
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
			<PrimaryContactLocked />
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

	if (!company.contact_email && !company.website && socials.length === 0) return null;

	return (
		<>
			<h4 className="co-drawer-h4">Connect</h4>
			<div className="co-social-row">
				{company.contact_email ? (
					<a className="co-social co-social-mail" href={`mailto:${company.contact_email}`} title={company.contact_email}>
						<SocialIcon kind="mail" size={14} />
						<span>{company.contact_email}</span>
					</a>
				) : company.website ? (
					<a className="co-social co-social-mail" href={company.website} target="_blank" rel="noopener noreferrer" title={company.website}>
						<Link2 size={14} />
						<span>{company.website.replace(/^https?:\/\//, '')}</span>
					</a>
				) : null}
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

/** Pro-locked primary-contact teaser — lock visual, no fabricated data. */
function PrimaryContactLocked() {
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
					<button className="btn co-locked-btn" type="button">Upgrade to Pro</button>
				</div>
			</div>
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
							<div
								style={{
									fontSize: 11,
									color: 'var(--fg-muted)',
									display: 'flex',
									justifyContent: 'space-between',
								}}
							>
								<span>{r.announced_date ? formatShortDate(r.announced_date) : '—'}</span>
								{r.lead_investor && <span>Lead · {r.lead_investor}</span>}
							</div>
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

interface InvestorRow { name: string; rounds: number }

/** Lead-investor roster built from real `deal.lead_investor`, aggregated. */
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

function Investors({ investors, roundCount }: { investors: InvestorRow[]; roundCount: number }) {
	if (investors.length === 0) {
		return <div className="co-empty">No disclosed lead investors yet.</div>;
	}
	return (
		<div>
			<div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
				<MiniStat label="Lead investors" value={investors.length} />
				<MiniStat label="Rounds" value={roundCount} />
			</div>
			<h4 className="co-drawer-h4">Investor roster</h4>
			<div className="co-inv-list">
				{investors.map((inv) => {
					const initials = inv.name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
					return (
						<div key={inv.name} className="co-inv-row" style={{ cursor: 'default' }}>
							<span className="co-inv-logo">{initials}</span>
							<span className="co-inv-text">
								<span className="co-inv-name">{inv.name}</span>
								<span className="co-inv-meta">
									{inv.rounds} round{inv.rounds === 1 ? '' : 's'} led
								</span>
							</span>
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
