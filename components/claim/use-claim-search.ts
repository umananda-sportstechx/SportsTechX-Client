'use client';

import useSWR from 'swr';
import { qk } from '@/lib/query-keys';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import type { ClaimRole } from '@/lib/claim-events';

export interface ClaimSearchResult {
  id: string;
  name: string;
  website: string | null;
  hq: string | null;
  cc: string | null;
  verified: boolean;
  /** Extra meta line suffix, e.g. investor type or "Program". */
  kind?: string | null;
}

interface RawRow {
  id?: string; slug?: string; name?: string; website?: string | null;
  hq_city?: string | null; city?: string | null; location?: string | null;
  country_code?: string | null; cc?: string | null; hq_country_code?: string | null;
  is_verified?: boolean; verified?: boolean;
  type?: string | null; investor_type?: string | null; entity_type?: string | null;
}
type ListResp = { data?: RawRow[] } | RawRow[] | undefined;

function rows(resp: ListResp): RawRow[] {
  if (!resp) return [];
  return Array.isArray(resp) ? resp : (resp.data ?? []);
}

function normalize(r: RawRow): ClaimSearchResult {
  return {
    id: r.id ?? r.slug ?? '',
    name: r.name ?? '',
    website: r.website ?? null,
    hq: r.hq_city ?? r.city ?? r.location ?? null,
    cc: r.cc ?? r.country_code ?? r.hq_country_code ?? null,
    verified: Boolean(r.is_verified ?? r.verified),
    kind: r.type ?? r.investor_type ?? r.entity_type ?? null,
  };
}

/**
 * Debounced entity search for the claim wizard's "find your X" step. Switches
 * the underlying list endpoint by role (companies / investors / ecosystem).
 * The query is gated until 2+ chars so we don't hammer the API on focus.
 */
export function useClaimSearch(role: ClaimRole | null, query: string) {
  const q = useDebouncedValue(query.trim(), 250);
  const enabled = !!role && q.length >= 2;

  const key = !enabled
    ? null
    : role === 'founder'
      ? qk.companies.list({ q, limit: 8 })
      : role === 'investor'
        ? qk.investors.list({ q, limit: 8 })
        : qk.ecosystem.list({ q, limit: 8 });

  const { data, isLoading } = useSWR<ListResp>(key);

  return {
    results: rows(data).map(normalize).filter((r) => r.id && r.name).slice(0, 7),
    isLoading: enabled && isLoading,
    enabled,
  };
}
