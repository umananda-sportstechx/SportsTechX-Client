'use client';

import { useParams } from 'next/navigation';
import { Screen, Seg, SectionHeader } from '@/components/atlas';
import { WatchlistDetail } from '@/components/features/watchlists/watchlist-detail';
import { WatchlistBoard } from '@/components/scout/watchlist-board';
import { toast } from 'sonner';
import { setWatchlistView, useCompanyWatchlists } from '@/components/features/watchlists/use-company-watchlists';
import { getUserType, useUserProfile } from '@/hooks/use-user-profile';
import { companyHref, hrefOf } from '@/lib/routes';

type View = 'list' | 'board';

/**
 * Watchlists → one company watchlist.
 *
 * Scout also gets a stage board; the other tiers only have the list, so the
 * switcher is theirs alone. Previously two near-identical pages.
 */
export default function Page() {
	const id = String(useParams().id);
	const { data: profile } = useUserProfile();
	const isScout = getUserType(profile) === 'scout';
	// Saved per watchlist on the server (`user_watchlists.view_mode`); the list
	// request is shared with the sidebar, so this costs nothing extra.
	const { lists } = useCompanyWatchlists();
	const view: View = lists.find((l) => l.id === id)?.view_mode ?? 'list';
	const setView = (v: View) => void setWatchlistView(id, v).then((ok) => { if (!ok) toast.error("Couldn't save the view. Please try again."); });
	const board = isScout && view === 'board';
	return (
		<Screen>
			<SectionHeader
				actions={isScout
					? <Seg ariaLabel="Watchlist view" value={view} onChange={setView} options={[{ key: 'list', label: 'List' }, { key: 'board', label: 'Board' }]} />
					: undefined}
			/>
			{board
				? <WatchlistBoard id={id} />
				: <WatchlistDetail id={id} backHref={hrefOf('watchlists')} companyHref={companyHref} />}
		</Screen>
	);
}
