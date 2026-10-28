'use client';

import useSWR from 'swr';
import { qk } from '@/lib/query-keys';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import type { ClaimRole } from '@/lib/claim-events';

export interface ClaimSearchResult {
  id: string;
  name: string;
  website: string | null;
  /** HQ city. */
  hq: string | null;
  /** HQ country — the API sends the name (`hq_country`), e.g. "United States". */
  country: string | null;
  /** Country for the flag: a code if the API sent one, else the country name (Flag takes either). */
  cc: string | null;
  verified: boolean;
  /** Extra meta line suffix, e.g. investor type or "Program". */
  kind?: string | null;
}

interface RawRow {
  id?: string; slug?: string; name?: string; website?: string | null;
  hq_city?: string | null; city?: string | null; location?: string | null;
  country_code?: string | null; cc?: string | null; hq_country_code?: string | null;
  hq_country?: string | null; country?: string | null;
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
    // The list endpoints send `hq_country` (a name), never a code — reading only
    // code fields left the country empty, so pickers used the city instead.
    country: r.hq_country ?? r.country ?? null,
    cc: r.cc ?? r.country_code ?? r.hq_country_code ?? r.hq_country ?? r.country ?? null,
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

  const { data, isLoading, error } = useSWR<ListResp>(key);

  return {
    results: rows(data).map(normalize).filter((r) => r.id && r.name).slice(0, 7),
    isLoading: enabled && isLoading,
    enabled,
    /** The (debounced) query the results are for — lags the input while typing,
     *  and null until they've arrived (a failed search found nothing, it didn't
     *  come back empty — callers must not offer "add it" on it). */
    query: data ? q : null,
    failed: !!error,
  };
}
