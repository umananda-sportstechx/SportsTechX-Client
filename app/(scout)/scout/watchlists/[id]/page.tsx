'use client';

import { useParams } from 'next/navigation';
import { PlaceholderTag, Screen, Seg } from '@/components/atlas';
import { ScoutSectionHeader } from '@/components/scout/scout-section-header';
import { WatchlistDetail } from '@/components/features/watchlists/watchlist-detail';
import { WatchlistBoard } from '@/components/scout/watchlist-board';
import { usePlaceholderState } from '@/hooks/use-placeholder-state';
import { scoutCompanyHref } from '@/components/scout/shell-config';

type View = 'list' | 'board';

/** Watchlists → one company watchlist: list (live) or stage board (stages Backend Not Connected). */
export default function ScoutWatchlistPage() {
	const id = String(useParams().id);
	const [view, setView] = usePlaceholderState<View>('watchlist-view', 'list');
	return (
		<Screen>
			<ScoutSectionHeader actions={<>{view === 'board' && <PlaceholderTag />}<Seg ariaLabel="Watchlist view" value={view} onChange={setView} options={[{ key: 'list', label: 'List' }, { key: 'board', label: 'Board' }]} /></>} />
			{view === 'list'
				? <WatchlistDetail id={id} backHref="/scout/watchlists" companyHref={scoutCompanyHref} />
				: <WatchlistBoard id={id} />}
		</Screen>
	);
}
