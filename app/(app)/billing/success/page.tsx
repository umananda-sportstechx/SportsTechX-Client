'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSWRConfig } from 'swr';
import { CheckCircle2 } from 'lucide-react';
import { qk } from '@/lib/query-keys';
import { Page } from '@/components/ui/atoms';

/**
 * Post-Stripe-checkout landing. Stripe redirects here with `?session_id=…`
 * after a successful payment. The actual tier flip happens server-side via
 * the `customer.subscription.created` webhook — we just confirm to the user
 * and bounce them home once SWR has refreshed `profile` + `subscription`.
 */
export default function BillingSuccessPage() {
	const params = useSearchParams();
	const router = useRouter();
	const { mutate } = useSWRConfig();
	const sessionId = params.get('session_id');

	useEffect(() => {
		// Webhook may race us — give it a moment then refetch the user-visible
		// pieces of state that change on tier change.
		const t = setTimeout(() => {
			void mutate(qk.profile());
			void mutate(qk.billing.subscription());
			void mutate(qk.billing.invoices());
		}, 1500);
		const r = setTimeout(() => router.replace('/dashboard'), 4000);
		return () => { clearTimeout(t); clearTimeout(r); };
	}, [mutate, router]);

	return (
		<Page>
			<div style={{ maxWidth: 480, margin: '80px auto', textAlign: 'center' }}>
				<CheckCircle2 size={48} color="oklch(70% 0.18 145)" style={{ marginBottom: 16 }} />
				<h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, marginBottom: 8 }}>
					You're in.
				</h1>
				<p style={{ color: 'var(--fg-2)', marginBottom: 24, lineHeight: 1.5 }}>
					Payment received. We're activating your subscription now — you'll be redirected to your dashboard in a moment.
				</p>
				{sessionId && (
					<div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-muted)', marginBottom: 24 }}>
						{sessionId.slice(0, 24)}…
					</div>
				)}
				<Link className="btn" href="/dashboard">Go to dashboard now</Link>
			</div>
		</Page>
	);
}
