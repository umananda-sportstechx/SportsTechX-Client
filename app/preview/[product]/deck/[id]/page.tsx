'use client';

import { useParams } from 'next/navigation';
import { DeckAnalysisDetail } from '@/components/features/deck-analysis/deck-analysis-detail';
import { SCREENER_DETAIL_COPY } from '@/components/scout/deck-screener';

/** Preview's deck detail page — Scout's screener copy by the `[product]` URL segment instead of a real tier. */
export default function Page() {
	const { product, id } = useParams<{ product: string; id: string }>();
	return <DeckAnalysisDetail id={id} copy={product === 'scout' ? SCREENER_DETAIL_COPY : undefined} />;
}
