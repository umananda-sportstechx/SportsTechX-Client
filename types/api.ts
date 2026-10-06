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

export type CompanyStatus =
	| 'active' | 'inactive' | 'needs_review' | 'dead'
	| 'acquired' | 'ipo' | 'not_sportstech';

/**
 * A company as `GET /api/companies` sends it — `Page<CompanyListItem>`.
 *
 * Mirrors the `ListRow` generic in `server/src/modules/companies/
 * companies.repository.ts` `list()`: the CTE selects `c.*` (all of
 * `CompanyRow` in `server/src/db/types.ts`) and the outer query joins the
 * sector, location and primary sport.
 *
 * `total_funding_usd` is a **number**, not a string: the repository reads a
 * cached `bigint` and coerces it with `Number()` before returning, in both
 * the list and detail paths. Every other `numeric` on the API is still a
 * string, so this one is the exception.
 */
export interface CompanyListItem {
	// --- companies.* ---
	id: string;
	name: string;
	website: string;
	slug: string | null;
	custom_logo_url: string | null;
	description: string | null;
	status: CompanyStatus;
	founded_year: number | null;
	ipo_date: string | null;
	sector_id: string | null;
	business_model: BusinessModel | null;
	location_id: string | null;
	social_profile_id: string | null;
	is_verified: boolean;
	is_unicorn: boolean;
	is_actively_raising: boolean;
	poc_first_name: string | null;
	poc_last_name: string | null;
	poc_job_position: string | null;
	poc_email: string | null;
	poc_linkedin: string | null;
	accelerator: string | null;
	cohort: string | null;
	added_by_profile_id: string | null;
	created_at: string;
	updated_at: string;
	// --- joined by `list()` ---
	primary_sector: string | null;
	primary_sector_slug: string | null;
	hq_city: string | null;
	hq_country: string | null;
	primary_sport: string | null;
	total_funding_usd: number;
}

/**
 * A company as `GET /api/companies/:idOrSlug` sends it.
 *
 * Mirrors `detailSql()` in the same repository, which is a strict superset of
 * the list projection — hence `extends`. The repository's own `DetailRow`
 * declares only four of these eighteen extra columns and then casts the result
 * to the bare `CompanyRow`, so this is derived from the SQL, not the types.
 *
 * The socials come from the joined `social_profiles` row and are null whenever
 * the company has none — render them conditionally, never as empty links.
 */
export interface Company extends CompanyListItem {
	hq_region: string | null;
	twitter_url: string | null;
	instagram_url: string | null;
	facebook_url: string | null;
	linkedin_url: string | null;
	youtube_url: string | null;
	contact_email: string | null;
	sport_count: number;
	tech_tag_count: number;
	deal_count: number;
	last_deal_date: string | null;
	last_round_type: string | null;
}

export type InvestorCategory =
	| 'venture_capital' | 'private_equity' | 'financial_services'
	| 'family_investment_office' | 'sovereign_wealth_fund' | 'angel' | 'other';

/**
 * What both investor endpoints agree on: `investors.*` (mirrors `InvestorRow`
 * in `server/src/db/types.ts`) plus the location join and the deal count.
 *
 * Unlike companies, the investor detail projection is **not** a superset of
 * the list one — the list carries `thesis` and `total_aum_usd`, the detail
 * carries `hq_region` and the socials. Hence a shared base and two extensions
 * rather than one `extends` chain; picking either as "the" Investor is what
 * produced the two divergent local copies.
 */
interface InvestorBase {
	id: string;
	name: string;
	website: string | null;
	slug: string | null;
	description: string | null;
	status: 'active' | 'inactive' | 'paused';
	category: InvestorCategory | null;
	year_launched: number | null;
	location_id: string | null;
	social_profile_id: string | null;
	is_verified: boolean;
	actively_investing: boolean;
	keywords: string | null;
	num_employees: number | null;
	logo_url: string | null;
	total_funding: string | null;
	latest_funding: string | null;
	latest_funding_amount: string | null;
	last_raised_at: string | null;
	annual_revenue: string | null;
	num_exits: number | null;
	num_investments: number | null;
	analyst_notes: string | null;
	added_by_profile_id: string | null;
	created_at: string;
	updated_at: string;
	// --- joined by both projections ---
	deals_count: number | null;
	hq_city: string | null;
	hq_country: string | null;
}

/** `GET /api/investors` → `Page<InvestorListItem>`. Mirrors the `db.rows<…>`
 *  generic in `server/src/modules/investors/investors.repository.ts` `list()`. */
export interface InvestorListItem extends InvestorBase {
	thesis: string | null;
	total_aum_usd: string | null;
}

/** `GET /api/investors/:idOrSlug`. Mirrors `detailSql()` in the same
 *  repository, which joins `social_profiles` on top of the base. */
export interface Investor extends InvestorBase {
	hq_region: string | null;
	twitter_url: string | null;
	instagram_url: string | null;
	facebook_url: string | null;
	linkedin_url: string | null;
	youtube_url: string | null;
	contact_email: string | null;
}

/**
 * One event on a raise-pipeline record — `GET /api/raise/pipeline/:id/activity`
 * → `Page<PipelineActivity>`.
 *
 * Mirrors the literal select in `server/src/modules/raise/
 * raise-pipeline.repository.ts` (`SELECT type, payload, occurred_at`), which is
 * the whole projection: no id reaches the client, so render these by index.
 * `payload` is free-form jsonb that varies by `type` — narrow it at the use
 * site, don't widen this.
 */
export interface PipelineActivity {
	type: string;
	payload: Record<string, unknown> | null;
	occurred_at: string;
}

// ---------------------------------------------------------------------------
// Write payloads
//
// These mirror Zod `.strict()` schemas, so an unknown key is a 400 — not a
// silently ignored field. Keep them exact.
//
// Money fields are `z.coerce.number()` server-side, which accepts a numeric
// string, so `number | string` is deliberate: the forms hold `<input>` values.
// `.nullish()` becomes `?: T | null` — null clears a field, absent leaves it.
// ---------------------------------------------------------------------------

/** `POST /api/raise` (upsert) and `PATCH /api/raise`. Mirrors
 *  `raiseUpsertSchema` in `server/src/modules/raise/raise.dto.ts`.
 *
 *  Every field is optional by design: the setup wizard auto-saves step by
 *  step, so a PATCH carries whatever subset the founder just touched. */
export interface RaiseUpsert {
	company_id?: string | null;
	company_name?: string | null;
	company_website?: string | null;
	hq_country?: string | null;
	hq_city?: string | null;
	company_description?: string | null;
	company_category?: string[] | null;
	company_sector_id?: string | null;
	company_stage?: 'pre_seed' | 'seed' | 'series_a' | 'series_b_plus' | 'other' | null;
	revenue_status?: 'pre_revenue' | 'generating' | null;
	fundraising_process?: 'exploring' | 'preparing' | 'approaching' | 'due_diligence' | 'negotiating' | null;
	round_type?: 'pre_seed' | 'seed' | 'series_a' | 'series_b_plus' | 'bridge' | 'other' | null;
	target_amount?: number | string | null;
	committed_amount?: number | string | null;
	currency_code?: string | null;
	target_close_date?: string | null;
	valuation?: string | null;
	structure?: 'equity' | 'safe' | 'convertible' | 'undecided' | 'other' | null;
	lead_investor_status?: 'yes' | 'no' | 'in_discussion' | null;
	prior_capital_raised?: number | string | null;
	last_round_date?: string | null;
	annual_revenue?: number | string | null;
	revenue_growth_pct?: number | string | null;
	paying_customers?: number | string | null;
	monthly_burn?: number | string | null;
	runway_months?: number | string | null;
	strongest_traction?: string | null;
	pitch_deck_status?: 'have' | 'later' | null;
	financial_model_status?: 'ready' | 'in_progress' | 'not_started' | null;
	data_room_status?: 'ready' | 'in_progress' | 'not_started' | null;
	has_target_list?: boolean | null;
	status?: 'active' | 'paused' | 'funded' | 'closed' | null;
	setup_completed?: boolean | null;
}

/** `PUT /api/raise/criteria`. Mirrors `raiseCriteriaSchema` in the same file. */
export interface RaiseCriteria {
	investor_types?: string[] | null;
	geographies?: string[] | null;
	cheque_min?: number | string | null;
	cheque_max?: number | string | null;
	lead_preference?: 'lead' | 'followers' | 'both' | null;
	strategic_ok?: boolean | null;
	excluded_investor_ids?: string[] | null;
	desired_expertise?: string[] | null;
	biggest_concern?: string | null;
}

/** The eight pipeline stages, in order. Mirrors `PIPELINE_STAGES` in
 *  `server/src/modules/raise/raise-pipeline.dto.ts`. */
export const PIPELINE_STAGES = [
	'target', 'contacted', 'in_conversation', 'due_diligence',
	'term_sheet', 'committed', 'closed', 'passed',
] as const;
export type PipelineStage = (typeof PIPELINE_STAGES)[number];

/** `POST /api/raise/pipeline`. Mirrors `pipelineAddSchema`. The server also
 *  refuses a body with neither `investor_id` nor `custom_name` (mirroring a DB
 *  CHECK), which a type can't express — supply exactly one. */
export interface PipelineAdd {
	investor_id?: string | null;
	custom_name?: string | null;
	stage?: PipelineStage;
	contact_name?: string | null;
	potential_amount?: number | string | null;
	next_step?: string | null;
	next_step_due?: string | null;
	notes?: string | null;
}

/** `PATCH /api/raise/pipeline/:id`. Mirrors `pipelineUpdateSchema`. */
export interface PipelineUpdate {
	stage?: PipelineStage;
	contact_name?: string | null;
	potential_amount?: number | string | null;
	last_contact_at?: string | null;
	next_step?: string | null;
	next_step_due?: string | null;
	notes?: string | null;
	is_archived?: boolean;
}

/**
 * A report as `GET /api/reports` sends it — `Page<ReportListItem>`.
 *
 * Mirrors `ReportRow` in `server/src/db/types.ts` plus the two columns
 * `reports.repository.ts` LATERAL-joins from the canonical (en, explore)
 * `report_versions` row. Both of those are null for a sections-based report
 * that has no version row, which is why they are nullable here and the real
 * columns are not.
 *
 * There is no published-at column: `report_month` / `report_year` is the
 * editorial date the UI means by "Published …", with `created_at` as fallback.
 */
export interface ReportListItem {
	id: string;
	slug: string | null;
	title: string;
	short_title: string | null;
	report_month: number | null;
	report_year: number | null;
	has_pro_version: boolean;
	show_on_dashboard: boolean;
	has_sections: boolean;
	is_published: boolean;
	created_at: string;
	updated_at: string;
	/** Topic facet labels. Never null (NOT NULL DEFAULT '{}'), but empty until
	 *  someone tags the report in admin. */
	tags: string[];
	cover_url: string | null;
	description: string | null;
}
