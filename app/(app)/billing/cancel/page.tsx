'use client';

import { Brand } from '@/components/ui/brand';
import { Button } from '@/components/atlas/kit';

/** Stripe Checkout cancel landing — no charge was made. */
export default function BillingCancelPage() {
	return (
		<div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 14, padding: 24 }}>
			<Brand variant="horizontal" height={32} />
			<h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--a-ink)', margin: '16px 0 0', letterSpacing: '-0.02em' }}>Checkout cancelled</h1>
			<p style={{ fontSize: 14, color: 'var(--a-muted)', maxWidth: 440, lineHeight: 1.5, margin: 0 }}>No charge was made. You can pick a plan whenever you&apos;re ready.</p>
			<Button href="/billing">Back to billing</Button>
		</div>
	);
}
