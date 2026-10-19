'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { toast } from 'sonner';
import { Check, Loader2, Minus } from 'lucide-react';
import { Badge, Button, Card, Loading, PageHead } from '@/components/atlas';
import { apiRequest } from '@/lib/query-client';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { qk } from '@/lib/query-keys';
import { track, Events } from '@/lib/analytics';
import { getUserType, useUserProfile } from '@/hooks/use-user-profile';
import { useAuthSession } from '@/hooks/use-auth-session';
import { useFeatureAccessContext } from '@/contexts/feature-access-context';
import { PRODUCT } from '@/components/features/tier-gate/tier-gate';
import type { Tier } from '@/lib/access';
import './plans.css';

/**
 * Every tier, side by side — the single plan surface, in three contexts:
 *
 *   - **app** (default): a signed-in user on /plans. Marks their current plan,
 *     checks out a paid one, or cancels at period end.
 *   - **onboarding** (`onboarding` prop): the first step of signup. Explore is
 *     chosen directly (no payment, stamps the paywall); a paid plan hands off to
 *     Stripe; "maybe later" keeps the current plan. Same API calls the old
 *     PaywallGate made, so signup behaviour is unchanged — only the UI unifies.
 *   - **public** (logged-out on /plans): a pricing page. Every CTA goes to
 *     signup; nothing is marked "current".
 *
 * Nothing here is hardcoded that the system already knows: prices come from
 * `GET /api/billing/plans` (public, cached), the comparison from `GET /api/features`
 * (the real entitlement matrix), the blurbs from `PRODUCT` (approved per-product copy).
 */
interface PlanRow {
	slug: string;
	name: string;
	tier: string;
	billing_interval: string | null;
	price_amount: number;
	currency_code: string;
	stripe_price_id: string | null;
	stx_credits_monthly: number;
}

/** Free (Explore) one-time welcome grant — mirrors SIGNUP_GRANT server-side. */
const WELCOME_CREDITS = 300;

/** Display order, cheapest first. Explore is never a checkout target. */
const ORDER: Tier[] = ['explore', 'raise', 'scout'];

const money = (cents: number, ccy: string) =>
	new Intl.NumberFormat(undefined, { style: 'currency', currency: (ccy || 'eur').toUpperCase(), maximumFractionDigits: 0 })
		.format((cents ?? 0) / 100);

export function Plans({ onboarding }: { onboarding?: { onDone: () => void } } = {}) {
	const router = useRouter();
	const { data: profile, mutate: refreshProfile } = useUserProfile();
	const { sessionValid, loading: authLoading } = useAuthSession();
	const loggedOut = !authLoading && !sessionValid;
	const current = getUserType(profile);
	const { features, isLoading: featuresLoading } = useFeatureAccessContext();
	const plans = useSWR<{ data: PlanRow[] }>(qk.billing.plans());
	const [busy, setBusy] = useState<string | null>(null);
	const [err, setErr] = useState('');
	const confirm = useConfirm();
	// `subscription_cancel_at` is already on this payload; no new endpoint needed
	// to know whether they have something to cancel.
	const sub = useSWR<{ stripe_subscription_id?: string } | null>(loggedOut ? null : qk.billing.subscription());
	const hasPaidPlan = !loggedOut && current !== 'explore' && !!sub.data?.stripe_subscription_id;
	// Only the signed-in in-app view marks one card as "yours".
	const showCurrent = !onboarding && !loggedOut;

	const byTier = new Map((plans.data?.data ?? []).map((p) => [p.tier, p]));
	const goSignup = () => router.push('/signup');

	const checkout = async (tier: Tier) => {
		const plan = byTier.get(tier);
		// The slug, not the tier: `subscription_plans.slug` is what the server
		// resolves to a Stripe price, and Explore's slug is still 'free'.
		if (!plan?.stripe_price_id) { toast.error('That plan is not available to buy right now.'); return; }
		setBusy(tier);
		setErr('');
		track(Events.billingCheckoutStarted, { plan: plan.slug });
		try {
			const res = await apiRequest('POST', '/api/billing/checkout', { plan: plan.slug });
			const body = (await res.json()) as { url?: string };
			if (body.url) { window.location.assign(body.url); return; }
			throw new Error('no url');
		} catch {
			setErr('We couldn’t start checkout. Please try again, or continue on Explore.');
			setBusy(null);
		}
	};

	// Onboarding only: pick Explore (or "maybe later") with no payment — sets the
	// tier and stamps the one-time paywall, exactly as the old PaywallGate did.
	const chooseExplore = async (dismiss: boolean) => {
		setBusy(dismiss ? 'dismiss' : 'explore');
		setErr('');
		try {
			await apiRequest('POST', '/api/profiles/plan', dismiss ? {} : { plan: 'explore' });
			await refreshProfile();
			onboarding?.onDone();
		} catch {
			setErr('Something went wrong. Please try again.');
			setBusy(null);
		}
	};

	/**
	 * Cancel at the end of the billing period. The plan stays active — full
	 * access — until then; it simply won't renew, and the user moves to Explore
	 * when it ends. No refund, and no immediate cancellation (that's a sales
	 * conversation). Until it ends they keep the tier and can't start another.
	 */
	const fmtDay = (iso: string | null) =>
		iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) : null;
	const downgrade = async () => {
		setBusy('explore');
		try {
			const res = await apiRequest('POST', '/api/billing/cancel?preview=1');
			const { access_until } = (await res.json()) as { access_until: string | null };
			const until = fmtDay(access_until);
			const ok = await confirm({
				title: 'Cancel your plan?',
				description: until
					? `Your plan stays active with full access until ${until}. It won't renew — you'll move to Atlas Explore then. No refund is issued, and you can't start a different plan until it ends. To cancel sooner, contact the SportsTechX team.`
					: `Your plan won't renew and you'll move to Atlas Explore at the end of the current billing period. No refund is issued. To cancel sooner, contact the SportsTechX team.`,
				confirmLabel: 'Cancel at period end',
				destructive: true,
			});
			if (!ok) { setBusy(null); return; }
			const done = await apiRequest('POST', '/api/billing/cancel');
			if (!done.ok) throw new Error(String(done.status));
			const body = (await done.json()) as { access_until: string | null };
			const end = fmtDay(body.access_until);
			toast.success(end
				? `Plan set to cancel on ${end}. You keep full access until then.`
				: 'Plan set to cancel at the end of your billing period. You keep full access until then.');
			await Promise.all([refreshProfile(), sub.mutate(), plans.mutate()]);
		} catch {
			toast.error("Couldn't cancel your plan. Please try again or contact support.");
		} finally { setBusy(null); }
	};

	if (plans.isLoading) return <Loading />;

	const ctaFor = (tier: Tier, isCurrent: boolean) => {
		const copy = tier === 'explore' ? null : PRODUCT[tier];
		const name = copy?.name ?? (tier === 'explore' ? 'Explore' : tier);
		const spin = <Loader2 className="animate-spin" size={13} />;
		if (isCurrent) return <Button variant="outline" size="sm" disabled>Your plan</Button>;
		if (loggedOut) {
			return tier === 'explore'
				? <Button size="sm" variant="outline" onClick={goSignup}>Start free</Button>
				: <Button size="sm" variant={tier === 'raise' ? 'primary' : 'outline'} onClick={goSignup}>Get {name}</Button>;
		}
		if (onboarding) {
			return tier === 'explore'
				? <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => void chooseExplore(false)}>{busy === 'explore' ? spin : 'Continue on Explore'}</Button>
				: <Button size="sm" variant={tier === 'raise' ? 'primary' : 'outline'} disabled={busy !== null} onClick={() => void checkout(tier)}>{busy === tier ? spin : `Choose ${name}`}</Button>;
		}
		if (tier === 'explore') {
			return hasPaidPlan
				? <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => void downgrade()}>{busy === 'explore' ? spin : 'Switch to Explore'}</Button>
				: <span className="plans-muted">Included with every plan</span>;
		}
		return <Button size="sm" variant={tier === 'raise' ? 'primary' : 'outline'} disabled={busy !== null} onClick={() => void checkout(tier)}>{busy === tier ? spin : `Get ${name}`}</Button>;
	};

	return (
		<>
			<PageHead
				title={onboarding ? 'Choose your plan' : 'Plans'}
				sub={onboarding
					? 'Pick the plan that fits how you use SportsTechX — you can change it later.'
					: 'Atlas Explore is free and stays free. Raise and Scout are separate products on top of it — pick the one that matches what you do.'}
			/>

			<div className="plans-grid">
				{ORDER.map((tier) => {
					const plan = byTier.get(tier);
					const copy = tier === 'explore' ? null : PRODUCT[tier];
					const isCurrent = showCurrent && tier === current;
					const recommended = tier === 'raise' && !isCurrent;
					return (
						<Card key={tier} glow={isCurrent ? 'blue' : undefined} focus={isCurrent} className={`plans-card${recommended ? ' plans-card--rec' : ''}`}>
							<div className="plans-card__head">
								<span className="atlas-eyebrow">{copy?.name ?? 'Atlas Explore'}</span>
								{isCurrent ? <Badge tone="ok">Current plan</Badge> : recommended ? <Badge tone="navy">Recommended</Badge> : null}
							</div>
							<div className="plans-card__price">
								{plan ? money(plan.price_amount, plan.currency_code) : '—'}
							</div>
							<div className="plans-card__interval">
								{plan && plan.price_amount === 0 ? 'Free forever' : plan?.billing_interval === 'yearly' ? 'per year' : plan?.billing_interval === 'semiannual' ? 'per 6 months' : plan?.billing_interval === 'monthly' ? 'per month' : (plan?.billing_interval ?? '')}
							</div>
							{plan && (
								<div className="plans-card__credits">
									{plan.stx_credits_monthly > 0 ? (
										<><strong>{plan.stx_credits_monthly.toLocaleString()}</strong> credits / month
											<span className="plans-card__credits-note">reloaded to your account each month</span></>
									) : (
										<><strong>{WELCOME_CREDITS}</strong> welcome credits
											<span className="plans-card__credits-note">one-time on sign-up · top up anytime</span></>
									)}
								</div>
							)}
							<p className="plans-card__blurb">
								{copy?.tagline ?? 'Understand and explore the sports-tech market.'}
							</p>
							{copy && (
								<ul className="plans-card__points">
									{copy.points.map(([t]) => <li key={t}>{t}</li>)}
								</ul>
							)}
							<div className="plans-card__cta">{ctaFor(tier, isCurrent)}</div>
						</Card>
					);
				})}
			</div>

			<p className="plans-credits-hint">
				Credits power AI chat, pitch-deck analysis and data exports. Monthly credits don&rsquo;t roll over — <Link href="/credits">top up anytime</Link> if you need more.
			</p>

			{err && <p role="alert" className="plans-err">{err}</p>}

			{onboarding && (
				<div className="plans-later">
					<button type="button" onClick={() => void chooseExplore(true)} disabled={busy !== null}>
						{busy === 'dismiss' ? 'Saving…' : 'Maybe later — keep my current plan'}
					</button>
				</div>
			)}

			<Card className="plans-table-card">
				<div className="plans-table-head">
					<div className="atlas-section-title">What each plan includes</div>
					<span className="atlas-section-aside">Data access, straight from the entitlement matrix. Raise and Scout differ by workspace, not by data.</span>
				</div>
				{featuresLoading ? <Loading /> : features.length === 0 ? (
					<p className="plans-muted">Sign in to compare what each plan includes.</p>
				) : (
					<div className="plans-table-scroll">
						<table className="plans-table">
							<thead>
								<tr>
									<th scope="col">Feature</th>
									{ORDER.map((t) => (
										<th key={t} scope="col" className={showCurrent && t === current ? 'is-current' : undefined}>
											{t === 'explore' ? 'Explore' : PRODUCT[t].name.replace('Atlas ', '')}
										</th>
									))}
								</tr>
							</thead>
							<tbody>
								{features.map((f) => (
									<tr key={f.id}>
										<th scope="row">{f.name}</th>
										{ORDER.map((t) => (
											<td key={t} className={showCurrent && t === current ? 'is-current' : undefined}>
												{f[t]
													? <Check size={15} aria-label="Included" className="plans-yes" />
													: <Minus size={15} aria-label="Not included" className="plans-no" />}
											</td>
										))}
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</Card>
		</>
	);
}
