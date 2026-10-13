'use client';

import useSWR from 'swr';
import { VerifiedBadge } from '@/components/atlas/icons/verified-badge';
import { Button } from '@/components/atlas';
import { openClaim, type ClaimRole, type ClaimTarget } from '@/lib/claim-events';
import { rolesForTier } from '@/lib/claim-roles';
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
	claim_type: 'company' | 'investor' | 'ecosystem_entity';
	is_verified: boolean | null;
	target_company_id: string | null;
	target_investor_id: string | null;
	target_ecosystem_entity_id: string | null;
	target_name_snapshot: string | null;
	target_website_snapshot: string | null;
}

export type VerifyState = 'none' | 'pending' | 'verified';

const ROLE_OF: Record<ClaimRow['claim_type'], ClaimRole> = {
	company: 'founder', investor: 'investor', ecosystem_entity: 'operator',
};

/** The entity a claim points at, as a claim target the modal can reopen. */
function claimToTarget(c: ClaimRow, verified: boolean): ClaimTarget {
	return {
		role: ROLE_OF[c.claim_type],
		id: c.target_company_id ?? c.target_investor_id ?? c.target_ecosystem_entity_id ?? null,
		name: c.target_name_snapshot ?? '',
		website: c.target_website_snapshot,
		verified,
		claimId: c.id,
	};
}

/**
 * The viewer's claim status, optionally scoped to one entity.
 *
 * Matched on the entity **id**, not the name snapshot. Names are not unique
 * in this directory and the snapshot is whatever was typed at claim time, so
 * name matching both misses real claims and — worse — can report "Verified"
 * on a company the viewer does not own.
 */
export function useVerifyState(entityId?: string): { state: VerifyState; isLoading: boolean; claim: ClaimRow | null } {
	// The navbar mounts this on every authenticated page, so a default dedupe
	// window means a refetch on each navigation. Claims only change when an
	// admin acts on one, so a minute of staleness costs nothing and this stops
	// being a request per page view.
	const { data, isLoading } = useSWR<ClaimRow[] | { data: ClaimRow[] }>(qk.claims.mine(), { dedupingInterval: 60_000 });
	const rows = Array.isArray(data) ? data : (data?.data ?? []);
	const relevant = entityId
		? rows.filter((r) => r.target_company_id === entityId
			|| r.target_investor_id === entityId
			|| r.target_ecosystem_entity_id === entityId)
		: rows;
	// rows arrive newest-first (claims.listMine orders by created_at DESC), so
	// the first match in each bucket is the one to reopen.
	const verified = relevant.find((r) => r.is_verified) ?? null;
	if (verified) return { state: 'verified', isLoading, claim: verified };
	if (relevant.length > 0) return { state: 'pending', isLoading, claim: relevant[0] };
	return { state: 'none', isLoading, claim: null };
}


/**
 * The button. `target` pre-fills the claim so the user skips the search step —
 * worth passing wherever the entity is already known.
 *
 * `role` is optional: left out, it is inferred from the viewer's tier rather
 * than every call site repeating the same rule.
 */
export function VerifyButton({ role = null, target = null, entityId, label, hideWhenVerifiedElsewhere = false }: {
	role?: ClaimRole | null;
	target?: ClaimTarget | null;
	/** Scopes the pending/verified state to one entity, by id. */
	entityId?: string;
	label?: string;
	/** On an entity-scoped CTA (e.g. "Is this your company?"), hide the prompt
	 *  entirely when the viewer already holds a verified claim on something else
	 *  — they're clearly a known user, so don't nudge them to claim this one. */
	hideWhenVerifiedElsewhere?: boolean;
}) {
	const { state, claim } = useVerifyState(entityId);
	// Global claim status (same SWR row, deduped) — "verified on anything".
	const anyVerified = useVerifyState().state === 'verified';
	const { data: profile } = useUserProfile();
	// An explicit role always wins — a company profile page knows it is a
	// founder claim regardless of who is looking at it. Only when nobody has
	// decided does the tier narrow the chooser.
	const explicitRole = role ?? target?.role ?? null;
	const allowed = explicitRole ? undefined : rolesForTier(getUserType(profile));

	// Already settled — but the capsule is a door, not a dead end: clicking it
	// reopens the modal in edit mode for that entity. A verified edit becomes a
	// data-change-request (the live record is untouched until an admin confirms
	// it); a pending edit replaces the still-pending submission. A duplicate is
	// never created — that is handled server-side by the re-submit law.
	if ((state === 'verified' || state === 'pending') && claim) {
		const name = claim.target_name_snapshot?.trim();
		const target = claimToTarget(claim, state === 'verified');
		// Keep the exact pill shape of the "Get verified" button — only the label
		// changes — so it still reads as the same control, now in edit mode.
		return (
			<Button
				size="sm"
				variant="outline"
				className="atlas-verify-btn"
				onClick={() => openClaim(target, target.role, undefined, allowed)}
				title={state === 'verified' ? 'Edit your verified details' : 'Edit your pending submission'}
			>
				<VerifiedBadge size={17} className="atlas-verify-btn__tick" /> {state === 'verified' ? 'Verified' : 'Verification pending'}{name ? ` · ${name}` : ''}
			</Button>
		);
	}

	// Already a known, verified user elsewhere — don't prompt them to claim this
	// specific entity (they can still do it from the Get-verified entry).
	if (hideWhenVerifiedElsewhere && state === 'none' && anyVerified) return null;

	return (
		<Button size="sm" variant="outline" className="atlas-verify-btn" onClick={() => openClaim(target, explicitRole, undefined, allowed)}>
			{/* The verification tick everyone already reads as "verified", in the
			    one place Atlas spends a hue on something that is not a status. */}
			<VerifiedBadge size={17} className="atlas-verify-btn__tick" /> {label ?? 'Get verified'}
		</Button>
	);
}
