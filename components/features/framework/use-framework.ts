'use client';

import { useMemo } from 'react';
import useSWR from 'swr';
import { qk } from '@/lib/query-keys';
import { useSectorTiers, expandSectorSelection, type SectorRef } from '@/hooks/use-sector-tiers';
import { PILLARS, CATEGORIES, type PillarCopy, type CategoryCopy } from './framework-content';

export interface FrameworkCategory {
	slug: string;
	name: string;
	pillarSlug: string;
	subCategories: string[];
	/** Expanded `sector_slug` filter value (category + everything beneath it). */
	filter: string | undefined;
	copy: CategoryCopy | undefined;
}
export interface FrameworkPillar { slug: string; name: string; copy: PillarCopy; categories: FrameworkCategory[] }

/** The live framework (pillars → categories → sub-categories) merged with its editorial copy. */
export function useFramework(): { pillars: FrameworkPillar[]; isLoading: boolean } {
	const { data, isLoading } = useSWR<SectorRef[] | { data: SectorRef[] }>(qk.reference.sectors(), { dedupingInterval: 60 * 60_000 });
	const list = useMemo<SectorRef[]>(() => (Array.isArray(data) ? data : (data?.data ?? [])), [data]);
	const tiers = useSectorTiers(list);
	const pillars = useMemo(() => {
		const children = (id: string) => list.filter((s) => s.parent_id === id);
		const order = (keys: string[], slug: string) => { const i = keys.indexOf(slug); return i === -1 ? keys.length : i; };
		const pillarKeys = Object.keys(PILLARS);
		const categoryKeys = Object.keys(CATEGORIES);
		return list
			.filter((s) => !s.parent_id && PILLARS[s.slug])
			.sort((a, b) => order(pillarKeys, a.slug) - order(pillarKeys, b.slug))
			.map((p) => ({
				slug: p.slug,
				name: p.name,
				copy: PILLARS[p.slug],
				categories: children(p.id)
					.sort((a, b) => order(categoryKeys, a.slug) - order(categoryKeys, b.slug))
					.map((c) => ({
						slug: c.slug,
						name: c.name,
						pillarSlug: p.slug,
						subCategories: children(c.id).map((s) => s.name).sort((a, b) => a.localeCompare(b)),
						filter: expandSectorSelection(tiers, [c.slug]),
						copy: CATEGORIES[c.slug],
					})),
			}));
	}, [list, tiers]);
	return { pillars, isLoading };
}

/** Number of companies in a category (all sub-categories included). */
export function useCategoryCount(filter: string | undefined): number | null {
	const { data } = useSWR<{ total: number }>(filter ? qk.companies.list({ sector_slug: filter, page: 1, limit: 1 }) : null, { dedupingInterval: 10 * 60_000 });
	return data?.total ?? null;
}
