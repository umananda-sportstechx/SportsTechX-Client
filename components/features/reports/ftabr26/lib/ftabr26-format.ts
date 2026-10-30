// @ts-nocheck
/* eslint-disable */
/** FTABR26 funding values are stored in USD millions. */
export function formatFtabr26Money(millions: number): string {
  if (!Number.isFinite(millions)) return "$0.0M";
  if (millions >= 1000) return `$${(millions / 1000).toFixed(1)}B`;
  return `$${millions.toFixed(1)}M`;
}

export function formatFtabr26Percent(percent: number): string {
  return `${(Number.isFinite(percent) ? percent : 0).toFixed(1)}%`;
}

export function formatFtabr26Share(part: number, whole: number): string {
  return formatFtabr26Percent(whole ? part / whole * 100 : 0);
}
