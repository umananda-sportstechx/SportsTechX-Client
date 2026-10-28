'use client';

import { useMemo } from 'react';
import useSWR from 'swr';
import { qk } from '@/lib/query-keys';
import { useSectorTiers, expandSectorSelection, type SectorRef } from '@/hooks/use-sector-tiers';
import { isJunkFacet } from '@/lib/countries';

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

/** Authoritative country options from the `/api/countries` reference endpoint.
 *  Returns [name, name] pairs (canonical name is both value + label now that
 *  the `locations` data has been canonicalised — no CSV folding needed). */
export function useCountryOptions(): [string, string][] {
	const { data } = useSWR<Array<{ name: string; slug: string; iso2: string | null; continent: string | null; region: string | null }>>(
		qk.reference.countries(), { dedupingInterval: 60 * 60_000 },
	);
	return useMemo(() => {
		const list = Array.isArray(data) ? data : [];
		// Alphabetical, like every other option hook here — the endpoint doesn't
		// guarantee order, so the country dropdown was coming out unsorted.
		return list.map((c) => [c.name, c.name] as [string, string]).sort((a, b) => a[1].localeCompare(b[1]));
	}, [data]);
}

/** City / continent / region options from the shared location facets endpoint. */
/**
 * `enabled: false` skips the request. The facets payload is ~170 KB over the
 * wire (~400 KB of JSON) and only feeds the city / continent / region filters,
 * which are an advanced-filters feature — list pages pass `adv.hasAccess` so
 * plans without them don't download it on every list page.
 */
export function useLocationFacetOptions(enabled = true) {
	const { data } = useSWR<LocationFacets>(enabled ? qk.reference.locationFacets() : null, { dedupingInterval: 60 * 60_000 });
	const countries = useCountryOptions();
	return useMemo(() => {
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
		return {
			city: clean(data?.cities),
			country: countries,
			continent: clean(data?.continents),
			region: clean(data?.regions),
		};
	}, [data, countries]);
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

/** Leaf sectors (where companies sit) as [id, "Root → Sub → Leaf"] options, sorted by path. */
/** The same leaf sectors for a picker: grouped under their parent path
 *  ("Activity & Performance → Before / After Activity") with just the leaf name
 *  per option — the full-path labels read as a wall of arrows. The parents
 *  still follow from the leaf (see `useLeafSectorOptions` for the path). */
export function useLeafSectorGroups(): { label: string; options: [string, string][] }[] {
	const { data } = useSWR<Array<{ id: string; name: string; parent_id: string | null }>>(qk.reference.sectors());
	return useMemo(() => {
		const list = data ?? [];
		const byId = new Map(list.map((s) => [s.id, s]));
		const path = (id: string | null): string => {
			const parts: string[] = []; let p = id;
			while (p) { const s = byId.get(p); if (!s) break; parts.unshift(s.name); p = s.parent_id; }
			return parts.join(' → ');
		};
		const isLeaf = (id: string) => !list.some((x) => x.parent_id === id);
		const groups = new Map<string, [string, string][]>();
		for (const s of list.filter((x) => isLeaf(x.id))) {
			const g = path(s.parent_id) || 'Other';
			groups.set(g, [...(groups.get(g) ?? []), [s.id, s.name]]);
		}
		return [...groups].sort(([a], [b]) => a.localeCompare(b))
			.map(([label, options]) => ({ label, options: options.sort((a, b) => a[1].localeCompare(b[1])) }));
	}, [data]);
}

export function useLeafSectorOptions(): [string, string][] {
	const { data } = useSWR<Array<{ id: string; name: string; parent_id: string | null }>>(qk.reference.sectors());
	return useMemo(() => {
		const list = data ?? [];
		const byId = new Map(list.map((s) => [s.id, s]));
		const path = (s: { name: string; parent_id: string | null }): string => {
			const parts = [s.name]; let p = s.parent_id;
			while (p) { const par = byId.get(p); if (!par) break; parts.unshift(par.name); p = par.parent_id; }
			return parts.join(' → ');
		};
		const isLeaf = (id: string) => !list.some((x) => x.parent_id === id);
		return list.filter((s) => isLeaf(s.id)).map((s) => [s.id, path(s)] as [string, string]).sort((a, b) => a[1].localeCompare(b[1]));
	}, [data]);
}
