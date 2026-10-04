'use client';

import { useMemo } from 'react';
import { BookmarkPlus } from 'lucide-react';
import { isSection, type ShellNavEntry } from '@/components/atlas';
import { useCompanyWatchlists } from '@/components/features/watchlists/use-company-watchlists';
import { RAISE_NAV } from './shell-config';

/** RAISE_NAV with the user's company watchlists listed under Watchlists (before "All watchlists"). */
export function useRaiseNav(): ShellNavEntry[] {
	const { lists } = useCompanyWatchlists();
	return useMemo(() => RAISE_NAV.map((e) => {
		if (!isSection(e) || e.title !== 'Watchlists') return e;
		const [main, ...rest] = e.items;
		return { ...e, items: [main, ...lists.map((l) => ({ name: l.name, icon: BookmarkPlus, path: `/raise/watchlists/${l.id}` })), ...rest] };
	}), [lists]);
}
