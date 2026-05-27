'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { Heart } from 'lucide-react';
import { qk } from '@/lib/query-keys';

interface FavList { data: unknown[] }
interface WatchlistsResp { data: unknown[] }
interface SavedSearches { data: unknown[] }

/**
 * Small ghost button shown next to PageTitle on database pages.
 * Click → /lists. Count badge sums favorites + user watchlists + saved
 * searches so the user gets a quick read on how many saved items they have.
 *
 * Ported from `ui_design_2/app/lists.jsx:310` (the `MyListsBtn` factory).
 */
export function MyListsBtn(): React.ReactElement {
	const { data: liked } = useSWR<FavList>(qk.favorites.list('companies'));
	const { data: watchlists } = useSWR<WatchlistsResp>(qk.userWatchlists.list());
	const { data: saved } = useSWR<SavedSearches>(qk.savedSearches.list());

	const likedCount = liked?.data?.length ?? 0;
	const watchlistCount = watchlists?.data?.length ?? 0;
	const savedCount = saved?.data?.length ?? 0;
	const total = likedCount + watchlistCount + savedCount;

	return (
		<Link href="/lists" className="btn ghost mylists-btn" title="View your saved lists">
			<Heart size={12} />
			<span>My Lists</span>
			<span className="mylists-count">{total}</span>
		</Link>
	);
}
