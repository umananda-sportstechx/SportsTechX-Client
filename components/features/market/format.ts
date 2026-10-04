/** Number formatting for market figures. */

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
