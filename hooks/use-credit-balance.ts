'use client';

import useSWR from 'swr';
import { qk } from '@/lib/query-keys';

export interface CreditBalance {
	monthly_balance: number;
	topup_balance: number;
	overage_balance: number;
	/** monthly_balance + topup_balance */
	total_available: number;
	/** The current plan's monthly STX allowance (progress-bar denominator). 0 on Explore. */
	monthly_grant: number;
}

/**
 * The signed-in user's STX credit balance, including the plan's monthly
 * allowance (`monthly_grant`) so callers can render a "credits remaining"
 * progress bar. Shared across the sidebar, profile menu, settings, exports and
 * the exhaustion modal.
 *
 * There is ONE wallet. AI features and exports draw on the same balance; the
 * ledger still records which of the two a spend was for, but the pool behind
 * them is single. Callers used to pass 'ai' or 'integration' and render the
 * results as two independent pools, which after the merge meant showing the
 * same number twice under two names.
 */
/** `enabled` exists for always-mounted consumers that are usually hidden —
 *  the exhaustion modal host sits on every page and was fetching the
 *  balance on every page load for a dialog nobody had opened. */
export function useCreditBalance(enabled = true) {
	const { data, isLoading, mutate } = useSWR<CreditBalance>(enabled ? qk.credits.balance() : null, {
		dedupingInterval: 30_000,
	});
	return { balance: data, isLoading, mutate };
}
