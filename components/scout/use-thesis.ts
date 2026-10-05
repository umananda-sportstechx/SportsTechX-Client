'use client';

import { useUserProfile } from '@/hooks/use-user-profile';
import { usePlaceholderState } from '@/hooks/use-placeholder-state';
import { DEFAULT_THESIS, type Thesis } from './sample-data';

/**
 * The investor's thesis (Backend Not Connected): kept in the browser until an
 * investor-thesis endpoint exists. Name and email fall back to the profile.
 */
export function useThesis(): [Thesis, (next: Thesis | ((prev: Thesis) => Thesis)) => void] {
	const [thesis, setThesis] = usePlaceholderState<Thesis>('thesis', DEFAULT_THESIS);
	const { data: profile } = useUserProfile();
	const merged: Thesis = {
		...DEFAULT_THESIS, ...thesis,
		name: thesis.name || profile?.full_name || profile?.display_name || '',
		email: thesis.email || profile?.email || '',
	};
	return [merged, setThesis];
}

/** "Seed, Series A and Fan Engagement" style lists. */
export function listText(items: string[]): string {
	if (items.length <= 1) return items[0] ?? '';
	return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/** Short tags summarising the thesis (Home "Tuned to your thesis"). */
export function thesisTags(t: Thesis): string[] {
	const regions = t.regions.slice(0, 3);
	return [...t.stages, ...t.sectors, ...regions, ...(t.regions.length > 3 ? [`+${t.regions.length - 3} regions`] : [])];
}
