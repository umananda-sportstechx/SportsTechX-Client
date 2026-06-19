'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { Sparkles, Loader2 } from 'lucide-react';
import { apiRequest } from '@/lib/query-client';
import { qk } from '@/lib/query-keys';

/**
 * Buy AI credits. Lists active credit packs and starts a one-time Stripe
 * checkout; credits are granted by the webhook on payment and never expire
 * (consumed after the monthly plan allowance). Deep-linkable destination for the
 * "out of credits" (402) flow.
 */
interface CreditPack {
	id: string;
	name: string;
	description: string | null;
	credit_type: string;
	credit_amount: number;
	price_amount: number; // cents
	currency_code: string;
}
interface CreditBalance { monthly_balance: number; topup_balance: number; total_available: number }

function formatPrice(cents: number, currency: string): string {
	try {
		return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);
	} catch {
		return `${(cents / 100).toFixed(2)} ${currency}`;
	}
}

export default function CreditsPage() {
	const { data: packsResp, isLoading } = useSWR<{ data: CreditPack[] }>(qk.billing.creditPacks(), { dedupingInterval: 30 * 60_000 });
	const { data: balance } = useSWR<CreditBalance>(qk.credits.balance('ai'), { dedupingInterval: 30_000 });
	const [busy, setBusy] = useState<string | null>(null);
	const packs = (packsResp?.data ?? []).filter((p) => p.credit_type === 'ai');

	const buy = async (id: string) => {
		setBusy(id);
		try {
			const origin = window.location.origin;
			const res = await apiRequest('POST', '/api/billing/credit-packs/checkout', {
				pack_id: id,
				success_url: `${origin}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
				cancel_url: `${origin}/credits`,
			});
			const { url } = (await res.json()) as { url?: string };
			if (url) window.location.href = url;
			else toast.error('Could not start checkout');
		} catch (e) {
			toast.error((e as Error).message ?? 'Could not start checkout');
		} finally {
			setBusy(null);
		}
	};

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

			<div className="mt-8">
				{isLoading ? (
					<div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
				) : packs.length === 0 ? (
					<div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
						No credit packs are available right now. Check back soon.
					</div>
				) : (
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
						{packs.map((p) => (
							<div key={p.id} className="rounded-lg border border-border p-4">
								<div className="font-semibold">{p.name}</div>
								<div className="mt-1 text-2xl font-extrabold">
									{p.credit_amount.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">credits</span>
								</div>
								{p.description && <div className="mt-1 text-xs text-muted-foreground">{p.description}</div>}
								<button
									className="mt-3 w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
									disabled={busy === p.id}
									onClick={() => void buy(p.id)}
								>
									{busy === p.id ? 'Redirecting…' : `Buy · ${formatPrice(p.price_amount, p.currency_code)}`}
								</button>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
