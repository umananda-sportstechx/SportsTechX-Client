'use client';

import { DeckSummary } from '@/components/features/deck-analysis/deck-summary';
import { ScoutSectionHeader } from '@/components/scout/scout-section-header';
import { SCREENER_COPY } from '@/components/scout/deck-screener';

/** Deal Flow → Deck Screener: the shared deck analysis (same backend as Raise Pitch Deck), investor copy. */
export default function ScoutDeckScreenerPage() {
	return <DeckSummary basePath="/scout/deal-flow/screener" header={(actions) => <ScoutSectionHeader actions={actions} />} copy={SCREENER_COPY} />;
}
