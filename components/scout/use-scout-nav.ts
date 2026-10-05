'use client';

import { useMemo } from 'react';
import { BookmarkPlus } from 'lucide-react';
import { isSection, type ShellNavEntry } from '@/components/atlas';
import { useCompanyWatchlists } from '@/components/features/watchlists/use-company-watchlists';
import { SCOUT_NAV } from './shell-config';

/** SCOUT_NAV with the user's company watchlists listed under Watchlists (before "All watchlists"). */
export function useScoutNav(): ShellNavEntry[] {
	const { lists } = useCompanyWatchlists();
	return useMemo(() => SCOUT_NAV.map((e) => {
		if (!isSection(e) || e.title !== 'Watchlists') return e;
		return { ...e, items: [...lists.map((l) => ({ name: l.name, icon: BookmarkPlus, path: `/scout/watchlists/${l.id}` })), ...e.items] };
	}), [lists]);
}
