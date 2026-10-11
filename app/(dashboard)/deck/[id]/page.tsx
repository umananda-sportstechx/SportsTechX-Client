'use client';

import { useParams } from 'next/navigation';
import { DeckAnalysisDetail } from '@/components/features/deck-analysis/deck-analysis-detail';
import { SCREENER_DETAIL_COPY } from '@/components/scout/deck-screener';
import { getUserType, useUserProfile } from '@/hooks/use-user-profile';

/** Deck analysis → the full read on one deck. Investor copy for Scout. */
export default function Page() {
	const { data: profile } = useUserProfile();
	return (
		<DeckAnalysisDetail
			id={String(useParams().id)}
			copy={getUserType(profile) === 'scout' ? SCREENER_DETAIL_COPY : undefined}
		/>
	);
}
