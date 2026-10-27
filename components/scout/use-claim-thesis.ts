'use client';

import { useMemo } from 'react';
import useSWR from 'swr';
import { useVerifyState } from '@/components/features/verify/verify-cta';
import { decodeClaimForm } from '@/components/claim/decode-claim-form';
import { useClaimReference } from '@/components/claim/use-claim-reference';
import { qk } from '@/lib/query-keys';
import { thesisFromClaim } from './claim-thesis';
import type { Thesis } from './sample-data';

/**
 * The viewer's own investor claim (pending or verified) as thesis fields, so
 * the thesis wizard opens with what they already typed into the claim.
 * `GET /api/claims/:id/form` is owner-only and is what the claim modal reloads
 * from too.
 */
export function useClaimThesis(): { prefill: Partial<Thesis> | null; isLoading: boolean } {
	const { state, claim, isLoading: claimsLoading } = useVerifyState();
	const id = claim?.claim_type === 'investor' && (state === 'verified' || state === 'pending') ? claim.id : null;
	const form = useSWR<Record<string, unknown>>(id ? qk.claims.form(id) : null, { shouldRetryOnError: false });
	const ref = useClaimReference();
	const sectorsReady = ref.sectors.length > 0;
	// Keyed on the data, not `ref` (a fresh object every render).
	const prefill = useMemo(
		() => (form.data ? thesisFromClaim(decodeClaimForm(form.data, ref)) : null),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[form.data, sectorsReady],
	);
	return { prefill, isLoading: claimsLoading || (!!id && form.isLoading) };
}
