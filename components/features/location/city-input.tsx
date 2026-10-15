'use client';

import { useId } from 'react';
import { useLocationFacetOptions } from '@/hooks/use-catalog-options';
import { Input } from '@/components/atlas';

/**
 * City field with type-ahead suggestions drawn from the locations we already
 * hold, via a native `<datalist>` — so a city not in the list can still be
 * typed (free text), it just offers matches as you go.
 *
 * Not yet country-scoped: `GET /api/locations/facets` returns a flat city list
 * with no country mapping, so narrowing the suggestions to the chosen country
 * needs a country→cities data source (a data follow-up, out of frontend scope).
 */
export function CityInput({ value, onChange, id, disabled, className, placeholder = 'City' }: {
	value: string;
	onChange: (value: string) => void;
	id?: string;
	disabled?: boolean;
	className?: string;
	placeholder?: string;
}) {
	const loc = useLocationFacetOptions();
	const listId = useId();
	return (
		<>
			<Input
				id={id}
				className={className}
				value={value}
				disabled={disabled}
				placeholder={placeholder}
				list={listId}
				autoComplete="off"
				onChange={(e) => onChange(e.target.value)}
			/>
			<datalist id={listId}>
				{loc.city.slice(0, 1000).map(([c]) => <option key={c} value={c} />)}
			</datalist>
		</>
	);
}
