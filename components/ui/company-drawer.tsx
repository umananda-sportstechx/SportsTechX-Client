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
import { ArrowRight, Send, Heart, Plus, Zap } from 'lucide-react';
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

type Tab = 'general' | 'funding' | 'mna';

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
						]}
						current={tab}
						onTab={(k) => setTab(k as Tab)}
					/>

					<DrawerBody>
						{tab === 'general' && <General company={company} />}
						{tab === 'funding' && <Funding company={company} deals={deals} />}
						{tab === 'mna' && <Mna acquisitions={acquisitions} />}
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
		</div>
	);
}

function Funding({ company, deals }: { company: Company; deals: Deal[] }) {
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
