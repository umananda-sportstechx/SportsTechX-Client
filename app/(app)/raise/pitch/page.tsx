'use client';

import { RaiseSectionHeader } from '@/components/raise/raise-section-header';
import { DeckSummary } from '@/components/features/deck-analysis/deck-summary';

/** Atlas Raise — Pitch deck: upload + latest score (shared deck-analysis feature). */
export default function RaisePitchPage() {
	return <DeckSummary basePath="/raise/pitch" header={(actions) => <RaiseSectionHeader actions={actions} />} />;
}
