'use client';

import { useCallback, useMemo } from 'react';
import useSWR from 'swr';
import { cx } from '@/components/atlas';
import { apiRequest } from '@/lib/query-client';
import { qk } from '@/lib/query-keys';
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
 * Geographies and goals are the fixed UI sets below — regions, not the city
 * rows in `locations`, and the onboarding goals answer. Both now persist as
 * `text[]` on `user_preferences` through the same `GET`/`PUT /explore/interests`
 * (see migration `20261012160000_explore_geos_goals`), so they survive a new
 * browser and reach `/explore/home` like the taxonomy-backed groups.
 */
export interface Interests {
	/** Top-level sector ids. */
	sectors: string[];
	/** Sector ids below the top level. Same table — split for the UI only. */
	subs: string[];
	sports: string[];
	geos: string[];
	goals: string[];
}

export const NO_INTERESTS: Interests = { sectors: [], subs: [], sports: [], geos: [], goals: [] };

/** Fixed option sets — stored as text, so the chip value is its own label. */
const FIXED_OPTIONS = {
	geos: { label: 'Countries or regions', options: ['Europe', 'United Kingdom', 'India', 'North America', 'Middle East', 'Global'] },
	goals: { label: 'Primary goals', options: ['Understand the market', 'Track companies', 'Follow developments', 'Discover events', 'Read research', 'Explore a sector'] },
};

interface Ref { id: string; name: string | null }
interface StoredInterests { sectors: Ref[]; sports: Ref[]; geos: string[]; goals: string[] }

type Group = { label: string; options: [value: string, label: string][]; backed: boolean };

/** Chip options per group: taxonomy-backed ones carry ids, local ones carry their own text.
 *  `subTop` maps each sub-sector id to its top pillar id, so the Sub-sectors group
 *  can cascade — showing only the children of the sectors the user picked. */
export function useInterestOptions(): Record<keyof Interests, Group> & { subTop: Map<string, string> } {
	const { data: sectorData } = useSWR<SectorRef[] | { data: SectorRef[] }>(qk.reference.sectors(), { dedupingInterval: 60 * 60_000 });
	const { data: sportData } = useSWR<Ref[] | { data: Ref[] }>(qk.reference.sports(), { dedupingInterval: 60 * 60_000 });
	const sectorList = useMemo<SectorRef[]>(() => (Array.isArray(sectorData) ? sectorData : (sectorData?.data ?? [])), [sectorData]);
	const sportList = useMemo<Ref[]>(() => (Array.isArray(sportData) ? sportData : (sportData?.data ?? [])), [sportData]);
	const tiers = useSectorTiers(sectorList);

	return useMemo(() => {
		const pair = (r: { id: string; name: string | null }): [string, string] => [r.id, r.name ?? ''];
		const byLabel = (a: [string, string], b: [string, string]) => a[1].localeCompare(b[1]);
		const topIds = new Set(tiers.tops.map((s) => s.id));
		// Each sub-sector's top pillar, by walking parent_id — lets the UI show only
		// the sub-sectors under a chosen sector.
		const byId = new Map(sectorList.map((s) => [s.id, s]));
		const topAncestor = (s: SectorRef): string => {
			let cur = s, d = 0;
			while (cur.parent_id && d < 6) { const p = byId.get(cur.parent_id); if (!p) break; cur = p; d++; }
			return cur.id;
		};
		const subTop = new Map(sectorList.filter((s) => !topIds.has(s.id)).map((s) => [s.id, topAncestor(s)] as [string, string]));
		return {
			sectors: { label: 'Sectors', backed: true, options: tiers.tops.map(pair).sort(byLabel) },
			subs: { label: 'Sub-sectors', backed: true, options: sectorList.filter((s) => !topIds.has(s.id)).map(pair).sort(byLabel) },
			sports: { label: 'Sports', backed: true, options: sportList.map(pair).sort(byLabel) },
			geos: { label: FIXED_OPTIONS.geos.label, backed: true, options: FIXED_OPTIONS.geos.options.map((o) => [o, o] as [string, string]) },
			goals: { label: FIXED_OPTIONS.goals.label, backed: true, options: FIXED_OPTIONS.goals.options.map((o) => [o, o] as [string, string]) },
			subTop,
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
	const opts = useInterestOptions();

	const value = useMemo<Interests>(() => {
		const topIds = new Set(opts.sectors.options.map(([id]) => id));
		const stored = (data?.sectors ?? []).map((s) => s.id);
		return {
			sectors: stored.filter((id) => topIds.has(id)),
			subs: stored.filter((id) => !topIds.has(id)),
			sports: (data?.sports ?? []).map((s) => s.id),
			geos: data?.geos ?? [],
			goals: data?.goals ?? [],
		};
	}, [data, opts.sectors.options]);

	const save = useCallback(async (next: Interests) => {
		// Both sector tiers are one column server-side; geos/goals are text arrays.
		const res = await apiRequest('PUT', qk.explore.interests()[0], {
			sector_ids: [...next.sectors, ...next.subs],
			sport_ids: next.sports,
			geos: next.geos,
			goals: next.goals,
		});
		if (!res.ok) throw new Error(`save failed (${res.status})`);
		await mutate();
	}, [mutate]);

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
	const { subTop } = opts;
	const toggle = (k: keyof Interests, o: string) => {
		// Deselecting a sector drops the sub-sectors that hung off it, so a stale
		// child can't stay saved after its parent is gone.
		if (k === 'sectors') {
			const nextSectors = value.sectors.includes(o) ? value.sectors.filter((x) => x !== o) : [...value.sectors, o];
			const allowed = new Set(nextSectors);
			const nextSubs = value.subs.filter((id) => { const t = subTop.get(id); return !!t && allowed.has(t); });
			onChange({ ...value, sectors: nextSectors, subs: nextSubs });
			return;
		}
		onChange({ ...value, [k]: value[k].includes(o) ? value[k].filter((x) => x !== o) : [...value[k], o] });
	};
	// Sub-sectors cascade from the chosen sectors: show only children of a picked
	// pillar, so the list isn't a flat dump of every sub-sector in the taxonomy.
	const optionsFor = (k: keyof Interests): [string, string][] =>
		k === 'subs'
			? opts.subs.options.filter(([v]) => { const t = subTop.get(v); return !!t && value.sectors.includes(t); })
			: opts[k].options;
	return (
		<div className="explore-interests">
			{keys.map((k) => {
				const options = optionsFor(k);
				return (
					<div key={k} className="explore-interests__group">
						<div className="explore-interests__label">
							{opts[k].label}
						</div>
						<div className="explore-chips">
							{opts[k].options.length === 0
								? <span className="explore-muted">Loading…</span>
								: k === 'subs' && value.sectors.length === 0
									? <span className="explore-muted">Pick a sector first to see its sub-sectors.</span>
									: options.length === 0
										? <span className="explore-muted">No sub-sectors for the selected sector{value.sectors.length > 1 ? 's' : ''}.</span>
										: options.map(([v, label]) => {
											const on = value[k].includes(v);
											return <button key={v} type="button" className={cx('explore-chip', on && 'on')} aria-pressed={on} onClick={() => toggle(k, v)}>{label}</button>;
										})}
						</div>
					</div>
				);
			})}
		</div>
	);
}
