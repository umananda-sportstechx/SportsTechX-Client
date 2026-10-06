'use client';

import { useMemo } from 'react';
import { BookmarkPlus } from 'lucide-react';
import type { ShellNavEntry, ShellNavItem } from '@/components/atlas';
import { useCompanyWatchlists } from '@/components/features/watchlists/use-company-watchlists';
import { getUserType, useUserProfile } from '@/hooks/use-user-profile';
import { buildNav } from '@/lib/nav';
import { pathOf, SECTION_SUBS } from '@/lib/routes';
import type { Tier } from '@/lib/access';

/**
 * The signed-in user's sidebar: the route manifest filtered to what their tier
 * can reach, arranged by that product's layout, with their own watchlists
 * spliced in.
 *
 * Replaces `EXPLORE_NAV`, `useRaiseNav()` and `useScoutNav()` — three arrays
 * that listed the same screens at three different URLs and had to be kept in
 * step by hand.
 */
export function useNav(): {
	tier: Tier;
	nav: ShellNavEntry[];
	bottomNav: ShellNavItem[];
	homePath: string;
	accountPath: string;
	subs: Record<string, string>;
} {
	const { data: profile } = useUserProfile();
	const tier = getUserType(profile);
	const isAdmin = profile?.user_role === 'admin';
	const { lists } = useCompanyWatchlists();

	return useMemo(() => {
		const { nav, bottomNav } = buildNav(tier, isAdmin, lists, BookmarkPlus);
		return {
			tier, nav, bottomNav,
			homePath: pathOf('home', tier),
			accountPath: pathOf('account', tier),
			subs: SECTION_SUBS[tier],
		};
	}, [tier, isAdmin, lists]);
}
