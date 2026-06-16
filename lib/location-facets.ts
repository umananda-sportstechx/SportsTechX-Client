import type { Facet } from '@/components/ui/filter-rail';

/** Shape returned by `GET /api/locations/facets`. */
export interface LocationFacets {
	cities: string[];
	continents: string[];
	regions: string[];
}

/**
 * Build the City / Continent / Region multi-select facets shared across every
 * list page. Options come from the live `/api/locations/facets` reference list.
 * They are gated on `advanced_filters` (Growth+) by default, matching the
 * design's tier treatment — pass `gate: undefined` to ungate.
 */
export function locationFacets(
	data: LocationFacets | undefined,
	opts: { section?: string; gate?: string | undefined } = {},
): Facet[] {
	const section = opts.section ?? 'Location';
	const gate = 'gate' in opts ? opts.gate : 'advanced_filters';
	return [
		{
			key: 'city', label: 'City', kind: 'multi', section, gate,
			options: () => (data?.cities ?? []).map((c) => ({ value: c, label: c })),
			maxHeight: 220,
		},
		{
			key: 'continent', label: 'Continent', kind: 'multi', section, gate,
			options: () => (data?.continents ?? []).map((c) => ({ value: c, label: c })),
		},
		{
			key: 'region', label: 'Region', kind: 'multi', section, gate,
			options: () => (data?.regions ?? []).map((r) => ({ value: r, label: r })),
		},
	];
}

/** Mirror city/continent/region selections from filter state into URLSearchParams. */
export function setLocationUrlParams(sp: URLSearchParams, state: Record<string, unknown>): void {
	(['city', 'continent', 'region'] as const).forEach((k) => {
		const v = state[k] as string[] | undefined;
		if (v?.length) sp.set(k, v.join(','));
	});
}

/** Read city/continent/region from URL into an initial filter-state patch. */
export function readLocationParams(params: URLSearchParams): Record<string, string[]> {
	const out: Record<string, string[]> = {};
	(['city', 'continent', 'region'] as const).forEach((k) => {
		const v = params.get(k);
		if (v) out[k] = v.split(',').filter(Boolean);
	});
	return out;
}

/** Copy city/continent/region selections into an outgoing query-params object. */
export function applyLocationQueryParams(target: Record<string, unknown>, state: Record<string, unknown>): void {
	(['city', 'continent', 'region'] as const).forEach((k) => {
		const v = state[k] as string[] | undefined;
		if (v?.length) target[k] = v.join(',');
	});
}
