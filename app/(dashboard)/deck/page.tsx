'use client';

import { SectionHeader } from '@/components/atlas';
import { DeckSummary } from '@/components/features/deck-analysis/deck-summary';
import { SCREENER_COPY } from '@/components/scout/deck-screener';
import { getUserType, useUserProfile } from '@/hooks/use-user-profile';

/**
 * Deck analysis — upload a deck, get a structured read.
 *
 * One screen, two audiences: a founder checking their own pitch ("Pitch Deck")
 * and an investor screening someone else's ("Deck Screener"). Same backend,
 * same component; only the copy differs, which is why this was two pages.
 *
 * `DeckSummary` renders its own `Screen` — don't wrap it in another.
 */
export default function Page() {
	const { data: profile } = useUserProfile();
	const copy = getUserType(profile) === 'scout' ? SCREENER_COPY : undefined;
	return <DeckSummary copy={copy} header={(actions) => <SectionHeader actions={actions} />} />;
}
