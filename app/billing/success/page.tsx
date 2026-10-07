'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Check } from 'lucide-react';
import { apiRequest } from '@/lib/query-client';
import { useUserProfile, getUserType } from '@/hooks/use-user-profile';
import { Brand } from '@/components/ui/brand';
import { Button, Card } from '@/components/atlas';
import { hrefOf } from '@/lib/routes';

/** Stripe Checkout success landing. The tier is set by the billing webhook; we
 *  revalidate the profile so it reflects as soon as it's processed. */
export default function BillingSuccessPage() {
	const router = useRouter();
	const { data: profile, mutate } = useUserProfile();
	useEffect(() => {
		// Confirmed payment → stamp the paywall as seen so it doesn't reappear,
		// then poll the profile a few times to catch the webhook-set tier (it lands
		// asynchronously) so "Continue" routes to the right place.
		void apiRequest('POST', '/api/profiles/plan', {}).finally(() => void mutate());
		let n = 0;
		const t = setInterval(() => { void mutate(); if (++n >= 4) clearInterval(t); }, 2000);
		return () => clearInterval(t);
	}, [mutate]);

	const plan = getUserType(profile);
	return (
		<div className="atlas" style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 24, background: 'var(--a-page)', color: 'var(--a-ink)' }}>
			<Card glow="blue" style={{ width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 16, padding: '36px 28px 32px' }}>
				<Brand variant="horizontal" height={32} />
				<span style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--a-ok-bg)', color: 'var(--a-ok)', border: '1px solid color-mix(in srgb, var(--a-ok) 25%, transparent)', display: 'grid', placeItems: 'center', marginTop: 12 }}><Check size={22} /></span>
				<h1 style={{ fontFamily: 'var(--a-font)', fontSize: 30, fontWeight: 700, lineHeight: 1.1, color: 'var(--a-ink)', margin: 0 }}>Payment successful</h1>
				<p style={{ fontSize: 13, color: 'var(--a-muted)', maxWidth: 400, lineHeight: 1.55, margin: 0 }}>Thanks! Your plan is being activated — if it doesn&apos;t reflect right away it&apos;ll update shortly.</p>
				<div style={{ marginTop: 6 }}><Button onClick={() => router.push(hrefOf('home'))}>Continue</Button></div>
			</Card>
		</div>
	);
}
