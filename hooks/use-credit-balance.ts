'use client';

import useSWR from 'swr';
import { qk } from '@/lib/query-keys';

export interface CreditBalance {
	monthly_balance: number;
	topup_balance: number;
	overage_balance: number;
	/** monthly_balance + topup_balance */
	total_available: number;
	/** The current plan's monthly AI-credit allowance (progress-bar denominator). 0 on free. */
	monthly_grant: number;
}

/**
 * The signed-in user's credit balance, including the plan's monthly allowance
 * (`monthly_grant`) so callers can render a "credits remaining" progress bar.
 * Shared across the sidebar, profile menu, settings, and the exhaustion modal.
 */
export function useCreditBalance(type: 'ai' | 'integration' = 'ai') {
	const { data, isLoading, mutate } = useSWR<CreditBalance>(qk.credits.balance(type), {
		dedupingInterval: 30_000,
	});
	return { balance: data, isLoading, mutate };
}
