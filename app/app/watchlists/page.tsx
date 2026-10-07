'use client';

import { Screen, SectionHeader } from '@/components/atlas';
import { WatchlistsOverview } from '@/components/features/watchlists/watchlists-overview';
import { hrefOf } from '@/lib/routes';

/** Watchlists: every list the user has, with its companies. */
export default function Page() {
	return (
		<Screen>
			<SectionHeader />
			<WatchlistsOverview watchlistHref={(id) => `${hrefOf('watchlists')}/${id}`} />
		</Screen>
	);
}
