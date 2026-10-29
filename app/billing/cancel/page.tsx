'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Brand } from '@/components/ui/brand';
import { Button, Card } from '@/components/atlas';
import { useUserProfile } from '@/hooks/use-user-profile';

/**
 * Stripe Checkout cancel landing — no charge was made.
 *
 * Someone who backs out of Stripe mid-signup arrives here with no plan chosen
 * and nothing stamped, so they go back to the plan choice (/plans?welcome). An
 * already-stamped user just sees the "cancelled" card.
 */
export default function BillingCancelPage() {
	const router = useRouter();
	const { data: profile, isLoading } = useUserProfile();
	const unanswered = !!profile && !profile.paywall_shown_at;

	useEffect(() => { if (unanswered) router.replace('/plans?welcome=1'); }, [unanswered, router]);
	// Blank only while deciding; a missing profile still gets the card.
	if (unanswered || (!profile && isLoading)) return null;

	return (
		<div className="atlas" style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 24, background: 'var(--a-page)', color: 'var(--a-ink)' }}>
			<Card glow="blue" style={{ width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 16, padding: '36px 28px 32px' }}>
				<Brand variant="horizontal" height={32} />
				<h1 style={{ fontFamily: 'var(--a-font)', fontSize: 30, fontWeight: 700, lineHeight: 1.1, color: 'var(--a-ink)', margin: '16px 0 0' }}>Checkout cancelled</h1>
				<p style={{ fontSize: 13, color: 'var(--a-muted)', maxWidth: 400, lineHeight: 1.55, margin: 0 }}>No charge was made. You can pick a plan whenever you&apos;re ready.</p>
				<div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
					<Button variant="outline" href="/plans">See plans</Button>
					<Button href="/billing">Back to billing</Button>
				</div>
			</Card>
		</div>
	);
}
