'use client';

import useSWR from 'swr';
import { ShieldCheck } from 'lucide-react';
import { Badge, Button } from '@/components/atlas';
import { openClaim, type ClaimRole, type ClaimTarget } from '@/lib/claim-events';
import { useUserProfile, getUserType } from '@/hooks/use-user-profile';
import { qk } from '@/lib/query-keys';

/**
 * "Get verified" — one component behind every entry point.
 *
 * Verification is **tier-free by design**: the directory is only as good as the
 * people correcting it, so an Explore user must be able to claim their company
 * just as a paying one can. The server never gated this (`/api/claims/*` carries
 * no `@RequireTier`); the client simply had no door — every entry point was
 * locked to Scout or Raise, or sat in the company drawer, which is unreachable
 * because the companies list always passes `companyHref` and navigates instead.
 *
 * There are three doors now (sidebar, entity profile, Account), so the copy and
 * the pending-state logic live here rather than being copied three times and
 * drifting.
 *
 * The modal itself needs nothing: it handles all three roles and is mounted
 * globally in `app/providers.tsx`, so `openClaim` works from anywhere.
 */
interface ClaimRow {
	id: string;
	is_verified: boolean | null;
	target_company_id: string | null;
	target_investor_id: string | null;
	target_ecosystem_entity_id: string | null;
}

export type VerifyState = 'none' | 'pending' | 'verified';

/**
 * The viewer's claim status, optionally scoped to one entity.
 *
 * Matched on the entity **id**, not the name snapshot. Names are not unique
 * in this directory and the snapshot is whatever was typed at claim time, so
 * name matching both misses real claims and — worse — can report "Verified"
 * on a company the viewer does not own.
 */
export function useVerifyState(entityId?: string): { state: VerifyState; isLoading: boolean } {
	const { data, isLoading } = useSWR<ClaimRow[] | { data: ClaimRow[] }>(qk.claims.mine());
	const rows = Array.isArray(data) ? data : (data?.data ?? []);
	const relevant = entityId
		? rows.filter((r) => r.target_company_id === entityId
			|| r.target_investor_id === entityId
			|| r.target_ecosystem_entity_id === entityId)
		: rows;
	if (relevant.some((r) => r.is_verified)) return { state: 'verified', isLoading };
	if (relevant.length > 0) return { state: 'pending', isLoading };
	return { state: 'none', isLoading };
}

/**
 * Which claim form a tier should get when the caller has not already decided.
 *
 * A Raise user is a founder and a Scout user is an investor — asking them to
 * pick is a question we already know the answer to. Explore is the one tier
 * where it is a real question, so it falls through to the modal's own
 * founder/investor chooser.
 *
 * Returning null means "let the modal ask", which is exactly its behaviour when
 * no role is passed.
 */
function roleForTier(tier: string): ClaimRole | null {
	return tier === 'raise' ? 'founder' : tier === 'scout' ? 'investor' : null;
}

/**
 * The button. `target` pre-fills the claim so the user skips the search step —
 * worth passing wherever the entity is already known.
 *
 * `role` is optional: left out, it is inferred from the viewer's tier rather
 * than every call site repeating the same rule.
 */
export function VerifyButton({ role = null, target = null, entityId, label }: {
	role?: ClaimRole | null;
	target?: ClaimTarget | null;
	/** Scopes the pending/verified state to one entity, by id. */
	entityId?: string;
	label?: string;
}) {
	const { state } = useVerifyState(entityId);
	const { data: profile } = useUserProfile();
	// An explicit role always wins — a company profile page knows it is a
	// founder claim regardless of who is looking at it.
	const effectiveRole = role ?? target?.role ?? roleForTier(getUserType(profile));

	// Already settled — inviting a duplicate submission helps nobody, and the
	// admin queue is where duplicates cost real time.
	if (state === 'verified') return <Badge tone="ok">Verified</Badge>;
	if (state === 'pending') return <Badge tone="neutral">Verification pending</Badge>;

	return (
		<Button size="sm" variant="outline" onClick={() => openClaim(target, effectiveRole)}>
			<ShieldCheck size={13} aria-hidden="true" /> {label ?? 'Get verified'}
		</Button>
	);
}
