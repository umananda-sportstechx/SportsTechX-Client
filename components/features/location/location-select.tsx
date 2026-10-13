'use client';

import { useMemo } from 'react';
import { useLocationFacetOptions } from '@/hooks/use-catalog-options';
import { Combobox, type ComboGroup } from '@/components/atlas/ui/combobox';

/**
 * Country / region dropdown for HQ-location fields.
 *
 * Fed by the same `GET /api/locations/facets` the Market and Raise filter rails
 * already use — distinct `country`, `region` and `continent` values straight
 * from the `locations` table (cached server-side). No external geocoding API:
 * the list is our own data, so a chosen value always matches what the catalog
 * filters on. City stays a free-text field beside it where one exists.
 *
 * `className` lets it wear the Atlas field style (`atlas-select`, the default)
 * or the claim modal's (`cm-select`). A stored value that isn't in the facet
 * list (legacy free text) is kept as a selectable option so nothing is lost.
 */
export function LocationSelect({ value, onChange, id, disabled, className = 'atlas-select', placeholder = 'Select a country or region' }: {
	value: string;
	onChange: (value: string) => void;
	id?: string;
	disabled?: boolean;
	className?: string;
	placeholder?: string;
}) {
	const loc = useLocationFacetOptions();
	const regions = useMemo(() => {
		// Continents + regions, de-duplicated and sorted — the "Regions" group.
		const seen = new Set<string>();
		return [...loc.continent, ...loc.region]
			.filter(([v]) => (seen.has(v) ? false : seen.add(v)))
			.sort((a, b) => a[1].localeCompare(b[1]));
	}, [loc.continent, loc.region]);
	const countries = loc.country;

	// A saved value the facets don't contain (older free text) — keep it listed
	// so switching this field to a dropdown never silently clears it.
	const known = useMemo(() => new Set([...regions, ...countries].map(([v]) => v)), [regions, countries]);
	const orphan = value && !known.has(value) ? value : null;

	const groups = useMemo<ComboGroup[]>(() => {
		const g: ComboGroup[] = [{ label: '', options: [['', placeholder]] }];
		if (orphan) g.push({ label: 'Current', options: [[orphan, orphan]] });
		if (regions.length) g.push({ label: 'Regions', options: regions });
		if (countries.length) g.push({ label: 'Countries', options: countries });
		return g;
	}, [placeholder, orphan, regions, countries]);

	return (
		<Combobox
			groups={groups}
			value={value}
			onChange={onChange}
			id={id}
			disabled={disabled}
			placeholder={placeholder}
			className={className}
		/>
	);
}
