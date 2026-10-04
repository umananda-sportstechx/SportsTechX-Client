'use client';

import { Screen } from '@/components/atlas';
import { RaiseSectionHeader } from '@/components/raise/raise-section-header';
import { WatchlistsOverview } from '@/components/features/watchlists/watchlists-overview';

/** Watchlists → All watchlists: the user's company watchlists (create, rename, delete, open). */
export default function RaiseWatchlistsPage() {
	return (
		<Screen>
			<RaiseSectionHeader />
			<WatchlistsOverview watchlistHref={(id) => `/raise/watchlists/${id}`} />
		</Screen>
	);
}
