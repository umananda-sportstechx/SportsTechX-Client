/**
 * Static filter option lists shared by the catalogs (companies, investors,
 * programs, events). Each entry is [value, label]. Data-backed options
 * (sectors, sports, locations…) come from hooks/use-catalog-options.ts.
 */

/**
 * Country filter options. The OPTION VALUE is a CSV of every spelling that
 * country appears under in the data — the investors/companies/ecosystem `country`
 * filters all split CSV and match any, so one option catches every variant
 * (e.g. the DB stores both "USA" and "United States"; "UK" and "United Kingdom").
 * Ordered by rough frequency in the dataset.
 */
export const COUNTRY_OPTIONS: [string, string][] = [
	['USA,United States', 'United States'],
	['UK,United Kingdom', 'United Kingdom'],
	['India', 'India'], ['Singapore', 'Singapore'], ['France', 'France'],
	['Australia', 'Australia'], ['Germany', 'Germany'], ['Hong Kong', 'Hong Kong'],
	['Canada', 'Canada'], ['Israel', 'Israel'], ['Spain', 'Spain'], ['Brazil', 'Brazil'],
	['UAE,United Arab Emirates', 'United Arab Emirates'], ['The Netherlands,Netherlands', 'Netherlands'],
	['Sweden', 'Sweden'], ['China', 'China'], ['Switzerland', 'Switzerland'], ['Belgium', 'Belgium'],
	['Japan', 'Japan'], ['Italy', 'Italy'], ['Denmark', 'Denmark'], ['South Korea', 'South Korea'],
	['Ireland', 'Ireland'], ['Portugal', 'Portugal'], ['Finland', 'Finland'], ['Luxembourg', 'Luxembourg'],
	['Saudi Arabia', 'Saudi Arabia'],
];

/**
 * Map any spelling a country appears under in the data to its canonical display
 * name (the label in COUNTRY_OPTIONS), so the UI shows one uniform "United
 * States" whether a row stored "USA", "United States", etc. Values we don't
 * recognise pass through unchanged.
 */
const COUNTRY_CANONICAL: Record<string, string> = Object.fromEntries(
	COUNTRY_OPTIONS.flatMap(([csv, label]) => csv.split(',').map((v) => [v.trim().toLowerCase(), label])),
);
export const canonicalCountry = (raw: string | null | undefined): string =>
	raw ? COUNTRY_CANONICAL[raw.trim().toLowerCase()] ?? raw : '';

/** Bucket options that map to a `*_min` numeric filter. */
export const FUNDING_BUCKETS: [string, string][] = [['1000000', '$1M+'], ['10000000', '$10M+'], ['50000000', '$50M+'], ['100000000', '$100M+']];
export const DEALS_BUCKETS: [string, string][] = [['1', '1+ deals'], ['3', '3+ deals'], ['5', '5+ deals'], ['10', '10+ deals']];
export const SINCE_YEARS: [string, string][] = [['2024', 'Since 2024'], ['2022', 'Since 2022'], ['2020', 'Since 2020'], ['2015', 'Since 2015'], ['2010', 'Since 2010']];
export const MONTHS: [string, string][] = [
	['1', 'January'], ['2', 'February'], ['3', 'March'], ['4', 'April'], ['5', 'May'], ['6', 'June'],
	['7', 'July'], ['8', 'August'], ['9', 'September'], ['10', 'October'], ['11', 'November'], ['12', 'December'],
];
