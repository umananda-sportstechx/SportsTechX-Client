'use client';

import { useParams } from 'next/navigation';
import { SectionHeader } from '@/components/atlas';
import { DeckSummary } from '@/components/features/deck-analysis/deck-summary';
import { SCREENER_COPY } from '@/components/scout/deck-screener';

/** Preview's `/deck` — Scout's "Deck Screener" copy vs. Raise's "Pitch Deck", by the `[product]` URL segment instead of a real tier. */
export default function Page() {
	const { product } = useParams<{ product: string }>();
	return <DeckSummary copy={product === 'scout' ? SCREENER_COPY : undefined} header={(actions) => <SectionHeader actions={actions} />} />;
}
