/** Shared formatting for market figures, dates and places. */

/** `$2.3M`, `$340M`, `$1.2B`, `$5B` — one decimal, but a trailing ".0" is dropped
 *  so round values read cleanly. The decimal is KEPT when it's real, so a $2.3M
 *  deal never shows rounded as "$2M". */
const compact = (n: number, div: number, suffix: string) => `$${(n / div).toFixed(1).replace(/\.0$/, '')}${suffix}`;

/** Compact USD for amounts and deal values ($1.2B / $340M / $2.3M / $12,000 / —). */
export function fmtUsd(n?: number | null): string {
	if (n == null) return '—';
	if (n >= 1e9) return compact(n, 1e9, 'B');
	if (n >= 1e6) return compact(n, 1e6, 'M');
	return n > 0 ? `$${Math.round(n).toLocaleString()}` : '—';
}
/** Same compaction for chart axes AND hover tooltips — so a tooltip shows the
 *  real figure ($2.3M, not $2M) while round axis ticks stay clean ($340M). */
export const fmtUsdB = (n: number) => {
	if (n >= 1e9) return compact(n, 1e9, 'B');
	if (n >= 1e6) return compact(n, 1e6, 'M');
	return `$${Math.round(n).toLocaleString()}`;
};
export const fmtCount = (n?: number | null) => Number(n ?? 0).toLocaleString();

/** Coarse relative time ("today", "3 days ago", "5 months ago").
 *  Coarse on purpose: these sit in card meta lines, where "2 months ago" reads
 *  better than a date and an exact hour would be noise. */
export function ago(d?: string | null): string {
	if (!d) return '';
	const days = Math.round((Date.now() - new Date(d).getTime()) / 864e5);
	if (days < 1) return 'today';
	if (days < 14) return `${days} day${days === 1 ? '' : 's'} ago`;
	if (days < 60) return `${Math.round(days / 7)} weeks ago`;
	if (days < 730) return `${Math.round(days / 30)} months ago`;
	return `${Math.round(days / 365)} years ago`;
}

/** "Berlin, Germany", dropping whichever half is missing. */
export const place = (city?: string | null, country?: string | null) => [city, country].filter(Boolean).join(', ');
