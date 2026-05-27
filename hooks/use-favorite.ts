'use client';

import { useState, useCallback } from 'react';
import useSWR, { mutate as globalMutate } from 'swr';
import { qk } from '@/lib/query-keys';
import { apiRequest } from '@/lib/query-client';

export type FavKind = 'companies' | 'investors' | 'ecosystem' | 'deals';

type FavRow =
	| { company_id: string }
	| { investor_id: string }
	| { ecosystem_entity_id: string }
	| { deal_id: string };

interface FavListResponse { data: FavRow[] }

const ID_FIELD: Record<FavKind, keyof FavRow> = {
	companies: 'company_id',
	investors: 'investor_id',
	ecosystem: 'ecosystem_entity_id',
	deals: 'deal_id',
} as Record<FavKind, keyof FavRow>;

export function useFavorite(kind: FavKind, targetId: string | null | undefined): {
	isFavorite: boolean;
	toggle: () => Promise<void>;
	pending: boolean;
} {
	const { data } = useSWR<FavListResponse>(qk.favorites.list(kind));
	const [pending, setPending] = useState(false);

	const idField = ID_FIELD[kind];
	const isFavorite = !!(targetId && data?.data?.some((r) => (r as Record<string, unknown>)[idField as string] === targetId));

	const toggle = useCallback(async () => {
		if (!targetId || pending) return;
		setPending(true);
		const wasFavorite = isFavorite;
		try {
			await apiRequest(
				wasFavorite ? 'DELETE' : 'POST',
				`/api/favorites/${kind}/${targetId}`,
				wasFavorite ? undefined : {},
			);
			await globalMutate(qk.favorites.list(kind));
		} finally {
			setPending(false);
		}
	}, [kind, targetId, isFavorite, pending]);

	return { isFavorite, toggle, pending };
}
