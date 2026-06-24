'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { Sparkles, ArrowRight } from 'lucide-react';
import { qk } from '@/lib/query-keys';

/**
 * AI Credits — balance + usage history. Buying top-up packs lives in ONE place,
 * the Subscriptions page (alongside plans), so this page only shows the balance
 * and recent activity and links there to buy. Deep-linkable from the "out of
 * credits" flow.
 */
interface CreditBalance { monthly_balance: number; topup_balance: number; total_available: number; monthly_grant?: number }
interface LedgerRow { id: string; transaction_type: string; amount: number; balance_after: number; description: string | null; operation_key: string | null; occurred_at: string }

const OP_LABEL: Record<string, string> = {
	'ai.chat_turn': 'Chat', 'ai.deck_analysis': 'Deck analysis', 'ai.embedding': 'Document search', 'ai.chat_summary': 'Chat memory',
};
function ledgerLabel(r: LedgerRow): string {
	if (r.operation_key && OP_LABEL[r.operation_key]) return OP_LABEL[r.operation_key];
	if (r.description) return r.description;
	return r.transaction_type.replace(/_/g, ' ');
}

export default function CreditsPage() {
	const { data: balance } = useSWR<CreditBalance>(qk.credits.balance('ai'), { dedupingInterval: 30_000 });
	const { data: ledger } = useSWR<{ data: LedgerRow[] }>(qk.credits.ledger('ai', undefined, 20), { dedupingInterval: 30_000 });
	const history = ledger?.data ?? [];

	return (
		<div className="mx-auto max-w-4xl p-6">
			<div className="flex items-end justify-between gap-4 flex-wrap">
				<div>
					<h1 className="text-xl font-semibold flex items-center gap-2"><Sparkles className="h-5 w-5" /> AI Credits</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						Credits power chat, the pitch-deck analyzer, and document search. Your plan refills a monthly
						allowance; purchased top-ups never expire and are used after it.
					</p>
				</div>
				<div className="text-right">
					<div className="text-xs uppercase tracking-wide text-muted-foreground">Available</div>
					<div className="text-2xl font-extrabold">{(balance?.total_available ?? 0).toLocaleString()}</div>
					<div className="text-xs text-muted-foreground">
						{(balance?.monthly_balance ?? 0).toLocaleString()} plan · {(balance?.topup_balance ?? 0).toLocaleString()} top-up
					</div>
				</div>
			</div>

			{/* Buying lives on Subscriptions (plans + top-up packs together). */}
			<div className="mt-8 flex flex-col gap-3 rounded-lg border border-border p-5 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<div className="font-semibold">Need more credits?</div>
					<div className="text-sm text-muted-foreground">Buy a top-up pack or upgrade your plan on the Subscriptions page.</div>
				</div>
				<Link
					href="/subscriptions"
					className="inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
				>
					Get more credits <ArrowRight className="h-3.5 w-3.5" />
				</Link>
			</div>

			<div className="mt-10">
				<h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Recent activity</h2>
				{history.length === 0 ? (
					<div className="mt-3 rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
						No credit activity yet. Usage from chat, the deck analyzer, and search will show here.
					</div>
				) : (
					<div className="mt-3 divide-y divide-border rounded-lg border border-border">
						{history.map((r) => {
							const spent = r.amount < 0;
							return (
								<div key={r.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
									<div className="min-w-0">
										<div className="font-medium">{ledgerLabel(r)}</div>
										<div className="text-xs text-muted-foreground">{new Date(r.occurred_at).toLocaleString()}</div>
									</div>
									<div className="text-right">
										<div className={`font-semibold ${spent ? 'text-destructive' : 'text-emerald-600'}`}>
											{spent ? '' : '+'}{r.amount.toLocaleString()}
										</div>
										<div className="text-xs text-muted-foreground">{r.balance_after.toLocaleString()} left</div>
									</div>
								</div>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
}
