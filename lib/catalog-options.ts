/**
 * Static filter option lists shared by the catalogs (companies, investors,
 * programs, events). Each entry is [value, label]. Data-backed options
 * (sectors, sports, locations…) come from hooks/use-catalog-options.ts.
 */

// Canonical country-name folding lives in ./countries (the comprehensive list).
// Re-exported here so the catalogs share the one definition.
export { canonicalCountry } from './countries';

/** Bucket options that map to a `*_min` numeric filter. */
export const FUNDING_BUCKETS: [string, string][] = [['1000000', '$1M+'], ['10000000', '$10M+'], ['50000000', '$50M+'], ['100000000', '$100M+']];
export const DEALS_BUCKETS: [string, string][] = [['1', '1+ deals'], ['3', '3+ deals'], ['5', '5+ deals'], ['10', '10+ deals']];
export const SINCE_YEARS: [string, string][] = [['2024', 'Since 2024'], ['2022', 'Since 2022'], ['2020', 'Since 2020'], ['2015', 'Since 2015'], ['2010', 'Since 2010']];
export const MONTHS: [string, string][] = [
	['1', 'January'], ['2', 'February'], ['3', 'March'], ['4', 'April'], ['5', 'May'], ['6', 'June'],
	['7', 'July'], ['8', 'August'], ['9', 'September'], ['10', 'October'], ['11', 'November'], ['12', 'December'],
];
