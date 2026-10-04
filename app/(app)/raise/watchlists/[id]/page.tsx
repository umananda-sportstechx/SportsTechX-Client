'use client';

import { useParams } from 'next/navigation';
import { Screen } from '@/components/atlas';
import { RaiseSectionHeader } from '@/components/raise/raise-section-header';
import { WatchlistDetail } from '@/components/features/watchlists/watchlist-detail';

/** Watchlists → one company watchlist (its own URL per list). */
export default function RaiseWatchlistPage() {
	const id = String(useParams().id);
	return (
		<Screen>
			<RaiseSectionHeader />
			<WatchlistDetail id={id} backHref="/raise/watchlists" companyHref={(s) => `/raise/discover/companies/${encodeURIComponent(s)}`} />
		</Screen>
	);
}
