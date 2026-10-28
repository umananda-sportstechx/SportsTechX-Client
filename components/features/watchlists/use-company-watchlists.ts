'use client';

import useSWR, { mutate as globalMutate } from 'swr';
import { qk } from '@/lib/query-keys';
import { apiRequest } from '@/lib/query-client';
import { refreshPaths, refreshWatchlists } from '@/lib/invalidate';

/**
 * Company watchlists (backend: /api/user-watchlists) — several named lists of
 * companies per user. Separate from Raise's investor board (/api/raise/pipeline).
 */
export interface CompanyWatchlist {
	id: string; name: string; description: string | null; color: string | null;
	/** Item count — companies, or (investor lists) pipeline investors. */
	company_count?: number; view_mode?: 'list' | 'board';
	/** Raise investor lists live alongside company lists; absent = companies. */
	kind?: 'companies' | 'investors';
}
export const isInvestorList = (l: Pick<CompanyWatchlist, 'kind'>) => l.kind === 'investors';
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

/** Save a watchlist's List/Board view (Scout). Optimistic; rolls back on failure. */
export async function setWatchlistView(id: string, view_mode: 'list' | 'board'): Promise<boolean> {
	const key = qk.userWatchlists.list();
	const patchView = (d?: { data: CompanyWatchlist[] }) => d && ({ ...d, data: d.data.map((l) => (l.id === id ? { ...l, view_mode } : l)) });
	await globalMutate(key, patchView, { revalidate: false });
	const res = await apiRequest('PATCH', `/api/user-watchlists/${id}`, { view_mode }).catch(() => null);
	if (!res?.ok) { await refreshLists(); return false; }
	return true;
}

/**
 * Add / remove a company. Optimistic: the bookmark (and a list page's rows)
 * change the moment it's clicked, not after the round trip; a failure puts the
 * real state back and rethrows for the caller's toast. Then every view that
 * shows membership is refreshed — counts, list pages, Signals' watchlist
 * filter, Scout home.
 */
async function setMembership(watchlistId: string, companyId: string, on: boolean) {
	const containing = qk.userWatchlists.containing(companyId);
	await globalMutate(containing, (d?: { data: string[] }) => {
		const ids = asList<string>(d).filter((x) => x !== watchlistId);
		return { data: on ? [...ids, watchlistId] : ids };
	}, { revalidate: false });
	if (!on) {
		await globalMutate(qk.userWatchlists.companies(watchlistId),
			(d?: { data: WatchlistCompany[] }) => d && { ...d, data: d.data.filter((c) => c.id !== companyId) }, { revalidate: false });
	}
	try {
		await apiRequest(on ? 'POST' : 'DELETE', `/api/user-watchlists/${watchlistId}/companies/${companyId}`);
	} catch (e) {
		await refreshWatchlists(); // roll back to the server's truth
		throw e;
	}
	await refreshWatchlists();
}

export const addToWatchlist = (watchlistId: string, companyId: string) => setMembership(watchlistId, companyId, true);
export const removeFromWatchlist = (watchlistId: string, companyId: string) => setMembership(watchlistId, companyId, false);

export async function createWatchlist(name: string, kind: 'companies' | 'investors' = 'companies'): Promise<CompanyWatchlist> {
	const res = await apiRequest('POST', '/api/user-watchlists', { name: name.trim(), kind });
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
	// Everything that showed the list or its membership ("in 1 watchlist" on a
	// company page), and an investor list's investors falling back to Main.
	await Promise.all([refreshWatchlists(), refreshPaths('/api/raise/pipeline')]);
}
