/**
 * Shapes the API actually sends and accepts.
 *
 * Why this file exists: response types were previously re-declared per
 * component — `Deal` six times with mutually incompatible nullability,
 * `DealsResponse` four times, each pointing at a different `Deal`. When the
 * real backend landed, every one of those had to be reconciled by hand and
 * `tsc` only caught the mismatches it happened to see.
 *
 * ## Rules for anything added here
 *
 * **Derive read types from the repository's `db.rows<…>()` generic, not from
 * the controller's declared return type.** The server understates its own
 * payload: `deals.repository.ts` selects seventeen extra joined columns and
 * then casts them away with `as unknown as DealRow`. That cast is precisely
 * why six hand-written `Deal` interfaces each guessed a different subset.
 *
 * **Every type carries a comment naming the server file it mirrors.** That
 * comment is the drift detector — there is no codegen, and for one repo pair
 * a generated pipeline is not worth its upkeep. `npm run openapi:export` on
 * the server is the upgrade path if drift ever actually bites.
 *
 * **Write payloads matter more than read types.** The server DTOs are Zod
 * `.strict()`, so one unknown key is a 400, not a silently ignored field.
 */

/** Mirrors `server/src/common/pagination/page-query.dto.ts` → `Page<T>`.
 *  `total` and `totalPages` are -1 when the caller used cursor mode. */
export interface Page<T> {
	data: T[];
	total: number;
	page: number;
	limit: number;
	offset: number;
	totalPages: number;
	nextCursor: string | null;
}

/**
 * Mirrors `server/src/modules/newsletter/newsletter.service.ts` →
 * `NewsletterArticle`. Parsed from the Beehiiv RSS feed and cached, so this is
 * the feed's vocabulary rather than a database row: `pubDate` is an RSS date
 * string and `categories` are free-text labels, not a taxonomy.
 *
 * Served as a bare array from `GET /api/newsletter/articles` — not a `Page`.
 */
export interface NewsletterArticle {
	/** Derived from the title, stable across cache refreshes. Detail-page key. */
	slug: string;
	title: string;
	/** Canonical Beehiiv URL for the issue. */
	link: string;
	description: string;
	content: string;
	thumbnail: string;
	pubDate: string;
	author: string;
	categories: string[];
}

/** Enums mirrored from `server/src/db/types.ts`. Narrow unions rather than
 *  `string`, so a typo in a comparison is a compile error. */
export type BusinessModel = 'b2b' | 'b2c' | 'b2b2c' | 'd2c' | 'b2g' | 'other';
export type DealStatus = 'active' | 'inactive' | 'not_sportstech' | 'website_error';
export type DealSizeBucket = 'under_1m' | 'from_1m_to_10m' | 'from_10m_to_100m' | 'over_100m';

/** One investor on a deal. From the `investor_links` jsonb aggregate in
 *  `deals.repository.ts` `list()`. */
export interface DealInvestorLink {
	name: string;
	slug: string | null;
	is_lead: boolean | null;
}

/**
 * A funding round as `GET /api/deals` sends it — `Page<Deal>`.
 *
 * Mirrors `server/src/modules/deals/deals.repository.ts` `list()`: the CTE
 * selects `d.*` (so every column of `DealRow` in `server/src/db/types.ts` is
 * present) and the outer query adds the joined block below. The repository
 * then casts the result back to the bare `DealRow`, which is why this is
 * derived from the `db.rows<…>` generic and not from the method's return type.
 *
 * `amount` / `amount_usd` / `total_funding_usd` are Postgres `numeric`, which
 * the driver hands back as **strings** to protect precision — never arithmetic
 * without `Number()` first. `Date` columns arrive as ISO strings over JSON.
 *
 * Every consumer of `Deal` calls this one endpoint (`qk.deals.list`), so these
 * fields are guaranteed rather than optional. There is no `round_type` field —
 * the round reaches the client as `round_type_name` / `round_type_slug`.
 */
export interface Deal {
	// --- deals.* (via `SELECT d.*`) ---
	id: string;
	company_id: string;
	round_type_id: string | null;
	announced_date: string | null;
	announced_year: number | null;
	amount: string | null;
	amount_usd: string | null;
	currency_code: string | null;
	deal_size_bucket: DealSizeBucket | null;
	status: DealStatus;
	sector_id: string | null;
	business_model: BusinessModel | null;
	source_url: string | null;
	transaction_url: string | null;
	location_id: string | null;
	added_by_profile_id: string | null;
	created_at: string;
	updated_at: string;
	// --- joined by `list()` ---
	company_name: string | null;
	company_slug: string | null;
	company_website: string | null;
	company_custom_logo_url: string | null;
	company_description: string | null;
	company_is_verified: boolean | null;
	primary_sector: string | null;
	sector_slug: string | null;
	round_type_name: string | null;
	round_type_slug: string | null;
	/** Deal location, falling back to the company's HQ. */
	hq_city: string | null;
	hq_country: string | null;
	/** Sum of every disclosed round for the same company, not this deal. */
	total_funding_usd: string | null;
	lead_investor: string | null;
	investors: string[] | null;
	investor_links: DealInvestorLink[] | null;
}
