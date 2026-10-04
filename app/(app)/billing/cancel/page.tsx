'use client';

import { Brand } from '@/components/ui/brand';
import { Button, Card } from '@/components/atlas';

/** Stripe Checkout cancel landing — no charge was made. */
export default function BillingCancelPage() {
	return (
		<div className="atlas" style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 24, background: 'var(--a-page)', color: 'var(--a-ink)' }}>
			<Card glow="blue" style={{ width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 16, padding: '36px 28px 32px' }}>
				<Brand variant="horizontal" height={32} />
				<h1 style={{ fontFamily: 'var(--a-font)', fontSize: 30, fontWeight: 700, lineHeight: 1.1, color: 'var(--a-ink)', margin: '16px 0 0' }}>Checkout cancelled</h1>
				<p style={{ fontSize: 13, color: 'var(--a-muted)', maxWidth: 400, lineHeight: 1.55, margin: 0 }}>No charge was made. You can pick a plan whenever you&apos;re ready.</p>
				<div style={{ marginTop: 6 }}><Button href="/billing">Back to billing</Button></div>
			</Card>
		</div>
	);
}
