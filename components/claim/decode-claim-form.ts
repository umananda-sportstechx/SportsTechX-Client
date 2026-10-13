import type { ClaimForm, RoundRow, MnaRow, FundRow, PortfolioRow } from './claim-form';
import { RAISE_AMOUNTS } from './claim-form';
import { parseAmount } from './build-claim-dto';
import type { ClaimReference } from './use-claim-reference';

/**
 * Inverse of `build-claim-dto.ts`: turns a claim's stored submission (from
 * `GET /api/claims/:id/form`) back into wizard form fields, so a verified or
 * pending owner can edit exactly what they entered.
 *
 * Some fields are intentionally lossy (they are already lossy going the other
 * way): thesis sectors use custom labels that don't all map to the taxonomy, the
 * revenue-stage map is many→one, and raise/cheque amounts only round-trip for
 * the discrete `RAISE_AMOUNTS` buckets. Unmatched values come back blank rather
 * than wrong — they are never fabricated.
 *
 * Identity name/city/country are not recovered (never stored, and not needed to
 * resubmit — only email + position are, and those come from the claim row).
 */
const s = (v: unknown): string => (v == null ? '' : String(v));
const numStr = (v: unknown): string => (v == null || v === '' ? '' : String(v));
const arr = (v: unknown): any[] => (Array.isArray(v) ? v : []); // eslint-disable-line @typescript-eslint/no-explicit-any

// Stored USD number → the `RAISE_AMOUNTS` bucket it came from (exact match only).
const AMOUNT_LABEL = new Map<number, string>();
for (const l of RAISE_AMOUNTS) { const n = parseAmount(l); if (n != null) AMOUNT_LABEL.set(n, l); }
const amountLabel = (v: unknown): string => {
	const n = typeof v === 'number' ? v : Number(v);
	return Number.isFinite(n) && AMOUNT_LABEL.has(n) ? AMOUNT_LABEL.get(n)! : '';
};

// Reverse of build-claim-dto's REVENUE_STAGE_MAP (many→one: 'growth' picks one).
const REVENUE_REVERSE: Record<string, string> = {
	pre_revenue: 'Pre-Revenue', early_revenue: 'Early Revenue', growth: 'Product-Market Fit', profitable: 'Late Stage',
};

export function decodeClaimForm(data: Record<string, unknown>, ref: ClaimReference): Partial<ClaimForm> {
	const sectorName = new Map(ref.sectors.map((o) => [o.id, o.name]));
	const techName = new Map(ref.techTags.map((o) => [o.id, o.name]));
	const roundName = new Map(ref.roundTypes.map((o) => [o.id, o.name]));

	const base: Partial<ClaimForm> = {
		name: s(data.target_name_snapshot),
		website: s(data.target_website_snapshot).replace(/^https?:\/\//, ''),
		email: s(data.company_email),
		position: s(data.position_at_company),
	};

	const co = data.company as Record<string, unknown> | undefined;
	if (co) {
		const d = (co.details ?? {}) as Record<string, unknown>;
		return {
			...base,
			raising: d.actively_raising === true,
			raiseMin: amountLabel(d.raising_amount_min_usd),
			raiseMax: amountLabel(d.raising_amount_max_usd),
			valuation: s(d.raising_valuation_note),
			roundNames: arr(d.round_names).map(String),
			description: s(d.description),
			sector: d.sector_id ? (sectorName.get(String(d.sector_id)) ?? '') : '',
			businessModel: s(d.business_model) || 'B2B',
			founded: numStr(d.founded_year),
			coCity: s(d.hq_city),
			coCountry: s(d.hq_country),
			sport: s(d.sport),
			programs: s(d.program_participation),
			twitter: s(d.twitter_url), instagram: s(d.instagram_url), facebook: s(d.facebook_url),
			linkedin_co: s(d.linkedin_url), companyEmail: s(d.public_email),
			contactFirst: s(d.contact_first_name), contactLast: s(d.contact_last_name),
			contactPosition: s(d.contact_position), contactEmail: s(d.contact_email), contactLinkedin: s(d.contact_linkedin),
			rounds: arr(co.funding_rounds).map((r): RoundRow => ({
				roundType: s(r.round_label) || (r.round_type_id ? roundName.get(String(r.round_type_id)) ?? '' : ''),
				amount: numStr(r.amount_usd), date: s(r.round_date), investors: s(r.investors), source: s(r.source_url),
			})),
			mna: arr(co.mna).map((m): MnaRow => ({
				dealType: s(m.deal_type) || 'Acquisition', counterparty: s(m.counterparty), amount: numStr(m.amount_usd), date: s(m.deal_date),
			})),
		};
	}

	const inv = data.investor as Record<string, unknown> | undefined;
	if (inv) {
		const d = (inv.details ?? {}) as Record<string, unknown>;
		const fd = (d.fund_data ?? {}) as Record<string, unknown>;
		const sectors = arr(inv.thesis_sectors).map((id) => sectorName.get(String(id))).filter(Boolean) as string[];
		const tech = arr(inv.thesis_tech_tags).map((id) => techName.get(String(id))).filter(Boolean) as string[];
		const continents = arr(d.thesis_continents).map(String);
		const stages = arr(d.thesis_funding_stages).map(String);
		const revenue = arr(inv.thesis_revenue_stages).map((x) => REVENUE_REVERSE[String(x)]).filter(Boolean) as string[];
		return {
			...base,
			invCategory: s(d.category), aum: s(fd.aum), focus: s(fd.focus),
			yearLaunched: numStr(d.year_launched), description: s(d.description),
			coCity: s(d.hq_city), coCountry: s(d.hq_country),
			twitter: s(d.twitter_url), instagram: s(d.instagram_url), facebook: s(d.facebook_url),
			linkedin_co: s(d.linkedin_url), companyEmail: s(d.public_email),
			contactName: s(d.contact_name), contactPosition: s(d.contact_position),
			contactEmail: s(d.contact_email), contactLinkedin: s(d.contact_linkedin),
			minInv: amountLabel(d.thesis_amount_min_usd), maxInv: amountLabel(d.thesis_amount_max_usd),
			continents, fundingStages: stages, thesisSectors: sectors, techPrefs: tech, revenueStages: revenue,
			buildThesis: sectors.length > 0 || tech.length > 0 || continents.length > 0 || stages.length > 0
				|| revenue.length > 0 || !!d.thesis_amount_min_usd || !!d.thesis_amount_max_usd,
			funds: arr(inv.funds).map((f): FundRow => ({ name: s(f.name), year: numStr(f.fund_year), size: numStr(f.size_usd) })),
			portfolio: arr(inv.portfolio).map((p): PortfolioRow => ({ name: s(p.company_name), stage: s(p.stage), year: numStr(p.invest_year) })),
		};
	}

	const ent = data.entity as Record<string, unknown> | undefined;
	if (ent) {
		const d = (ent.details ?? {}) as Record<string, unknown>;
		return {
			...base,
			opType: s(d.op_type) || 'Accelerator',
			description: s(d.description),
			coCity: s(d.location), coCountry: s(d.country),
			appsOpen: d.applications_open === true,
			intake: s(d.next_intake), keyDate: s(d.key_date), offer: s(d.offer),
		};
	}
	return base;
}
