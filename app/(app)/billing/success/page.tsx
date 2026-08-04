'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Check } from 'lucide-react';
import { apiRequest } from '@/lib/query-client';
import { useUserProfile, getUserType } from '@/hooks/use-user-profile';
import { Brand } from '@/components/ui/brand';
import { Button } from '@/components/atlas/kit';

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
		<div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 14, padding: 24 }}>
			<Brand variant="horizontal" height={32} />
			<span style={{ width: 44, height: 44, borderRadius: '50%', background: '#3B6D11', display: 'grid', placeItems: 'center', marginTop: 16 }}><Check size={22} color="#fff" /></span>
			<h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--a-ink)', margin: 0, letterSpacing: '-0.02em' }}>Payment successful</h1>
			<p style={{ fontSize: 14, color: 'var(--a-muted)', maxWidth: 440, lineHeight: 1.5, margin: 0 }}>Thanks! Your plan is being activated — if it doesn&apos;t reflect right away it&apos;ll update shortly.</p>
			<Button onClick={() => router.push(plan === 'raise' ? '/raise' : '/coming-soon')}>Continue</Button>
		</div>
	);
}
