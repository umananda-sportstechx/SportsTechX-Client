'use client';

import { useMemo } from 'react';
import useSWR from 'swr';
import { qk } from '@/lib/query-keys';
import { useSectorTiers, expandSectorSelection, type SectorRef } from '@/hooks/use-sector-tiers';
import { canonicalCountry, isKnownCountry, isJunkFacet } from '@/lib/countries';

/**
 * Filter options backed by reference data (sectors, locations, tech tags,
 * sports, round types), as [value, label] pairs ready for a FilterBar.
 */

/** Shape returned by `GET /api/locations/facets`. Moved here from
 *  `lib/location-facets.ts`, whose other exports had no callers. */
export interface LocationFacets {
	cities: string[];
	countries: string[];
	continents: string[];
	regions: string[];
}

export interface SectorTierData {
	/** Top-level pillars — the primary (ungated) Sector select. */
	topOptions: [string, string][];
	/** Depth-1 sub-sectors (path-labelled) — an advanced (gated) select. */
	subOptions: [string, string][];
	/** Depth-2 sub-sub-sectors (path-labelled) — an advanced (gated) select. */
	subSubOptions: [string, string][];
	/** Merge tier selections → a deduped, descendant-expanded `sector_slug` value. */
	sectorSlug: (top: string, sub: string, subSub: string) => string | undefined;
	/**
	 * Has the hierarchy loaded? Until it has, `sectorSlug` can only answer
	 * `undefined`, which is indistinguishable from "no sector selected" — so a
	 * caller that builds a request key from it would fetch once without the
	 * filter and again with it. Callers gate their key on this.
	 */
	ready: boolean;
}

/** Sector hierarchy split into pillar / sub / sub-sub tiers, each filtering by
 *  `sector_slug` with descendant expansion (picking a pillar matches every leaf
 *  beneath it — the backends match an exact slug list). */
export function useSectorTierData(): SectorTierData {
	// Sibling hooks tolerate both shapes; /api/sectors is a bare array today, but
	// guard anyway so an envelope switch can't crash useSectorTiers(list).
	const { data, error } = useSWR<SectorRef[] | { data: SectorRef[] }>(qk.reference.sectors(), { dedupingInterval: 60 * 60_000 });
	// Settled, not successful. An empty list counts, and so does a failure —
	// callers gate a request on this, so treating an error as "still loading"
	// would leave them spinning forever instead of querying without the sector
	// filter, which is the right degraded behaviour.
	const ready = data !== undefined || error !== undefined;
	const list = useMemo<SectorRef[]>(() => (Array.isArray(data) ? data : (data?.data ?? [])), [data]);
	const tiers = useSectorTiers(list);
	return useMemo(() => {
		const byId = new Map(list.map((s) => [s.id, s]));
		const path = (s: SectorRef): string => {
			const parts = [s.name]; let p = s.parent_id;
			while (p) { const par = byId.get(p); if (!par) break; parts.unshift(par.name); p = par.parent_id ?? null; }
			return parts.join(' › ');
		};
		const byLabel = (a: [string, string], b: [string, string]) => a[1].localeCompare(b[1]);
		return {
			topOptions: tiers.tops.map((s) => [s.slug, s.name] as [string, string]).sort(byLabel),
			subOptions: tiers.subs.map((s) => [s.slug, path(s)] as [string, string]).sort(byLabel),
			subSubOptions: tiers.subSubs.map((s) => [s.slug, path(s)] as [string, string]).sort(byLabel),
			// Most-specific selected tier wins so a sub-sector narrows *within* its
			// pillar. Unioning all three would keep the whole pillar, since a chosen
			// sub/sub-sub is already a descendant of the chosen pillar.
			sectorSlug: (top, sub, subSub) => {
				const chosen = subSub || sub || top;
				return chosen ? expandSectorSelection(tiers, [chosen]) : undefined;
			},
			ready,
		};
	}, [list, tiers, ready]);
}

/** City / continent / region options from the shared location facets endpoint. */
export function useLocationFacetOptions() {
	const { data } = useSWR<LocationFacets>(qk.reference.locationFacets(), { dedupingInterval: 60 * 60_000 });
	return useMemo(() => {
		// Facets are raw free text from `locations`: drop the "#N/A"/"NA" and empty
		// placeholders, de-duplicate, and sort — so every data-driven filter is clean.
		const clean = (vals: string[] | undefined): [string, string][] => {
			const seen = new Set<string>();
			const out: [string, string][] = [];
			for (const raw of vals ?? []) {
				if (isJunkFacet(raw)) continue;
				const v = raw.trim();
				const k = v.toLowerCase();
				if (seen.has(k)) continue;
				seen.add(k);
				out.push([v, v]);
			}
			return out.sort((a, b) => a[1].localeCompare(b[1]));
		};
		// Country is special: fold every spelling to one canonical option whose
		// VALUE is a CSV of all the stored variants, so the single "United States"
		// row still matches "USA"/"United States"/… (the backend filter splits CSV).
		// Unrecognised junk ("gfgdfr") is dropped.
		const groups = new Map<string, { label: string; values: string[] }>();
		for (const raw of data?.countries ?? []) {
			if (!isKnownCountry(raw)) continue;
			const label = canonicalCountry(raw);
			const key = label.toLowerCase();
			if (!groups.has(key)) groups.set(key, { label, values: [] });
			groups.get(key)!.values.push(raw.trim());
		}
		const country = [...groups.values()]
			.map((g) => [g.values.join(','), g.label] as [string, string])
			.sort((a, b) => a[1].localeCompare(b[1]));
		return {
			city: clean(data?.cities),
			country,
			continent: clean(data?.continents),
			region: clean(data?.regions),
		};
	}, [data]);
}

/** Tech-tag options as [slug, name] (filter by tech_tag_slug). */
export function useTechTagOptions(): [string, string][] {
	const { data } = useSWR<Array<{ name: string; slug: string }> | { data: Array<{ name: string; slug: string }> }>(qk.reference.techTags(), { dedupingInterval: 60 * 60_000 });
	return useMemo(() => {
		const listT = Array.isArray(data) ? data : (data?.data ?? []);
		return listT.map((t) => [t.slug, t.name] as [string, string]).sort((a, b) => a[1].localeCompare(b[1]));
	}, [data]);
}

/** Sports as [id, name] options (filter by sport_id). */
export function useSportOptions(): [string, string][] {
	const { data } = useSWR<Array<{ id: string; name: string }> | { data: Array<{ id: string; name: string }> }>(qk.reference.sports(), { dedupingInterval: 60 * 60_000 });
	return useMemo(() => {
		const list = Array.isArray(data) ? data : (data?.data ?? []);
		return list.map((s) => [s.id, s.name] as [string, string]).sort((a, b) => a[1].localeCompare(b[1]));
	}, [data]);
}

/** Round types as [slug, name] options (filter by round_type_slug). */
export function useRoundTypeOptions(): [string, string][] {
	const { data } = useSWR<Array<{ name: string; slug: string }> | { data: Array<{ name: string; slug: string }> }>(qk.reference.roundTypes(), { dedupingInterval: 60 * 60_000 });
	return useMemo(() => {
		const list = Array.isArray(data) ? data : (data?.data ?? []);
		return list.map((r) => [r.slug, r.name] as [string, string]);
	}, [data]);
}
