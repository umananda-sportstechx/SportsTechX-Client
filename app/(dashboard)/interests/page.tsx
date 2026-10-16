'use client';

import { Screen } from '@/components/atlas';
import { InterestsPage } from '@/components/explore/interests-page';

/** Atlas Explore — Interests. Persists via GET/PUT /api/explore/interests. */
export default function ExploreInterestsPage() {
	return <Screen><InterestsPage /></Screen>;
}
