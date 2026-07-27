'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import useSWR from 'swr';
import { ArrowRight, Send, Heart } from 'lucide-react';
import { qk } from '@/lib/query-keys';
import { openClaim } from '@/lib/claim-events';
import { useFavorite } from '@/hooks/use-favorite';
import { Drawer, DrawerHead, DrawerTabs, DrawerBody, DrawerFoot } from './drawer';
import { Flag, Tag, KV, Empty, VerifiedBadge, Logo } from './atoms';

interface Investor {
	id: string;
	name: string;
	slug?: string;
	website?: string | null;
	logo_url?: string | null;
	description?: string | null;
	thesis?: string | null;
	category?: string | null;
	hq_country?: string | null;
	hq_city?: string | null;
	total_aum_usd?: number | string | null;
	total_funding?: number | string | null;
	deals_count?: number | null;
	num_investments?: number | null;
	year_launched?: number | null;
	is_verified?: boolean | null;
	actively_investing?: boolean | null;
	primary_focus?: string | null;
	recent_investment?: string | null;
}

interface Deal {
	id: string;
	company_name?: string | null;
	company_slug?: string | null;
	announced_date?: string | null;
	amount_usd?: number | string | null;
	round_type_name?: string | null;
	round_type?: string | null;
	primary_sector?: string | null;
	primary_sector_slug?: string | null;
	hq_country?: string | null;
}

interface DealsResponse { data: Deal[] }

type Tab = 'general' | 'portfolio' | 'analytics';

const TYPE_LABELS: Record<string, string> = {
	venture_capital: 'VC',
	private_equity: 'PE',
	financial_services: 'CVC',
	family_investment_office: 'Family Office',
	sovereign_wealth_fund: 'SWF',
	angel: 'Angel',
	other: 'Other',
};

const TYPE_COLORS: Record<string, string> = {
	venture_capital: 'oklch(62% 0.18 240)',
	financial_services: 'oklch(62% 0.16 160)',
	private_equity: 'oklch(62% 0.18 30)',
	family_investment_office: 'oklch(62% 0.20 290)',
	sovereign_wealth_fund: 'oklch(62% 0.18 60)',
	angel: 'oklch(62% 0.18 350)',
	other: 'oklch(62% 0.04 240)',
};

export function InvestorDrawer({
	idOrSlug, onClose,
}: {
	idOrSlug: string | null;
	onClose: () => void;
}) {
	const router = useRouter();
	const [tab, setTab] = useState<Tab>('general');
	const [shareToast, setShareToast] = useState<string | null>(null);

	const { data: investor, isLoading } = useSWR<Investor>(
		idOrSlug ? qk.investors.detail(idOrSlug) : null,
		{ dedupingInterval: 5 * 60_000 },
	);

	const fav = useFavorite('investors', investor?.id);

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

	const { data: dealsResp } = useSWR<DealsResponse>(
		investor?.id ? qk.deals.list({ investor_id: investor.id, limit: 100, sort: '-announced_date' }) : null,
		{ dedupingInterval: 5 * 60_000 },
	);
	const deals = dealsResp?.data ?? [];

	const open = idOrSlug != null;
	const color = investor ? (TYPE_COLORS[investor.category ?? 'other'] ?? TYPE_COLORS.other) : TYPE_COLORS.other;
	const initials = investor?.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();

	return (
		<Drawer open={open} onClose={onClose} ariaLabel="Investor details">
			{!investor && isLoading && <DrawerBody><Empty msg="Loading…" /></DrawerBody>}
			{!investor && !isLoading && <DrawerBody><Empty msg="Investor not found" /></DrawerBody>}
			{investor && (
				<>
					<DrawerHead onClose={onClose}>
						<Logo co={{ name: investor.name, website: investor.website, custom_logo_url: investor.logo_url, color, logo: initials }} size={40} />
						<div style={{ flex: 1, minWidth: 0 }}>
							<div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
								<button
									className="co-drawer-name"
									onClick={() => {
										const target = investor.slug ?? investor.id;
										router.push(`/investors/${target}`);
									}}
									title="Open full profile"
								>
									{investor.name}
								</button>
								{investor.is_verified && <VerifiedBadge size={15} title="Verified investor" />}
								{investor.category && <Tag>{TYPE_LABELS[investor.category] ?? investor.category}</Tag>}
							</div>
							{investor.primary_focus && (
								<div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 2 }}>
									{investor.primary_focus}
								</div>
							)}
						</div>
						<div style={{ display: 'flex', gap: 4, position: 'relative' }}>
							<button className="icon-btn" title="Share" onClick={onShare}><Send size={14} /></button>
							<button
								className="icon-btn"
								title={fav.isFavorite ? 'Saved' : 'Save'}
								aria-pressed={fav.isFavorite}
								disabled={fav.pending}
								onClick={() => void fav.toggle()}
							>
								<Heart size={14} style={fav.isFavorite ? { color: 'var(--accent)', fill: 'currentColor' } : undefined} />
							</button>
							{shareToast && (
								<span
									style={{
										position: 'absolute',
										top: '100%',
										right: 0,
										marginTop: 6,
										whiteSpace: 'nowrap',
										background: 'var(--fg)',
										color: 'var(--bg)',
										padding: '4px 10px',
										borderRadius: 4,
										fontSize: 11,
										fontWeight: 600,
										zIndex: 50,
									}}
								>
									{shareToast}
								</span>
							)}
						</div>
					</DrawerHead>

					<DrawerTabs
						tabs={[
							{ key: 'general', label: 'General' },
							{ key: 'portfolio', label: 'Portfolio', count: deals.length },
							{ key: 'analytics', label: 'Analytics' },
						]}
						current={tab}
						onTab={(k) => setTab(k as Tab)}
					/>

					<DrawerBody>
						{tab === 'general' && <General investor={investor} />}
						{tab === 'portfolio' && <Portfolio deals={deals} />}
						{tab === 'analytics' && <Analytics deals={deals} />}
					</DrawerBody>

					<DrawerFoot>
						{!investor.is_verified && (
							<button
								className="btn ghost"
								onClick={() => openClaim({ role: 'investor', id: investor.id, name: investor.name, website: investor.website })}
								title="Is this your firm?"
							>
								Claim
							</button>
						)}
						<button
							className="btn"
							onClick={() => {
								const target = investor.slug ?? investor.id;
								router.push(`/investors/${target}`);
							}}
						>
							Open full profile <ArrowRight size={12} />
						</button>
					</DrawerFoot>
				</>
			)}
		</Drawer>
	);
}

function General({ investor }: { investor: Investor }) {
	const cc = investor.hq_country ? countryCode(investor.hq_country) : '';
	const hq = [investor.hq_city, investor.hq_country].filter(Boolean).join(', ');
	return (
		<div>
			{(investor.thesis || investor.description) && (
				<p className="co-drawer-desc">{investor.thesis ?? investor.description}</p>
			)}
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
				{investor.category && (
					<KV label="Type" value={<Tag>{TYPE_LABELS[investor.category] ?? investor.category}</Tag>} />
				)}
				{investor.year_launched && <KV label="Launched" value={investor.year_launched} />}
				<KV label="AUM" value={<b>{formatDollars(investor.total_aum_usd ?? investor.total_funding)}</b>} />
				{(investor.deals_count ?? investor.num_investments) != null && (
					<KV label="Deals" value={investor.deals_count ?? investor.num_investments} />
				)}
				{investor.recent_investment && <KV label="Recent" value={investor.recent_investment} />}
			</div>
		</div>
	);
}

function Portfolio({ deals }: { deals: Deal[] }) {
	if (deals.length === 0) {
		return <div className="co-empty">No portfolio deals on record yet.</div>;
	}
	return (
		<div>
			<h4 className="co-drawer-h4">Recent investments</h4>
			<div className="co-rounds">
				{deals.map((d) => (
					<div key={d.id} className="co-round">
						<div className="co-round-dot" />
						<div style={{ flex: 1 }}>
							<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
								<span style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{d.company_name ?? '—'}</span>
								<span className="num" style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
									{formatDollars(d.amount_usd)}
								</span>
							</div>
							<div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>
								{d.announced_date ? formatShortDate(d.announced_date) : '—'}
								{d.round_type_name && <> · {d.round_type_name}</>}
							</div>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

function Analytics({ deals }: { deals: Deal[] }) {
	if (deals.length === 0) {
		return <div className="co-empty">Not enough activity to chart yet.</div>;
	}
	const totalDeployed = deals.reduce((sum, d) => sum + (Number(d.amount_usd ?? 0) || 0), 0);
	const companies = new Set(deals.map((d) => d.company_slug ?? d.company_name).filter(Boolean)).size;
	const sectors = new Set(deals.map((d) => d.primary_sector).filter(Boolean));
	const countries = new Set(deals.map((d) => d.hq_country).filter(Boolean));

	const byYear = new Map<number, { count: number; amt: number }>();
	for (const d of deals) {
		if (!d.announced_date) continue;
		const y = new Date(d.announced_date).getFullYear();
		if (!Number.isFinite(y)) continue;
		const cur = byYear.get(y) ?? { count: 0, amt: 0 };
		cur.count += 1;
		cur.amt += Number(d.amount_usd ?? 0) || 0;
		byYear.set(y, cur);
	}
	const years = [...byYear.entries()].sort((a, b) => a[0] - b[0]);
	const maxYear = Math.max(1, ...years.map(([, v]) => v.count));

	const sectorCounts = new Map<string, number>();
	for (const d of deals) {
		if (d.primary_sector) sectorCounts.set(d.primary_sector, (sectorCounts.get(d.primary_sector) ?? 0) + 1);
	}
	const sectorRows = [...sectorCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
	const maxSector = Math.max(1, ...sectorRows.map(([, n]) => n));

	const stat = (label: string, value: string) => (
		<div style={{ flex: 1, minWidth: 0 }}>
			<div className="co-stat-label">{label}</div>
			<div className="co-stat-val">{value}</div>
		</div>
	);

	return (
		<div>
			<p style={{ fontSize: 11, color: 'var(--fg-muted)', marginBottom: 14 }}>
				Aggregated from tracked rounds — reflects total round size, not investor-specific allocation.
			</p>
			<div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
				{stat('Companies', String(companies))}
				{stat('Capital', formatDollars(totalDeployed))}
				{stat('Sectors', String(sectors.size))}
				{stat('Countries', String(countries.size))}
			</div>

			{years.length > 0 && (
				<div style={{ marginBottom: 20 }}>
					<h4 className="co-drawer-h4">Investment timeline</h4>
					<div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
						{years.map(([y, v]) => (
							<div key={y} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
								<span className="num" style={{ width: 38, fontSize: 11, color: 'var(--fg-muted)' }}>{y}</span>
								<div style={{ flex: 1, height: 8, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
									<div style={{ width: `${(v.count / maxYear) * 100}%`, height: '100%', background: 'var(--accent)' }} />
								</div>
								<span className="num" style={{ width: 56, textAlign: 'right', fontSize: 11 }}>{v.count} deal{v.count === 1 ? '' : 's'}</span>
								<span className="num" style={{ width: 54, textAlign: 'right', fontSize: 11, color: 'var(--fg-muted)' }}>{formatDollars(v.amt)}</span>
							</div>
						))}
					</div>
				</div>
			)}

			{sectorRows.length > 0 && (
				<div>
					<h4 className="co-drawer-h4">Top sectors</h4>
					<div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
						{sectorRows.map(([s, n]) => (
							<div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
								<span style={{ width: 130, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s}</span>
								<div style={{ flex: 1, height: 8, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
									<div style={{ width: `${(n / maxSector) * 100}%`, height: '100%', background: 'var(--accent-2)' }} />
								</div>
								<span className="num" style={{ width: 26, textAlign: 'right', fontSize: 11 }}>{n}</span>
							</div>
						))}
					</div>
				</div>
			)}
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
