'use client';

import { useCallback, useMemo } from 'react';
import useSWR from 'swr';
import { cx, PlaceholderTag } from '@/components/atlas';
import { apiRequest } from '@/lib/query-client';
import { qk } from '@/lib/query-keys';
import { usePlaceholderState } from '@/hooks/use-placeholder-state';
import { useSectorTiers, type SectorRef } from '@/hooks/use-sector-tiers';

/**
 * Explore interests: what Atlas prioritises on Home.
 *
 * Sectors, sub-sectors and sports are the **real taxonomy**, stored server-side
 * through `GET`/`PUT /api/explore/interests` as foreign keys into `sectors` and
 * `sports`. They used to be hardcoded display strings in localStorage, which
 * meant they could not match a company, could not survive a new browser, and
 * could not reach `/api/explore/home` — the endpoint whose whole job is to
 * personalise from them.
 *
 * Geographies and goals are still local, and marked as such in the UI. The
 * server has nowhere to put them: `location_ids` wants `locations` UUIDs that
 * no endpoint exposes (and the design asks for countries/regions, while the
 * table holds cities), and `goals` is accepted by the onboarding schema and
 * then silently dropped — `completeOnboarding` never writes it. Both need a
 * column before they can be wired; see the handover notes.
 */
export interface Interests {
	/** Top-level sector ids. */
	sectors: string[];
	/** Sector ids below the top level. Same table — split for the UI only. */
	subs: string[];
	sports: string[];
	/** Not persisted server-side yet. */
	geos: string[];
	/** Not persisted server-side yet. */
	goals: string[];
}

export const NO_INTERESTS: Interests = { sectors: [], subs: [], sports: [], geos: [], goals: [] };

/** Still hardcoded, because nothing server-side stores them. */
const LOCAL_OPTIONS = {
	geos: { label: 'Countries or regions', options: ['Europe', 'United Kingdom', 'India', 'North America', 'Middle East', 'Global'] },
	goals: { label: 'Primary goals', options: ['Understand the market', 'Track companies', 'Follow developments', 'Discover events', 'Read research', 'Explore a sector'] },
};

interface Ref { id: string; name: string | null }
interface StoredInterests { sectors: Ref[]; sports: Ref[] }

type Group = { label: string; options: [value: string, label: string][]; backed: boolean };

/** Chip options per group: taxonomy-backed ones carry ids, local ones carry their own text. */
export function useInterestOptions(): Record<keyof Interests, Group> {
	const { data: sectorData } = useSWR<SectorRef[] | { data: SectorRef[] }>(qk.reference.sectors(), { dedupingInterval: 60 * 60_000 });
	const { data: sportData } = useSWR<Ref[] | { data: Ref[] }>(qk.reference.sports(), { dedupingInterval: 60 * 60_000 });
	const sectorList = useMemo<SectorRef[]>(() => (Array.isArray(sectorData) ? sectorData : (sectorData?.data ?? [])), [sectorData]);
	const sportList = useMemo<Ref[]>(() => (Array.isArray(sportData) ? sportData : (sportData?.data ?? [])), [sportData]);
	const tiers = useSectorTiers(sectorList);

	return useMemo(() => {
		const pair = (r: { id: string; name: string | null }): [string, string] => [r.id, r.name ?? ''];
		const byLabel = (a: [string, string], b: [string, string]) => a[1].localeCompare(b[1]);
		const topIds = new Set(tiers.tops.map((s) => s.id));
		return {
			sectors: { label: 'Sectors', backed: true, options: tiers.tops.map(pair).sort(byLabel) },
			subs: { label: 'Sub-sectors', backed: true, options: sectorList.filter((s) => !topIds.has(s.id)).map(pair).sort(byLabel) },
			sports: { label: 'Sports', backed: true, options: sportList.map(pair).sort(byLabel) },
			geos: { label: LOCAL_OPTIONS.geos.label, backed: false, options: LOCAL_OPTIONS.geos.options.map((o) => [o, o] as [string, string]) },
			goals: { label: LOCAL_OPTIONS.goals.label, backed: false, options: LOCAL_OPTIONS.goals.options.map((o) => [o, o] as [string, string]) },
		};
	}, [tiers, sectorList, sportList]);
}

/**
 * The user's interests, and a save that persists the backed groups.
 *
 * `picked` is the display names of the market selections — what Home's
 * "Interests N" pill counts and what "Because you follow …" lists. Resolving
 * ids to names here keeps every caller from needing the taxonomy.
 */
export function useInterests(): {
	value: Interests;
	save: (next: Interests) => Promise<void>;
	picked: string[];
	isLoading: boolean;
} {
	const { data, isLoading, mutate } = useSWR<StoredInterests>(qk.explore.interests());
	const [local, saveLocal] = usePlaceholderState<Pick<Interests, 'geos' | 'goals'>>(
		'explore-interests-local', { geos: [], goals: [] },
	);
	const opts = useInterestOptions();

	const value = useMemo<Interests>(() => {
		const topIds = new Set(opts.sectors.options.map(([id]) => id));
		const stored = (data?.sectors ?? []).map((s) => s.id);
		return {
			sectors: stored.filter((id) => topIds.has(id)),
			subs: stored.filter((id) => !topIds.has(id)),
			sports: (data?.sports ?? []).map((s) => s.id),
			geos: local.geos,
			goals: local.goals,
		};
	}, [data, local, opts.sectors.options]);

	const save = useCallback(async (next: Interests) => {
		saveLocal({ geos: next.geos, goals: next.goals });
		// Both sector tiers are one column server-side.
		const res = await apiRequest('PUT', qk.explore.interests()[0], {
			sector_ids: [...next.sectors, ...next.subs],
			sport_ids: next.sports,
		});
		if (!res.ok) throw new Error(`save failed (${res.status})`);
		await mutate();
	}, [mutate, saveLocal]);

	const picked = useMemo(() => {
		const name = (group: keyof Interests, id: string) =>
			opts[group].options.find(([v]) => v === id)?.[1] ?? id;
		return [
			...value.sectors.map((id) => name('sectors', id)),
			...value.subs.map((id) => name('subs', id)),
			...value.sports.map((id) => name('sports', id)),
			...value.geos,
		];
	}, [value, opts]);

	return { value, save, picked, isLoading };
}

/** Chip groups for the given interest keys; toggles update `value`. */
export function InterestFields({ value, onChange, keys }: {
	value: Interests;
	onChange: (next: Interests) => void;
	keys: (keyof Interests)[];
}) {
	const opts = useInterestOptions();
	const toggle = (k: keyof Interests, o: string) =>
		onChange({ ...value, [k]: value[k].includes(o) ? value[k].filter((x) => x !== o) : [...value[k], o] });
	return (
		<div className="explore-interests">
			{keys.map((k) => (
				<div key={k} className="explore-interests__group">
					<div className="explore-interests__label">
						{opts[k].label}
						{/* The two groups the server has nowhere to put yet. */}
						{!opts[k].backed && <PlaceholderTag short />}
					</div>
					<div className="explore-chips">
						{opts[k].options.length === 0
							? <span className="explore-muted">Loading…</span>
							: opts[k].options.map(([v, label]) => {
								const on = value[k].includes(v);
								return <button key={v} type="button" className={cx('explore-chip', on && 'on')} aria-pressed={on} onClick={() => toggle(k, v)}>{label}</button>;
							})}
					</div>
				</div>
			))}
		</div>
	);
}
