'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Loader2 } from 'lucide-react';
import { apiRequest } from '@/lib/query-client';
import { useUserProfile, getUserType } from '@/hooks/use-user-profile';
import { Brand } from '@/components/ui/brand';
import { Button, Card } from '@/components/atlas';
import { hrefOf } from '@/lib/routes';
import { openRaiseSetup, openScoutThesis } from '@/lib/setup-events';

/**
 * Stripe Checkout success landing.
 *
 * The tier is set by the billing webhook, which lands asynchronously — so this
 * page's whole job is to wait for it and only then treat the purchase as done.
 *
 * It used to stamp `paywall_shown_at` the instant the page mounted, poll four
 * times over 8 seconds, and offer "Continue" regardless. If the webhook was
 * slower than that — or never arrived at all, which happens when the Stripe
 * price has no `subscription_plans` row — the user landed in the Explore
 * dashboard as a paying customer **and the plan chooser could never reappear**,
 * because stamping is one-way. That was the "I paid for Scout and got Explore"
 * bug.
 *
 * Now: stamp only once the profile actually reports a paid tier, and if it
 * never does, say so and leave the chooser unstamped so they can get back in.
 */
const POLL_MS = 2000;
const GIVE_UP_AFTER = 20; // ~40s

export default function BillingSuccessPage() {
	const router = useRouter();
	const { data: profile, mutate } = useUserProfile();
	const [gaveUp, setGaveUp] = useState(false);
	const stamped = useRef(false);

	const tier = getUserType(profile);
	const confirmed = tier === 'raise' || tier === 'scout';

	useEffect(() => {
		if (confirmed) return;
		let n = 0;
		const t = setInterval(() => {
			void mutate();
			if (++n >= GIVE_UP_AFTER) { clearInterval(t); setGaveUp(true); }
		}, POLL_MS);
		return () => clearInterval(t);
	}, [confirmed, mutate]);

	// Burn the one-time chooser only against a confirmed paid tier. `stamped`
	// guards the re-render, not the server — the endpoint is idempotent.
	useEffect(() => {
		if (!confirmed || stamped.current) return;
		stamped.current = true;
		void apiRequest('POST', '/api/profiles/plan', {}).finally(() => void mutate());
	}, [confirmed, mutate]);

	// Straight into the setup each product actually needs — both are skippable.
	// Both used to be their own routes (`/onboarding/scout`, `/setup`); they are
	// modals now, so this lands on the dashboard and raises the right one over
	// it. The Stripe return URL itself is `/billing/success` and is unaffected.
	const openSetup = () => {
		router.push(hrefOf('home'));
		if (tier === 'scout') openScoutThesis();
		else if (tier === 'raise') openRaiseSetup();
	};

	return (
		<div className="atlas" style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 24, background: 'var(--a-page)', color: 'var(--a-ink)' }}>
			<Card glow="blue" style={{ width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 16, padding: '36px 28px 32px' }}>
				<Brand variant="horizontal" height={32} />
				<span style={{ width: 48, height: 48, borderRadius: '50%', background: confirmed ? 'var(--a-ok-bg)' : 'var(--a-surface-2, transparent)', color: confirmed ? 'var(--a-ok)' : 'var(--a-muted)', border: '1px solid color-mix(in srgb, var(--a-ok) 25%, transparent)', display: 'grid', placeItems: 'center', marginTop: 12 }}>
					{confirmed ? <Check size={22} /> : <Loader2 className="animate-spin" size={20} />}
				</span>

				<h1 style={{ fontFamily: 'var(--a-font)', fontSize: 30, fontWeight: 700, lineHeight: 1.1, color: 'var(--a-ink)', margin: 0 }}>
					{confirmed ? 'You’re all set' : 'Payment received'}
				</h1>

				<p style={{ fontSize: 13, color: 'var(--a-muted)', maxWidth: 400, lineHeight: 1.55, margin: 0 }}>
					{confirmed
						? 'Your plan is active. Next we’ll help you set things up — you can skip it and come back whenever.'
						: gaveUp
							? 'Your payment went through, but we haven’t been able to activate the plan automatically. Nothing is lost — contact us and we’ll sort it out. You can keep using Atlas in the meantime.'
							: 'Thanks! We’re activating your plan — this usually takes a few seconds.'}
				</p>

				<div style={{ marginTop: 6, display: 'flex', gap: 8 }}>
					{confirmed ? (
						<Button onClick={openSetup}>Continue</Button>
					) : gaveUp ? (
						// Deliberately NOT stamped, so the plan chooser is still reachable.
						<Button variant="outline" onClick={() => router.push(hrefOf('home'))}>Go to Atlas</Button>
					) : (
						<Button disabled>Activating…</Button>
					)}
				</div>
			</Card>
		</div>
	);
}
