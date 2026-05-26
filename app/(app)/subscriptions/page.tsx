'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { qk } from '@/lib/query-keys';
import { apiRequest } from '@/lib/query-client';
import { useUserProfile } from '@/hooks/use-user-profile';
import { Page, SectionHead, PageTitle } from '@/components/ui/atoms';

interface SubscriptionResponse {
	plan?: string | null;
	status?: string | null;
	current_period_end?: string | null;
	cancel_at_period_end?: boolean | null;
}

interface PlanRow {
	slug: string;
	name: string;
	tagline: string | null;
	tier: 'free' | 'growth' | 'pro';
	billing_interval: 'monthly' | 'yearly' | null;
	price_amount: number;     // cents
	currency_code: string;
	stripe_price_id: string | null;
	trial_days: number;
	feature_highlights: string[];
	sort_order: number;
}

interface PlansResponse {
	data: PlanRow[];
}

function formatPrice(amount: number, currency: string): string {
	if (amount === 0) return 'Free';
	const major = amount / 100;
	const symbol = currency.toUpperCase() === 'EUR' ? '€' : currency.toUpperCase() === 'USD' ? '$' : `${currency} `;
	return `${symbol}${major.toFixed(major % 1 === 0 ? 0 : 2)}`;
}

const ACCENT_BY_TIER: Record<string, string> = {
	free: 'oklch(62% 0.10 240)',
	growth: 'var(--accent)',
	pro: 'oklch(62% 0.18 290)',
};

/**
 * Subscriptions page. Reads the plan catalog from `GET /api/billing/plans`
 * so we never hardcode prices/slugs — the source of truth is `subscription_plans`
 * (which the from-stripe seed keeps in sync with the live Stripe products).
 *
 * The "free" plan has `stripe_price_id = null` and renders as a non-interactive
 * "Current plan" card — clicking does nothing. The "popular" highlight is the
 * highest-sort_order row that isn't free or pro.
 */
export default function SubscriptionsPage() {
	const { data: profile } = useUserProfile();
	const { data: plansResp, isLoading: plansLoading } = useSWR<PlansResponse>(
		qk.billing.plans(),
		{ dedupingInterval: 30 * 60_000 },
	);
	const { data: subscription } = useSWR<SubscriptionResponse>(
		qk.billing.subscription(),
		{ dedupingInterval: 60_000 },
	);

	const currentTier = (subscription?.plan ?? profile?.user_type ?? 'free').toLowerCase();
	const [busySlug, setBusySlug] = useState<string | null>(null);

	const handleCta = async (plan: PlanRow) => {
		// Free plan: no checkout. Either it's their current plan (no-op) or
		// they're downgrading — Stripe billing portal handles that path.
		if (plan.tier === 'free') return;
		if (plan.tier === currentTier) return;
		setBusySlug(plan.slug);
		try {
			// Anchor the post-checkout redirect to wherever the user actually is —
			// works at localhost, prod, preview deploys, anywhere — instead of
			// relying on the backend's APP_BASE_URL env var.
			const origin = window.location.origin;
			const res = await apiRequest('POST', '/api/billing/checkout', {
				plan: plan.slug,
				success_url: `${origin}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
				cancel_url: `${origin}/billing/cancel`,
			});
			const { url } = (await res.json()) as { url?: string };
			if (url) window.location.href = url;
		} catch (e) {
			toast.error((e as Error).message ?? 'Could not start checkout');
		} finally {
			setBusySlug(null);
		}
	};

	const trustedBy = useMemo(() => ['adidas', 'NBA', 'PUMA', 'Sky', 'Sportradar', 'WHOOP'], []);

	const plans = plansResp?.data ?? [];

	return (
		<Page>
			<PageTitle
				kicker="Plans"
				title="Subscriptions"
				sub="Pick the plan that matches the depth of intelligence you need."
			/>

			{plansLoading && plans.length === 0 ? (
				<div style={{ padding: 'var(--space-5)', textAlign: 'center', color: 'var(--fg-muted)' }}>
					Loading plans…
				</div>
			) : (
				<div className="grid-3" style={{ marginBottom: 'var(--space-5)' }}>
					{plans.map((p) => {
						const accent = ACCENT_BY_TIER[p.tier] ?? 'var(--accent)';
						const isCurrent = currentTier === p.tier;
						const isBusy = busySlug === p.slug;
						const isFree = p.tier === 'free';
						const popular = p.tier === 'growth';
						const ctaLabel = isCurrent
							? 'Current plan'
							: isFree
							? 'Free tier'
							: 'Upgrade';
						const intervalLabel = p.billing_interval === 'yearly' ? 'yr' : p.billing_interval === 'monthly' ? 'mo' : 'forever';
						return (
							<div
								key={p.slug}
								className={`card sub-card ${popular ? 'popular' : ''}`}
								style={{ padding: 'var(--space-5)', position: 'relative' }}
							>
								{popular && <div className="sub-badge">Most popular</div>}
								<div
									style={{
										fontFamily: 'var(--font-mono)',
										fontSize: 11,
										color: accent,
										fontWeight: 700,
										letterSpacing: '0.12em',
										marginBottom: 8,
										textTransform: 'uppercase',
									}}
								>
									{p.name}
								</div>
								<div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 12 }}>
									<span
										style={{
											fontFamily: 'var(--font-display)',
											fontSize: 44,
											fontWeight: 800,
											letterSpacing: '-0.02em',
											lineHeight: 1,
										}}
									>
										{formatPrice(p.price_amount, p.currency_code)}
									</span>
									<span style={{ color: 'var(--fg-muted)', fontSize: 13 }}>/{intervalLabel}</span>
								</div>
								<p
									style={{
										fontSize: 13,
										color: 'var(--fg-2)',
										lineHeight: 1.5,
										marginBottom: 18,
										minHeight: 60,
									}}
								>
									{p.tagline ?? ''}
								</p>
								<button
									className={`btn ${popular && !isCurrent ? '' : 'ghost'}`}
									style={{ width: '100%', justifyContent: 'center' }}
									disabled={isCurrent || isBusy || isFree}
									onClick={() => void handleCta(p)}
								>
									{isBusy ? <><Loader2 size={12} className="animate-spin" /> Loading…</> : ctaLabel}
								</button>
								<div style={{ height: 1, background: 'var(--border)', margin: '20px 0' }} />
								<div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
									{p.feature_highlights.map((f) => (
										<div key={f} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13 }}>
											<span style={{ color: accent, marginTop: 1, flexShrink: 0 }}>
												<Check size={14} />
											</span>
											<span>{f}</span>
										</div>
									))}
								</div>
							</div>
						);
					})}
				</div>
			)}

			<div className="card" style={{ padding: 'var(--space-5)' }}>
				<SectionHead title="Trusted by" />
				<div
					style={{
						display: 'grid',
						gridTemplateColumns: 'repeat(6, 1fr)',
						gap: 24,
						alignItems: 'center',
						padding: 'var(--space-4) 0',
					}}
				>
					{trustedBy.map((n) => (
						<div
							key={n}
							style={{
								fontFamily: 'var(--font-display)',
								fontSize: 18,
								fontWeight: 700,
								color: 'var(--fg-muted)',
								letterSpacing: '-0.01em',
								textAlign: 'center',
							}}
						>
							{n}
						</div>
					))}
				</div>
			</div>
		</Page>
	);
}
