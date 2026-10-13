'use client';

import { useParams } from 'next/navigation';
import { PlaceholderTag, Screen, Seg, SectionHeader } from '@/components/atlas';
import { WatchlistDetail } from '@/components/features/watchlists/watchlist-detail';
import { WatchlistBoard } from '@/components/scout/watchlist-board';
import { usePlaceholderState } from '@/hooks/use-placeholder-state';
import { companyHref, hrefOf } from '@/lib/routes';

type View = 'list' | 'board';

/** Preview's single watchlist — Scout also gets the stage board, by the `[product]` URL segment instead of a real tier. */
export default function Page() {
	const { product, id } = useParams<{ product: string; id: string }>();
	const isScout = product === 'scout';
	const [view, setView] = usePlaceholderState<View>('watchlist-view', 'list');
	const board = isScout && view === 'board';
	return (
		<Screen>
			<SectionHeader
				actions={isScout ? (
					<>
						{board && <PlaceholderTag />}
						<Seg ariaLabel="Watchlist view" data-tour="scout-board-toggle" value={view} onChange={setView} options={[{ key: 'list', label: 'List' }, { key: 'board', label: 'Board' }]} />
					</>
				) : undefined}
			/>
			{board
				? <WatchlistBoard id={id} />
				: <WatchlistDetail id={id} backHref={hrefOf('watchlists')} companyHref={companyHref} />}
		</Screen>
	);
}
