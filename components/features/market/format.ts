/** Shared formatting for market figures, dates and places. */

/** Compact USD ($1.2B / $340M / $12,000 / —). */
export function fmtUsd(n?: number | null): string {
	if (n == null) return '—';
	if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
	if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
	return n > 0 ? `$${Math.round(n).toLocaleString()}` : '—';
}
/** USD in billions for chart axes ($1.2B). */
export const fmtUsdB = (n: number) => (n >= 1e9 || n === 0 ? `$${(n / 1e9).toFixed(1)}B` : n >= 1e6 ? `$${(n / 1e6).toFixed(0)}M` : `$${Math.round(n).toLocaleString()}`);
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
