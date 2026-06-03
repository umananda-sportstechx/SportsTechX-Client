'use client';

import useSWR from 'swr';
import { qk } from '@/lib/query-keys';

export interface RefOption { id: string; name: string; slug?: string }

type RefResp<T> = T[] | { data: T[] } | undefined;
function rows<T>(resp: RefResp<T>): T[] {
  if (!resp) return [];
  return Array.isArray(resp) ? resp : (resp.data ?? []);
}

/**
 * Loads the reference lists the claim wizard needs to resolve display labels
 * to the UUIDs the backend stores (sector_id, round_type_id, tech_tag_id).
 * All three endpoints are public + cached, so this is cheap and shared.
 */
export function useClaimReference() {
  const { data: sectorsResp } = useSWR<RefResp<RefOption>>(qk.reference.sectors());
  const { data: techResp } = useSWR<RefResp<RefOption>>(qk.reference.techTags());
  const { data: roundResp } = useSWR<RefResp<RefOption>>(qk.reference.roundTypes());

  const sectors = rows<RefOption>(sectorsResp);
  const techTags = rows<RefOption>(techResp);
  const roundTypes = rows<RefOption>(roundResp);

  // Case-insensitive name → id maps for label resolution.
  const byName = (list: RefOption[]) => {
    const m = new Map<string, string>();
    for (const o of list) if (o.name) m.set(o.name.trim().toLowerCase(), o.id);
    return m;
  };

  const sectorByName = byName(sectors);
  const techByName = byName(techTags);
  const roundByName = byName(roundTypes);

  return {
    sectors,
    techTags,
    roundTypes,
    /** Resolve one label to a sector uuid (or null if no match). */
    resolveSector: (label?: string | null) => (label ? sectorByName.get(label.trim().toLowerCase()) ?? null : null),
    resolveRoundType: (label?: string | null) => (label ? roundByName.get(label.trim().toLowerCase()) ?? null : null),
    /** Resolve a list of labels to the uuids that matched (drops unmatched). */
    resolveSectors: (labels: string[]) =>
      labels.map((l) => sectorByName.get(l.trim().toLowerCase())).filter((x): x is string => !!x),
    resolveTechTags: (labels: string[]) =>
      labels.map((l) => techByName.get(l.trim().toLowerCase())).filter((x): x is string => !!x),
  };
}

export type ClaimReference = ReturnType<typeof useClaimReference>;
