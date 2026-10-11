'use client';

import { Screen, SectionHeader } from '@/components/atlas';
import { RecommendedInvestors } from '@/components/raise/investors';
import { Recommended } from '@/components/scout/recommended';
import { getUserType, useUserProfile } from '@/hooks/use-user-profile';

/**
 * Discover → Recommended.
 *
 * One URL, two different domain objects: investors matched to a founder's raise,
 * or companies matched to an investor's thesis. A user holds one paid tier, so
 * there is always exactly one right answer — no need for two routes.
 */
export default function Page() {
	const { data: profile } = useUserProfile();
	return (
		<Screen>
			<SectionHeader />
			{getUserType(profile) === 'scout' ? <Recommended /> : <RecommendedInvestors />}
		</Screen>
	);
}
