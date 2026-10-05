'use client';

import { useParams } from 'next/navigation';
import { DeckAnalysisDetail } from '@/components/features/deck-analysis/deck-analysis-detail';

/** Atlas Raise — Pitch deck full analysis (shared deck-analysis feature). */
export default function PitchAnalysisPage() {
	return <DeckAnalysisDetail id={String(useParams().id)} basePath="/raise/pitch" />;
}
