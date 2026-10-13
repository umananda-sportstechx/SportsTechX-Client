'use client';

import { useMemo } from 'react';
import type { ShellNavEntry, ShellNavItem } from '@/components/atlas';
import { useCompanyWatchlists } from '@/components/features/watchlists/use-company-watchlists';
import { getUserType, useUserProfile } from '@/hooks/use-user-profile';
import { buildNav } from '@/lib/nav';
import { previewProduct } from '@/lib/preview-mode';
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
	// The pre-signup preview (app/preview/) has no profile to read a tier from
	// at all — `getUserType(undefined)` defaults to 'explore', which silently
	// hid every Scout/Raise-only nav section and action (e.g. SectionHeader
	// rendering nothing because it can't find the current page in Explore's
	// nav) for a visitor who is very much not on Explore. The `[product]` URL
	// segment stands in for the tier there instead.
	const preview = previewProduct();
	// `getUserType(undefined)` is 'explore', so until the profile lands a paying
	// user would be handed the Explore shell — Explore nav, Explore product
	// colour and the upgrade cards, flashed at someone who already paid.
	// `RouteGate` documents exactly this and renders nothing until the tier is
	// known; `ready` lets callers do the same.
	const ready = !!preview || !!profile;
	const tier = preview ?? getUserType(profile);
	const isAdmin = profile?.user_role === 'admin';
	const { lists } = useCompanyWatchlists();

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
