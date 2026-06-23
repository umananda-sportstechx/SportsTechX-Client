/**
 * Broad geographic regions used by the analytics filter chips. Shared by the
 * Funding and M&A deep-dive tabs so the region taxonomy stays consistent. The
 * mapping is intentionally client-side (country name → region) because the DB's
 * `locations.region` values don't align 1:1 with these display buckets.
 */
export type Region = 'all' | 'n_america' | 'europe' | 'asia_pacific' | 'row';

export const REGION_CHIPS: Array<[Region, string]> = [
	['all', 'All'],
	['n_america', 'N. America'],
	['europe', 'Europe'],
	['asia_pacific', 'Asia Pacific'],
	['row', 'Rest of World'],
];

const REGION_OF: Record<string, Exclude<Region, 'all'>> = {
	'United States': 'n_america', USA: 'n_america', Canada: 'n_america', Mexico: 'n_america',
	'United Kingdom': 'europe', UK: 'europe', Germany: 'europe', France: 'europe', Italy: 'europe',
	Spain: 'europe', Netherlands: 'europe', Sweden: 'europe', Switzerland: 'europe', Belgium: 'europe',
	Austria: 'europe', Poland: 'europe', Portugal: 'europe', Ireland: 'europe', Denmark: 'europe',
	Norway: 'europe', Finland: 'europe',
	China: 'asia_pacific', Japan: 'asia_pacific', India: 'asia_pacific', Singapore: 'asia_pacific',
	Australia: 'asia_pacific', 'South Korea': 'asia_pacific', 'New Zealand': 'asia_pacific',
	Indonesia: 'asia_pacific', Thailand: 'asia_pacific', Vietnam: 'asia_pacific',
};

/** Map a country name to one of the broad filter regions (unknown → Rest of World). */
export function regionOf(country: string): Exclude<Region, 'all'> {
	return REGION_OF[country] ?? 'row';
}
