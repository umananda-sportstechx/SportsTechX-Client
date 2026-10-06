'use client';

import { useMemo } from 'react';
import useSWR from 'swr';
import { qk } from '@/lib/query-keys';
import { useSectorTiers, expandSectorSelection, type SectorRef } from '@/hooks/use-sector-tiers';
import type { LocationFacets } from '@/lib/location-facets';

/**
 * Filter options backed by reference data (sectors, locations, tech tags,
 * sports, round types), as [value, label] pairs ready for a FilterBar.
 */

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
	const { data } = useSWR<SectorRef[] | { data: SectorRef[] }>(qk.reference.sectors(), { dedupingInterval: 60 * 60_000 });
	// `undefined` only while in flight; an empty list still counts as loaded.
	const ready = data !== undefined;
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
	return useMemo(() => ({
		city: (data?.cities ?? []).map((c) => [c, c] as [string, string]),
		continent: (data?.continents ?? []).map((c) => [c, c] as [string, string]),
		region: (data?.regions ?? []).map((r) => [r, r] as [string, string]),
	}), [data]);
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
