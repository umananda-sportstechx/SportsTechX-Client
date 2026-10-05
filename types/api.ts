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
