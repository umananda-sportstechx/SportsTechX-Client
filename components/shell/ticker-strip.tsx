'use client';

import { useQuery } from '@tanstack/react-query';
import { qk } from '@/lib/query-keys';

interface DealRow {
	id: string;
	company_name?: string;
	amount_usd?: number | string | null;
	round_type?: string | null;
	country_code?: string | null;
}

interface DealsResponse {
	data: Array<{
		id: string;
		amount_usd: number | string | null;
		round_type: string | null;
		// company name may come as nested join — handle both shapes.
		company?: { name: string };
		company_name?: string;
		country_code?: string | null;
	}>;
}

// PLACEHOLDER — mirrors the prototype's mock ticker feed so the marquee never
// renders an array of dashes when the API is empty or missing fields.
const MOCK_TICKER: DealRow[] = [
	{ id: 'mt-1',  company_name: 'Pickleball.com',          amount_usd: 225_000_000, round_type: 'Growth',   country_code: 'BA' },
	{ id: 'mt-2',  company_name: 'Teamworks',               amount_usd: 100_000_000, round_type: 'Series C', country_code: 'US' },
	{ id: 'mt-3',  company_name: 'Fastbreak AI',            amount_usd: 80_000_000,  round_type: 'Series B', country_code: 'US' },
	{ id: 'mt-4',  company_name: 'ASB GlassFloor',          amount_usd: 30_000_000,  round_type: 'Series A', country_code: 'DE' },
	{ id: 'mt-5',  company_name: 'Metasports Interactive',  amount_usd: 20_000_000,  round_type: 'Series B', country_code: 'IN' },
	{ id: 'mt-6',  company_name: 'Hoopers',                 amount_usd: 15_900_000,  round_type: 'Series A', country_code: 'PT' },
	{ id: 'mt-7',  company_name: 'Gemini Sports Analytics', amount_usd: 15_100_000,  round_type: 'Series A', country_code: 'US' },
	{ id: 'mt-8',  company_name: 'PlayReplay',              amount_usd: 12_000_000,  round_type: 'Series A', country_code: 'SE' },
	{ id: 'mt-9',  company_name: 'VisioLab',                amount_usd: 11_000_000,  round_type: 'Series A', country_code: 'DE' },
	{ id: 'mt-10', company_name: 'SportsVisio',             amount_usd: 8_000_000,   round_type: 'Seed',     country_code: 'US' },
	{ id: 'mt-11', company_name: 'Myocene',                 amount_usd: 6_200_000,   round_type: 'Seed',     country_code: 'BE' },
	{ id: 'mt-12', company_name: '1080Motion',              amount_usd: 3_600_000,   round_type: 'Series A', country_code: 'SE' },
	{ id: 'mt-13', company_name: 'Sportvot',                amount_usd: 3_600_000,   round_type: 'Series A', country_code: 'IN' },
	{ id: 'mt-14', company_name: 'Riterz AG',               amount_usd: 3_000_000,   round_type: 'Seed',     country_code: 'CH' },
	{ id: 'mt-15', company_name: 'Pressbox Studio',         amount_usd: 2_000_000,   round_type: 'Seed',     country_code: 'US' },
	{ id: 'mt-16', company_name: 'Metafare',                amount_usd: 1_000_000,   round_type: 'Pre-seed', country_code: 'SA' },
];

/**
 * Live ticker strip showing latest dealflow.
 *
 * Wired to GET /api/deals (most recent 16 deals). When the API returns nothing
 * OR returns rows without amounts/rounds, the row falls through to the
 * matching MOCK_TICKER entry so the marquee never reads as a string of "—"s.
 */
export function TickerStrip() {
	const { data } = useQuery<DealsResponse>({
		queryKey: qk.deals.list({ limit: 16, sort: '-announced_date' }),
		staleTime: 5 * 60_000,
		gcTime: 30 * 60_000,
		refetchOnWindowFocus: false,
	});

	const apiItems: DealRow[] = (data?.data ?? []).map((d, i) => {
		const fallback = MOCK_TICKER[i % MOCK_TICKER.length];
		const amount = toNumber(d.amount_usd);
		return {
			id: d.id,
			company_name: d.company?.name ?? d.company_name ?? fallback.company_name,
			amount_usd: amount && amount > 0 ? amount : fallback.amount_usd,
			round_type: d.round_type ?? fallback.round_type,
			country_code: d.country_code ?? fallback.country_code,
		};
	});

	const items = apiItems.length > 0 ? apiItems : MOCK_TICKER;
	// Duplicate the items so the marquee animation has a seamless wrap-around.
	const trackItems = items.concat(items);

	return (
		<div className="ticker">
			<div className="ticker-label">
				<span className="live-dot" style={{ marginRight: 8 }} />
				Live · Latest dealflow
			</div>
			<div className="ticker-mask">
				<div className="ticker-track">
					{trackItems.map((d, i) => (
						<span key={`${d.id}-${i}`} className="ticker-item">
							<span className="tk-co">{d.company_name}</span>
							<span className="tk-amt">{formatTickerAmount(d.amount_usd)}</span>
							<span style={{ color: 'var(--fg-muted)' }}>{d.round_type ?? 'Round'}</span>
							<span className="tk-sep">|</span>
						</span>
					))}
				</div>
			</div>
		</div>
	);
}

function toNumber(value: number | string | null | undefined): number {
	if (value == null) return 0;
	const n = typeof value === 'string' ? Number(value) : value;
	return Number.isFinite(n) ? n : 0;
}

function formatTickerAmount(value: number | string | null | undefined): string {
	const n = toNumber(value);
	if (n === 0) return '$—';
	if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
	if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
	if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
	return `$${n.toFixed(0)}`;
}
