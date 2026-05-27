'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { qk } from '@/lib/query-keys';
import { Stat, SectionHead, Empty, Tag } from '@/components/ui/atoms';

/**
 * Investors deep dive — leaderboard by deal count + per-tier breakdown.
 * Reads `/api/investors` sorted by `-deal_count` (or equivalent) when the
 * column lands; falls back to the default `-created_at` sort.
 */

interface InvestorRow {
	id: string;
	name: string;
	slug?: string;
	category?: string | null;
	hq_country?: string | null;
	total_aum_usd?: number | string | null;
	deals_count?: number | null;
	primary_focus?: string | null;
	year_launched?: number | null;
}

interface InvestorsResponse { data: InvestorRow[]; total: number }

const TYPE_LABELS: Record<string, string> = {
	venture_capital: 'VC',
	private_equity: 'PE',
	financial_services: 'CVC',
	family_investment_office: 'Family Office',
	sovereign_wealth_fund: 'SWF',
	angel: 'Angel',
};

export function InvestorsTab() {
	const { data: list } = useSWR<InvestorsResponse>(
		qk.investors.list({ limit: 50, sort: '-created_at' }),
		{ dedupingInterval: 10 * 60_000 },
	);

	const investors = list?.data ?? [];
	const total = list?.total ?? 0;

	// Rank by deal count when present, otherwise by AUM.
	const ranked = [...investors].sort((a, b) => {
		const ac = a.deals_count ?? 0;
		const bc = b.deals_count ?? 0;
		if (ac !== bc) return bc - ac;
		return Number(b.total_aum_usd ?? 0) - Number(a.total_aum_usd ?? 0);
	});

	const totalAum = investors.reduce((s, i) => s + Number(i.total_aum_usd ?? 0), 0);
	const verifiedCount = investors.length; // proxy until backend exposes count separately
	const top = ranked.slice(0, 15);
	const max = Math.max(1, ...top.map((i) => i.deals_count ?? 0));

	return (
		<>
			<div className="grid-4" style={{ marginBottom: 'var(--space-5)' }}>
				<StatCard label="Tracked investors" value={{ value: total.toLocaleString(), unit: '' }} />
				<StatCard label="On-platform AUM" value={splitDollars(totalAum)} />
				<StatCard label="Active" value={{ value: verifiedCount.toString(), unit: '' }} />
				<StatCard
					label="Most active"
					value={{ value: top[0]?.name ?? '—', unit: '' }}
				/>
			</div>

			<div className="card">
				<SectionHead title="Most active investors" meta={`${top.length} ranked`} />
				{top.length === 0 ? (
					<Empty msg="No investor data yet." />
				) : (
					<div>
						{top.map((inv, i) => (
							<div key={inv.id} className="rank-row">
								<span className="rank-idx">{(i + 1).toString().padStart(2, '0')}</span>
								<span className="rank-name">
									<Link href={`/investors/${inv.slug ?? inv.id}`}>{inv.name}</Link>
									{inv.category && (
										<span style={{ marginLeft: 8, verticalAlign: 'middle' }}>
											<Tag>{TYPE_LABELS[inv.category] ?? inv.category}</Tag>
										</span>
									)}
								</span>
								<span className="rank-bar">
									<span style={{ transform: `scaleX(${(inv.deals_count ?? 0) / max})` }} />
								</span>
								<span className="rank-val">{inv.deals_count ?? 0} deals</span>
							</div>
						))}
					</div>
				)}
			</div>
		</>
	);
}

function StatCard({ label, value }: { label: string; value: { value: string; unit: string } }) {
	return (
		<div className="card" style={{ padding: 'var(--space-4)' }}>
			<Stat label={label} value={value.value} unit={value.unit} deltaDir="pos" />
		</div>
	);
}

function splitDollars(n: number): { value: string; unit: string } {
	if (!Number.isFinite(n) || n <= 0) return { value: '—', unit: '' };
	if (n >= 1_000_000_000) return { value: `$${(n / 1_000_000_000).toFixed(2)}`, unit: 'B' };
	if (n >= 1_000_000) return { value: `$${(n / 1_000_000).toFixed(1)}`, unit: 'M' };
	if (n >= 1_000) return { value: `$${(n / 1_000).toFixed(0)}`, unit: 'K' };
	return { value: `$${n.toFixed(0)}`, unit: '' };
}
