'use client';

import { ExploreHome } from '@/components/explore/explore-home';
import { RaiseHome } from '@/components/raise/raise-home';
import { ScoutHome } from '@/components/scout/scout-home';
import { getUserType, useUserProfile } from '@/hooks/use-user-profile';

/**
 * Home, at `/app`.
 *
 * The one route where the three products genuinely differ: a founder gets a
 * search-first composer, an investor a deal feed, a free user a digest. So this
 * selects between three screens rather than sharing one — but it is still a
 * single URL, which is what lets every "go home" link stop caring about tier.
 */
export default function Page() {
	const { data: profile } = useUserProfile();
	switch (getUserType(profile)) {
		case 'raise':
			return <RaiseHome />;
		case 'scout':
			return <ScoutHome />;
		default:
			return <ExploreHome />;
	}
}
