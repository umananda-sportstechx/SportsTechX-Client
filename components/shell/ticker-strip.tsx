'use client';

import useSWR from 'swr';
import { qk } from '@/lib/query-keys';
import { Flag } from '@/components/ui/atoms';

interface DealRow {
	id: string;
	company_name?: string;
	amount_usd?: number | string | null;
	round_type?: string | null;
	round_type_name?: string | null;
	country_code?: string | null;
	hq_country?: string | null;
}

interface DealsResponse {
	data: Array<{
		id: string;
		amount_usd: number | string | null;
		round_type: string | null;
		round_type_name?: string | null;
		// Company name may come as nested join — handle both shapes.
		company?: { name: string };
		company_name?: string;
		country_code?: string | null;
		hq_country?: string | null;
	}>;
}

/**
 * Live ticker strip — most recent 16 disclosed deals, scrolling.
 *
 * Ported visually from `ui_design_2/app/nav.jsx:163-183`: shows
 * `{company} ${amount} {flag} {round} |` per item.
 *
 * Wired to GET /api/deals (limit 16, sort=-announced_date). Real data only;
 * the strip is hidden when the API returns nothing rather than falling back
 * to fake rows — the placeholder mock feed used to live here but contradicted
 * the "no mock data" guidance.
 */
export function TickerStrip() {
	const { data } = useSWR<DealsResponse>(
		qk.deals.list({ limit: 16, sort: '-announced_date' }),
		{ dedupingInterval: 5 * 60_000, revalidateOnFocus: false },
	);

	const items: DealRow[] = (data?.data ?? [])
		.map((d) => ({
			id: d.id,
			company_name: d.company?.name ?? d.company_name ?? '—',
			amount_usd: d.amount_usd,
			round_type: d.round_type_name ?? d.round_type ?? null,
			country_code: d.country_code ?? (d.hq_country ? countryCode(d.hq_country) : null),
		}))
		// Only show rows that have meaningful content — name + something to read.
		.filter((d) => d.company_name && d.company_name !== '—');

	if (items.length === 0) {
		return (
			<div className="ticker">
				<div className="ticker-label">
					<span className="live-dot" style={{ marginRight: 8 }} />
					Live · Latest dealflow
				</div>
				<div className="ticker-mask">
					<div className="ticker-track" style={{ color: 'var(--fg-muted)', fontStyle: 'italic' }}>
						No recent deals on the wire.
					</div>
				</div>
			</div>
		);
	}

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
							{d.country_code && <Flag cc={d.country_code} />}
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

function countryCode(countryName: string): string {
	const map: Record<string, string> = {
		'United States': 'US', USA: 'US', 'United Kingdom': 'GB', UK: 'GB',
		Germany: 'DE', France: 'FR', Italy: 'IT', Spain: 'ES', Netherlands: 'NL',
		'The Netherlands': 'NL', Sweden: 'SE', Switzerland: 'CH', Belgium: 'BE',
		Austria: 'AT', Poland: 'PL', India: 'IN', China: 'CN', Japan: 'JP',
		Singapore: 'SG', Australia: 'AU', Brazil: 'BR', Canada: 'CA', Portugal: 'PT',
		'Saudi Arabia': 'SA', Israel: 'IL', Ireland: 'IE', Finland: 'FI',
		Norway: 'NO', Denmark: 'DK', Mexico: 'MX', Argentina: 'AR',
		'South Korea': 'KR', Korea: 'KR', Indonesia: 'ID', Vietnam: 'VN',
	};
	return map[countryName] ?? countryName.slice(0, 2).toUpperCase();
}
