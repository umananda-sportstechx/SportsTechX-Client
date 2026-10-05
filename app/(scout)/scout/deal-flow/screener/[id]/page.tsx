'use client';

import { useParams } from 'next/navigation';
import { DeckAnalysisDetail } from '@/components/features/deck-analysis/deck-analysis-detail';
import { SCREENER_DETAIL_COPY } from '@/components/scout/deck-screener';

/** Deck Screener → full analysis of one deck (shared deck analysis). */
export default function ScoutDeckAnalysisPage() {
	return <DeckAnalysisDetail id={String(useParams().id)} basePath="/scout/deal-flow/screener" copy={SCREENER_DETAIL_COPY} />;
}
