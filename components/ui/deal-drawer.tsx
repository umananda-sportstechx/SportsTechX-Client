'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import useSWR from 'swr';
import { ArrowRight } from 'lucide-react';
import { qk } from '@/lib/query-keys';
import { Drawer, DrawerHead, DrawerTabs, DrawerBody, DrawerFoot } from './drawer';
import { Logo, Flag, Tag, KV, Empty } from './atoms';

interface Deal {
	id: string;
	company_id?: string | null;
	company_name?: string | null;
	company_slug?: string | null;
	announced_date?: string | null;
	announced_year?: number | null;
	amount_usd?: number | string | null;
	round_type_name?: string | null;
	round_type?: string | null;
	lead_investor?: string | null;
	primary_sector?: string | null;
	business_model?: string | null;
	deal_size_bucket?: string | null;
	valuation_usd?: number | string | null;
	hq_country?: string | null;
	country_code?: string | null;
}

interface DealInvestor {
	id: string;
	name: string;
	is_lead?: boolean | null;
}

interface InvestorsResponse { data: DealInvestor[] }

type Tab = 'general' | 'investors';

export function DealDrawer({
	id, onClose,
}: {
	id: string | null;
	onClose: () => void;
}) {
	const router = useRouter();
	const [tab, setTab] = useState<Tab>('general');

	const { data: deal, isLoading } = useSWR<Deal>(
		id ? qk.deals.detail(id) : null,
		{ dedupingInterval: 5 * 60_000 },
	);

	const { data: invResp } = useSWR<InvestorsResponse>(
		deal?.id ? qk.deals.investors(deal.id) : null,
		{ dedupingInterval: 5 * 60_000 },
	);
	const investors = invResp?.data ?? [];

	const open = id != null;
	const cc = deal?.country_code ?? (deal?.hq_country ? countryCode(deal.hq_country) : '');

	return (
		<Drawer open={open} onClose={onClose} ariaLabel="Deal details">
			{!deal && isLoading && <DrawerBody><Empty msg="Loading…" /></DrawerBody>}
			{!deal && !isLoading && <DrawerBody><Empty msg="Deal not found" /></DrawerBody>}
			{deal && (
				<>
					<DrawerHead onClose={onClose}>
						<Logo co={{ name: deal.company_name ?? '—' }} size={40} />
						<div style={{ flex: 1, minWidth: 0 }}>
							<button
								className="co-drawer-name"
								onClick={() => {
									if (deal.company_slug) router.push(`/companies/${deal.company_slug}`);
									else if (deal.company_id) router.push(`/companies/${deal.company_id}`);
								}}
								title="Open company profile"
							>
								{deal.company_name ?? '—'}
							</button>
							<div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 2 }}>
								{deal.round_type_name ?? deal.round_type ?? 'Round'} ·{' '}
								{deal.announced_date ? formatShortDate(deal.announced_date) : '—'}
							</div>
						</div>
					</DrawerHead>

					<DrawerTabs
						tabs={[
							{ key: 'general', label: 'General' },
							{ key: 'investors', label: 'Investors', count: investors.length },
						]}
						current={tab}
						onTab={(k) => setTab(k as Tab)}
					/>

					<DrawerBody>
						{tab === 'general' && <General deal={deal} cc={cc} />}
						{tab === 'investors' && <Investors investors={investors} leadName={deal.lead_investor} />}
					</DrawerBody>

					<DrawerFoot>
						<button className="btn" onClick={() => router.push(`/deals/${deal.id}`)}>
							Open full profile <ArrowRight size={12} />
						</button>
					</DrawerFoot>
				</>
			)}
		</Drawer>
	);
}

function General({ deal, cc }: { deal: Deal; cc: string }) {
	return (
		<div>
			<div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
				<MiniStat label="Amount" value={formatDollars(deal.amount_usd)} />
				<MiniStat label="Valuation" value={formatDollars(deal.valuation_usd)} />
				<MiniStat label="Round" value={deal.round_type_name ?? deal.round_type ?? '—'} />
			</div>
			<div className="co-kv-list">
				{deal.announced_date && (
					<KV label="Announced" value={formatShortDate(deal.announced_date)} />
				)}
				{deal.lead_investor && <KV label="Lead investor" value={deal.lead_investor} />}
				{deal.hq_country && (
					<KV
						label="HQ"
						value={
							<span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
								{cc && <Flag cc={cc} />} {deal.hq_country}
							</span>
						}
					/>
				)}
				{deal.primary_sector && <KV label="Sector" value={<Tag>{deal.primary_sector}</Tag>} />}
				{deal.business_model && <KV label="Business model" value={deal.business_model} />}
				{deal.deal_size_bucket && <KV label="Size bucket" value={deal.deal_size_bucket} />}
			</div>
		</div>
	);
}

function Investors({ investors, leadName }: { investors: DealInvestor[]; leadName?: string | null }) {
	if (investors.length === 0 && !leadName) {
		return <div className="co-empty">No investors listed.</div>;
	}
	const lead = investors.find((i) => i.is_lead);
	const others = investors.filter((i) => !i.is_lead);
	return (
		<div>
			{(lead || leadName) && (
				<>
					<h4 className="co-drawer-h4">Lead investor</h4>
					<div className="co-round">
						<div className="co-round-dot" style={{ background: 'var(--accent)' }} />
						<div style={{ fontWeight: 700 }}>{lead?.name ?? leadName}</div>
					</div>
				</>
			)}
			{others.length > 0 && (
				<>
					<h4 className="co-drawer-h4">Co-investors ({others.length})</h4>
					<div className="co-rounds">
						{others.map((i) => (
							<div key={i.id} className="co-round">
								<div className="co-round-dot" />
								<div>{i.name}</div>
							</div>
						))}
					</div>
				</>
			)}
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
