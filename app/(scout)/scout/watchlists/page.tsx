'use client';

import { Screen } from '@/components/atlas';
import { ScoutSectionHeader } from '@/components/scout/scout-section-header';
import { WatchlistsOverview } from '@/components/features/watchlists/watchlists-overview';

/** Watchlists → All watchlists: the user's company watchlists (live). */
export default function Page() {
	return (
		<Screen>
			<ScoutSectionHeader />
			<WatchlistsOverview watchlistHref={(id) => `/scout/watchlists/${id}`} />
		</Screen>
	);
}
