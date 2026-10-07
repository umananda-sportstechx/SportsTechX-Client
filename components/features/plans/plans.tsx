'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { Check, Loader2, Minus } from 'lucide-react';
import { Badge, Button, Card, Loading, PageHead } from '@/components/atlas';
import { apiRequest } from '@/lib/query-client';
import { qk } from '@/lib/query-keys';
import { track, Events } from '@/lib/analytics';
import { getUserType, useUserProfile } from '@/hooks/use-user-profile';
import { useFeatureAccessContext } from '@/contexts/feature-access-context';
import { PRODUCT } from '@/components/features/tier-gate/tier-gate';
import type { Tier } from '@/lib/access';
import './plans.css';

/**
 * Every tier, side by side, with the viewer's own plan marked.
 *
 * Replaces the sidebar upgrade cards' old destination, which was the public
 * marketing page's `#how-to-join` anchor — it sent a signed-in user back out to
 * the landing site and never showed them what they already had.
 *
 * Nothing here is hardcoded that the system already knows:
 *
 *   - **prices** come from `GET /api/billing/plans`, which reads
 *     `subscription_plans` (public, 5-minute cached). The old plan labels were
 *     a literal in `app/billing/page.tsx`, so a price change in the admin left
 *     the UI lying.
 *   - **the comparison** comes from `GET /api/features` via
 *     `FeatureAccessProvider`, which the app already loads for gating — so the
 *     table is the real entitlement matrix, not a sales list that can drift
 *     from it, and it costs no extra request.
 *   - **the blurbs** are `PRODUCT` from the tier gate, the one set of approved
 *     per-product copy.
 *
 * Both paid tiers self-serve through Stripe Checkout, decided with the user.
 * Note that contradicts the Explore mockup, which labels Scout "Request" and
 * says access follows a conversation — if that ever becomes the rule again,
 * this is the one place that has to change.
 */
interface PlanRow {
	slug: string;
	name: string;
	tier: string;
	billing_interval: string | null;
	price_amount: number;
	currency_code: string;
	stripe_price_id: string | null;
}

/** Display order, cheapest first. Explore is never a checkout target. */
const ORDER: Tier[] = ['explore', 'raise', 'scout'];

const money = (cents: number, ccy: string) =>
	new Intl.NumberFormat(undefined, { style: 'currency', currency: (ccy || 'eur').toUpperCase(), maximumFractionDigits: 0 })
		.format((cents ?? 0) / 100);

export function Plans() {
	const { data: profile } = useUserProfile();
	const current = getUserType(profile);
	const { features, isLoading: featuresLoading } = useFeatureAccessContext();
	const plans = useSWR<{ data: PlanRow[] }>(qk.billing.plans());
	const [busy, setBusy] = useState<string | null>(null);

	const byTier = new Map((plans.data?.data ?? []).map((p) => [p.tier, p]));

	const checkout = async (tier: Tier) => {
		const plan = byTier.get(tier);
		// The slug, not the tier: `subscription_plans.slug` is what the server
		// resolves to a Stripe price, and Explore's slug is still 'free'.
		if (!plan?.stripe_price_id) { toast.error('That plan is not available to buy right now.'); return; }
		setBusy(tier);
		track(Events.billingCheckoutStarted, { plan: plan.slug });
		try {
			const res = await apiRequest('POST', '/api/billing/checkout', { plan: plan.slug });
			const body = (await res.json()) as { url?: string };
			if (body.url) { window.location.assign(body.url); return; }
			throw new Error('no url');
		} catch {
			toast.error("Couldn't start checkout. Please try again.");
			setBusy(null);
		}
	};

	if (plans.isLoading) return <Loading />;

	return (
		<>
			<PageHead
				title="Plans"
				sub="Atlas Explore is free and stays free. Raise and Scout are separate products on top of it — pick the one that matches what you do."
			/>

			<div className="plans-grid">
				{ORDER.map((tier) => {
					const plan = byTier.get(tier);
					const copy = tier === 'explore' ? null : PRODUCT[tier];
					const isCurrent = tier === current;
					return (
						<Card key={tier} glow={isCurrent ? 'blue' : undefined} focus={isCurrent} className="plans-card">
							<div className="plans-card__head">
								<span className="atlas-eyebrow">{copy?.name ?? 'Atlas Explore'}</span>
								{isCurrent && <Badge tone="ok">Current plan</Badge>}
							</div>
							<div className="plans-card__price">
								{plan ? money(plan.price_amount, plan.currency_code) : '—'}
							</div>
							<div className="plans-card__interval">
								{plan && plan.price_amount === 0 ? 'Free forever' : plan?.billing_interval === 'yearly' ? 'per year' : (plan?.billing_interval ?? '')}
							</div>
							<p className="plans-card__blurb">
								{copy?.tagline ?? 'Understand and explore the sports-tech market.'}
							</p>
							{/* The entitlement matrix below is identical for Raise and Scout —
								    measured: 0 of 19 features differ. What separates them is the
								    workspace, so the product's own points carry that here. Without
								    them the two paid columns give no reason to pick either. */}
							{copy && (
								<ul className="plans-card__points">
									{copy.points.map(([t]) => <li key={t}>{t}</li>)}
								</ul>
							)}
							<div className="plans-card__cta">
								{isCurrent
									? <Button variant="outline" size="sm" disabled>Your plan</Button>
									: tier === 'explore'
										// Downgrading is a billing-portal action, not a checkout.
										? <span className="plans-muted">Included with every plan</span>
										: (
											<Button size="sm" variant={tier === 'raise' ? 'primary' : 'outline'} disabled={busy !== null} onClick={() => void checkout(tier)}>
												{busy === tier ? <Loader2 className="animate-spin" size={13} /> : `Get ${copy?.name ?? tier}`}
											</Button>
										)}
							</div>
						</Card>
					);
				})}
			</div>

			<Card className="plans-table-card">
				<div className="plans-table-head">
					<div className="atlas-section-title">What each plan includes</div>
					<span className="atlas-section-aside">Data access, straight from your account&apos;s entitlements. Raise and Scout differ by workspace, not by data.</span>
				</div>
				{featuresLoading ? <Loading /> : features.length === 0 ? (
					<p className="plans-muted">Couldn&apos;t load the feature list.</p>
				) : (
					<div className="plans-table-scroll">
						<table className="plans-table">
							<thead>
								<tr>
									<th scope="col">Feature</th>
									{ORDER.map((t) => (
										<th key={t} scope="col" className={t === current ? 'is-current' : undefined}>
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
											<td key={t} className={t === current ? 'is-current' : undefined}>
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
