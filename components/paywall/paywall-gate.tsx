'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Check, Loader2 } from 'lucide-react';
// The plan chooser shows the account's real plan, never a Walk the Pitch practice tier.
import { getRealUserType as getUserType, useUserProfile, type UserType } from '@/hooks/use-user-profile';
import { WalkthroughButton } from '@/components/features/walkthrough/walkthrough-button';
import { apiRequest } from '@/lib/query-client';
import { qk } from '@/lib/query-keys';
import { Button, Loading } from '@/components/atlas';
import { PRODUCT } from '@/components/features/tier-gate/tier-gate';
import './paywall-gate.css';

/**
 * Post-login plan chooser, shown once (until `paywall_shown_at` is stamped).
 *
 * Choosing Explore sets the tier directly (no payment); a paid plan hands off to
 * Stripe Checkout WITHOUT stamping, so a cancel never burns the one-time wall —
 * `/billing/success` stamps it once payment confirms.
 *
 * Plans (name, price, interval, features) come live from `GET /api/billing/plans`
 * — the same source the in-app Plans page uses — so the price is always correct
 * (e.g. Raise's 6-month interval) rather than a hard-coded string. Styled on the
 * Atlas tokens so it matches the dashboard in light and dark.
 */
interface PlanRow {
	slug: string;
	name: string;
	tagline: string | null;
	tier: string;
	billing_interval: string | null;
	price_amount: number;
	currency_code: string;
	stripe_price_id: string | null;
	feature_highlights: string[];
	sort_order: number;
}

const money = (cents: number, ccy: string) =>
	new Intl.NumberFormat(undefined, { style: 'currency', currency: (ccy || 'eur').toUpperCase(), maximumFractionDigits: 0 }).format((cents ?? 0) / 100);
const intervalLabel = (bi: string | null) =>
	bi === 'yearly' ? 'per year' : bi === 'semiannual' ? 'per 6 months' : bi === 'monthly' ? 'per month' : '';

export function PaywallGate() {
	const { data: profile, mutate } = useUserProfile();
	const plans = useSWR<{ data: PlanRow[] }>(qk.billing.plans());
	const [busy, setBusy] = useState<string | 'dismiss' | null>(null);
	const [err, setErr] = useState('');

	// Show once: until the wall has been stamped. (Undefined while loading → hidden.)
	if (!profile || profile.paywall_shown_at) return null;

	const choose = async (tier: UserType | null, slug?: string) => {
		setBusy(slug ?? tier ?? 'dismiss');
		setErr('');
		try {
			// Free / dismiss: set the tier directly and close the wall (no payment).
			if (!tier || tier === 'explore') {
				await apiRequest('POST', '/api/profiles/plan', tier ? { plan: tier } : {});
				await mutate();
				return;
			}
			const res = await apiRequest('POST', '/api/billing/checkout', { plan: slug ?? tier });
			if (!res.ok) throw new Error('checkout failed');
			const body = (await res.json()) as { url?: string | null };
			if (body.url) { window.location.assign(body.url); return; }
			throw new Error('no checkout url');
		} catch {
			setErr('We couldn’t start checkout. Please try again, or pick the free plan to carry on.');
		} finally { setBusy(null); }
	};

	const current = getUserType(profile);
	const rows = [...(plans.data?.data ?? [])].sort((a, b) => a.sort_order - b.sort_order);

	return (
		<div className="atlas pg">
			<div className="pg__inner">
				<header className="pg__head">
					<div className="atlas-eyebrow">SportsTechX</div>
					<h1 className="pg__title">Choose your plan</h1>
					<p className="pg__sub">Pick the plan that fits how you use SportsTechX. You can change it later.</p>
				</header>

				{plans.isLoading ? <Loading /> : (
					<div className="pg__grid">
						{rows.map((p) => {
							const isCurrent = current === p.tier;
							const paid = p.tier !== 'explore';
							const highlight = p.tier === 'raise';
							// feature_highlights + tagline are NULL for Raise/Scout in the DB;
							// fall back to the approved PRODUCT blurbs so the card isn't blank
							// (and `.map` never runs on null — that crashed /onboarding).
							const prod = p.tier === 'raise' || p.tier === 'scout' ? PRODUCT[p.tier] : null;
							const tagline = p.tagline || prod?.tagline || '';
							const features = p.feature_highlights?.length
								? p.feature_highlights
								: (prod?.points.map(([label]) => label) ?? []);
							return (
								<div key={p.slug} className={`pg-card${highlight ? ' pg-card--hl' : ''}`}>
									{highlight && <div className="pg-card__badge">Recommended</div>}
									<div className="pg-card__name">{p.name}</div>
									{tagline && <div className="pg-card__tagline">{tagline}</div>}
									<div className="pg-card__price">
										<span className="pg-card__amount">{p.price_amount === 0 ? 'Free' : money(p.price_amount, p.currency_code)}</span>
										{paid && <span className="pg-card__interval">{intervalLabel(p.billing_interval)}</span>}
									</div>
									<ul className="pg-card__features">
										{features.map((f) => (
											<li key={f}><Check size={15} aria-hidden="true" />{f}</li>
										))}
									</ul>
									<Button
										className="pg-card__cta"
										variant={highlight ? 'primary' : 'outline'}
										disabled={busy !== null || isCurrent}
										onClick={() => void choose(p.tier as UserType, p.slug)}
									>
										{busy === (p.slug ?? p.tier) ? <Loader2 className="animate-spin" size={15} />
											: isCurrent ? 'Current plan'
												: p.tier === 'explore' ? 'Continue on Explore'
													: `Choose ${p.name}`}
									</Button>
									{/* Walk through the paid workspace first: settles the account on Explore, then starts the tour. */}
									{(p.tier === 'raise' || p.tier === 'scout') && (
										<WalkthroughButton product={p.tier} source="plan-chooser" beforeStart={() => choose('explore')} style={{ marginTop: 10 }} />
									)}
								</div>
							);
						})}
					</div>
				)}

				{err && <p role="alert" className="pg__err">{err}</p>}

				<div className="pg__later">
					<button type="button" onClick={() => void choose(null)} disabled={busy !== null}>
						{busy === 'dismiss' ? 'Saving…' : 'Maybe later — keep my current plan'}
					</button>
				</div>
			</div>
		</div>
	);
}
