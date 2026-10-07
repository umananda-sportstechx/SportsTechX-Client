'use client';

import useSWR, { mutate as globalMutate } from 'swr';
import { qk } from '@/lib/query-keys';
import { apiRequest } from '@/lib/query-client';

/**
 * Company watchlists (backend: /api/user-watchlists) — several named lists of
 * companies per user. Separate from Raise's investor board (/api/raise/pipeline).
 */
export interface CompanyWatchlist { id: string; name: string; description: string | null; color: string | null; company_count?: number }
export interface WatchlistCompany {
	id: string; name: string; slug: string | null; website: string | null; custom_logo_url: string | null;
	description: string | null; primary_sector: string | null; hq_city: string | null; hq_country: string | null;
	total_funding_usd: number | string | null; added_at?: string | null;
}

const asList = <T,>(d: unknown): T[] => (Array.isArray(d) ? d : ((d as { data?: T[] } | null)?.data ?? [])) as T[];

export function useCompanyWatchlists() {
	const { data, isLoading } = useSWR<{ data: CompanyWatchlist[] }>(qk.userWatchlists.list());
	return { lists: asList<CompanyWatchlist>(data), isLoading };
}

/** Ids of the watchlists that contain this company. */
export function useWatchlistsContaining(companyId: string | null | undefined) {
	const { data, isLoading } = useSWR<{ data: string[] }>(companyId ? qk.userWatchlists.containing(companyId) : null);
	return { ids: asList<string>(data), isLoading };
}

export function useWatchlistCompanies(id: string | null | undefined) {
	const { data, isLoading, mutate } = useSWR<{ data: WatchlistCompany[] }>(id ? qk.userWatchlists.companies(id) : null);
	return { companies: asList<WatchlistCompany>(data), isLoading, mutate };
}

const refreshLists = () => globalMutate(qk.userWatchlists.list());

export async function addToWatchlist(watchlistId: string, companyId: string) {
	await apiRequest('POST', `/api/user-watchlists/${watchlistId}/companies/${companyId}`);
	await Promise.all([refreshLists(), globalMutate(qk.userWatchlists.containing(companyId)), globalMutate(qk.userWatchlists.companies(watchlistId))]);
}

export async function removeFromWatchlist(watchlistId: string, companyId: string) {
	await apiRequest('DELETE', `/api/user-watchlists/${watchlistId}/companies/${companyId}`);
	await Promise.all([refreshLists(), globalMutate(qk.userWatchlists.containing(companyId)), globalMutate(qk.userWatchlists.companies(watchlistId))]);
}

export async function createWatchlist(name: string): Promise<CompanyWatchlist> {
	const res = await apiRequest('POST', '/api/user-watchlists', { name: name.trim() });
	const created = (await res.json()) as CompanyWatchlist;
	await refreshLists();
	return created;
}

export async function renameWatchlist(id: string, name: string) {
	await apiRequest('PATCH', `/api/user-watchlists/${id}`, { name: name.trim() });
	await refreshLists();
}

export async function deleteWatchlist(id: string) {
	await apiRequest('DELETE', `/api/user-watchlists/${id}`);
	await refreshLists();
}
