'use client';

import Link from 'next/link';
import { ArrowLeft, XCircle } from 'lucide-react';
import { Page } from '@/components/ui/atoms';

/** Post-Stripe-checkout landing when the user closes the checkout without paying. */
export default function BillingCancelPage() {
	return (
		<Page>
			<div style={{ maxWidth: 480, margin: '80px auto', textAlign: 'center' }}>
				<XCircle size={48} color="var(--fg-muted)" style={{ marginBottom: 16 }} />
				<h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, marginBottom: 8 }}>
					Checkout cancelled
				</h1>
				<p style={{ color: 'var(--fg-2)', marginBottom: 24, lineHeight: 1.5 }}>
					No charge was made. You can pick a plan whenever you're ready.
				</p>
				<div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
					<Link className="btn ghost" href="/dashboard"><ArrowLeft size={12} /> Dashboard</Link>
					<Link className="btn" href="/subscriptions">Back to plans</Link>
				</div>
			</div>
		</Page>
	);
}
