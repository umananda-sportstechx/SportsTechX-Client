'use client';

import { cx } from '@/components/atlas';
import { usePlaceholderState } from '@/hooks/use-placeholder-state';

/**
 * Explore interests (Claude Design "Interests" + onboarding step 4): sectors,
 * sub-sectors, sports, geographies and goals. Backend Not Connected — the
 * server has no interests endpoint yet, so they're kept in this browser.
 */
export interface Interests { sectors: string[]; subs: string[]; sports: string[]; geos: string[]; goals: string[] }

export const INTEREST_OPTIONS: Record<keyof Interests, { label: string; options: string[] }> = {
	sectors: { label: 'Sectors', options: ['For Activity — Hardware', 'For Activity — Software', 'Before / After Activity', 'Content Platforms', 'Fan Experiences', 'Fantasy Sports & Betting', 'Organisations & Venues', 'Media & Sponsors'] },
	subs: { label: 'Sub-sectors', options: ['Wearables', 'Tracking & Analytics', 'Recovery & Injury Prevention', 'Streaming Platforms', 'Fan Engagement', 'Ticketing & Merchandise', 'Team & Club Management', 'Sponsorship'] },
	sports: { label: 'Sports', options: ['Football', 'Tennis', 'Basketball', 'Cricket', 'Running', 'Cycling', 'Motorsport', 'Multi-sport'] },
	geos: { label: 'Countries or regions', options: ['Europe', 'United Kingdom', 'India', 'North America', 'Middle East', 'Global'] },
	goals: { label: 'Primary goals', options: ['Understand the market', 'Track companies', 'Follow developments', 'Discover events', 'Read research', 'Explore a sector'] },
};

export const NO_INTERESTS: Interests = { sectors: [], subs: [], sports: [], geos: [], goals: [] };

export function useInterests() {
	return usePlaceholderState<Interests>('explore-interests', NO_INTERESTS);
}

/** Selected market interests (goals excluded), for "Interests N" and summary lines. */
export const marketInterests = (i: Interests) => [...i.sectors, ...i.subs, ...i.sports, ...i.geos];

/** Chip groups for the given interest keys; toggles update `value`. */
export function InterestFields({ value, onChange, keys }: { value: Interests; onChange: (next: Interests) => void; keys: (keyof Interests)[] }) {
	const toggle = (k: keyof Interests, o: string) => onChange({ ...value, [k]: value[k].includes(o) ? value[k].filter((x) => x !== o) : [...value[k], o] });
	return (
		<div className="explore-interests">
			{keys.map((k) => (
				<div key={k} className="explore-interests__group">
					<div className="explore-interests__label">{INTEREST_OPTIONS[k].label}</div>
					<div className="explore-chips">
						{INTEREST_OPTIONS[k].options.map((o) => {
							const on = value[k].includes(o);
							return <button key={o} type="button" className={cx('explore-chip', on && 'on')} aria-pressed={on} onClick={() => toggle(k, o)}>{o}</button>;
						})}
					</div>
				</div>
			))}
		</div>
	);
}
