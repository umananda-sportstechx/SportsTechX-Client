'use client';

import { useMemo } from 'react';
import type { ShellNavEntry, ShellNavItem } from '@/components/atlas';
import { isInvestorList, useCompanyWatchlists } from '@/components/features/watchlists/use-company-watchlists';
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
	/** False until the profile has loaded. Treat the tier as unknown until then. */
	ready: boolean;
	tier: Tier;
	nav: ShellNavEntry[];
	bottomNav: ShellNavItem[];
	homePath: string;
	accountPath: string;
	subs: Record<string, string>;
} {
	const { data: profile } = useUserProfile();
	// `getUserType(undefined)` is 'explore', so until the profile lands a paying
	// user would be handed the Explore shell — Explore nav, Explore product
	// colour and the upgrade cards, flashed at someone who already paid.
	// `RouteGate` documents exactly this and renders nothing until the tier is
	// known; `ready` lets callers do the same.
	const ready = !!profile;
	const tier = getUserType(profile);
	const isAdmin = profile?.user_role === 'admin';
	const { lists: all } = useCompanyWatchlists();
	// Investor lists are Raise's (their board is the Raise-only pipeline). A
	// founder who moves to another plan keeps them on file but not in the nav.
	const lists = useMemo(() => (tier === 'raise' ? all : all.filter((l) => !isInvestorList(l))), [all, tier]);

	return useMemo(() => {
		const { nav, bottomNav } = buildNav(tier, isAdmin, lists, 'nav-list');
		return {
			ready, tier, nav, bottomNav,
			homePath: pathOf('home', tier),
			accountPath: pathOf('account', tier),
			subs: SECTION_SUBS[tier],
		};
	}, [ready, tier, isAdmin, lists]);
}
