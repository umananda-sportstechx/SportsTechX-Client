'use client';

import { useParams } from 'next/navigation';
import { PlaceholderTag, Screen, Seg, SectionHeader } from '@/components/atlas';
import { WatchlistDetail } from '@/components/features/watchlists/watchlist-detail';
import { WatchlistBoard } from '@/components/scout/watchlist-board';
import { usePlaceholderState } from '@/hooks/use-placeholder-state';
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
	const [view, setView] = usePlaceholderState<View>('watchlist-view', 'list');
	const board = isScout && view === 'board';
	return (
		<Screen>
			<SectionHeader
				actions={isScout ? (
					<>
						{board && <PlaceholderTag />}
						<Seg ariaLabel="Watchlist view" value={view} onChange={setView} options={[{ key: 'list', label: 'List' }, { key: 'board', label: 'Board' }]} />
					</>
				) : undefined}
			/>
			{board
				? <WatchlistBoard id={id} />
				: <WatchlistDetail id={id} backHref={hrefOf('watchlists')} companyHref={companyHref} />}
		</Screen>
	);
}
