'use client';

import { useCallback, useMemo } from 'react';
import useSWR from 'swr';
import { useUserProfile } from '@/hooks/use-user-profile';
import { usePlaceholderState } from '@/hooks/use-placeholder-state';
import { apiRequest } from '@/lib/query-client';
import { qk } from '@/lib/query-keys';
import { DEFAULT_THESIS, type Thesis } from './sample-data';
import {
	indexByName, toForm, toProfileDto, toThesisDto,
	type ScoutProfile, type ServerThesis, type TaxonomyRef,
} from './thesis-codec';

/**
 * The investor's thesis, stored on the account.
 *
 * This used to be `usePlaceholderState` with a comment reading "kept in the
 * browser until an investor-thesis endpoint exists". The endpoint exists —
 * `GET`/`PUT /api/scout/thesis`, plus `POST`/`PATCH /api/scout` for the profile
 * half — and the thesis is the gate on the rest of Scout: every other
 * `/api/scout/*` route answers **403 SCOUT_NOT_SET_UP** until setup completes,
 * so leaving this in localStorage left the whole product unreachable.
 *
 * `save` writes both halves. The server takes either verb on the profile
 * (`POST` and `PATCH` both upsert) precisely so the wizard does not have to
 * know whether this is the first step or the fourth.
 *
 * **Not everything round-trips.** The attributes picker offers revenue models,
 * technologies, customer types and themes; the schema has columns for business
 * models and sports only. Those extras stay in this browser, as they did
 * before — flagged here rather than silently dropped on save.
 */

/** Attribute labels the server can store, as business models or sports. */
function splitLocal(include: string[], sports: Map<string, string>, models: Set<string>): string[] {
	return include.filter((i) => !models.has(i) && !sports.has(i.toLowerCase()));
}

const MODEL_LABELS = new Set(['B2B', 'B2C', 'B2B2C', 'D2C', 'B2G']);

export interface ThesisState {
	thesis: Thesis;
	save: (next: Thesis) => Promise<void>;
	isLoading: boolean;
	/** The wizard has never been completed — the rest of Scout is still gated. */
	needsSetup: boolean;
}

export function useThesisState(): ThesisState {
	const { data: profile } = useUserProfile();
	const scout = useSWR<ScoutProfile | null>(qk.scout.profile());
	// 403 until setup completes, which is expected rather than an error — the
	// wizard is what clears it. `shouldRetryOnError` is already off for 404 and
	// typed errors; one failed read here must not block the form from rendering.
	const thesis = useSWR<ServerThesis>(qk.scout.thesis(), { shouldRetryOnError: false });

	const sectors = useSWR<TaxonomyRef[] | { data: TaxonomyRef[] }>(qk.reference.sectors(), { dedupingInterval: 60 * 60_000 });
	const rounds = useSWR<TaxonomyRef[] | { data: TaxonomyRef[] }>(qk.reference.roundTypes(), { dedupingInterval: 60 * 60_000 });
	const sports = useSWR<TaxonomyRef[] | { data: TaxonomyRef[] }>(qk.reference.sports(), { dedupingInterval: 60 * 60_000 });
	const list = (d: TaxonomyRef[] | { data: TaxonomyRef[] } | undefined) =>
		Array.isArray(d) ? d : (d?.data ?? []);

	const idx = useMemo(() => ({
		sectors: indexByName(list(sectors.data)),
		rounds: indexByName(list(rounds.data)),
		sports: indexByName(list(sports.data)),
	}), [sectors.data, rounds.data, sports.data]);

	// The attribute chips the schema has no column for.
	const [extras, saveExtras] = usePlaceholderState<string[]>('scout-thesis-extras', []);

	const value = useMemo<Thesis>(() => {
		const base = toForm(thesis.data, scout.data, {
			...DEFAULT_THESIS,
			name: profile?.full_name ?? profile?.display_name ?? '',
			email: profile?.email ?? '',
		});
		return { ...base, email: profile?.email ?? base.email, include: [...base.include, ...extras] };
	}, [thesis.data, scout.data, profile, extras]);

	const save = useCallback(async (next: Thesis) => {
		saveExtras(splitLocal(next.include, idx.sports, MODEL_LABELS));
		const p = await apiRequest('PATCH', '/api/scout', toProfileDto(next));
		if (!p.ok) throw new Error(`profile save failed (${p.status})`);
		const r = await apiRequest('PUT', '/api/scout/thesis', toThesisDto(next, idx));
		if (!r.ok) throw new Error(`thesis save failed (${r.status})`);
		await Promise.all([scout.mutate(), thesis.mutate()]);
	}, [idx, saveExtras, scout, thesis]);

	return {
		thesis: value,
		save,
		isLoading: scout.isLoading || thesis.isLoading,
		needsSetup: !scout.data?.setup_completed_at,
	};
}

/** Mark the wizard finished. Stamps `setup_completed_at`, which is what lifts
 *  the 403 on the rest of Scout. */
export async function completeScoutSetup(): Promise<void> {
	const res = await apiRequest('PATCH', '/api/scout', { setup_completed: true });
	if (!res.ok) throw new Error(`setup completion failed (${res.status})`);
}

/** Tuple form, kept so the four existing callers read unchanged. */
export function useThesis(): [Thesis, (next: Thesis) => Promise<void>] {
	const { thesis, save } = useThesisState();
	return [thesis, save];
}

/** "Seed, Series A and Fan Engagement" style lists. */
export function listText(items: string[]): string {
	if (items.length <= 1) return items[0] ?? '';
	return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/** Short tags summarising the thesis (Home "Tuned to your thesis"). */
export function thesisTags(t: Thesis): string[] {
	const regions = t.regions.slice(0, 3);
	return [...t.stages, ...t.sectors, ...regions, ...(t.regions.length > 3 ? [`+${t.regions.length - 3} regions`] : [])];
}
