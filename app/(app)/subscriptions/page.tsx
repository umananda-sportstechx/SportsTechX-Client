'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { qk } from '@/lib/query-keys';
import { apiRequest } from '@/lib/query-client';
import { useUserProfile } from '@/hooks/use-user-profile';
import { Page, SectionHead } from '@/components/ui/atoms';

interface SubscriptionResponse {
	plan?: string | null;
	status?: string | null;
	current_period_end?: string | null;
	cancel_at_period_end?: boolean | null;
}

interface Tier {
	name: string;
	tierKey: string;
	priceLabel: string;
	periodLabel: string;
	desc: string;
	features: string[];
	cta: string;
	popular?: boolean;
	accent: string;
}

const TIERS: Tier[] = [
	{
		name: 'Explorer',
		tierKey: 'free',
		priceLabel: 'Free',
		periodLabel: 'forever',
		desc: 'Browse the public ecosystem and read curated highlights.',
		features: [
			'Public companies database',
			'Limited reports preview',
			'Newsletter access',
			'Public events calendar',
		],
		cta: 'Current plan',
		accent: 'oklch(62% 0.10 240)',
	},
	{
		name: 'Pro',
		tierKey: 'pro',
		priceLabel: '$49',
		periodLabel: 'mo',
		desc: 'For analysts, scouts, and operators tracking the market.',
		features: [
			'Full database (8,160+ cos)',
			'Funding & M&A trackers',
			'20+ research reports',
			'Investor & program data',
			'Weekly insider issues',
			'CSV export · 5k rows/mo',
		],
		cta: 'Upgrade',
		popular: true,
		accent: 'var(--accent)',
	},
	{
		name: 'Enterprise',
		tierKey: 'enterprise',
		priceLabel: '—',
		periodLabel: 'custom',
		desc: 'For funds, leagues, and corporates with dedicated needs.',
		features: [
			'Everything in Pro',
			'Unlimited exports & API',
			'Custom data feeds',
			'Custom reports + AI',
			'Dedicated analyst',
			'Team seats (up to 50)',
		],
		cta: 'Talk to sales',
		accent: 'oklch(62% 0.18 290)',
	},
];

/**
 * Subscriptions — pixel-perfect port of ui_design/screens-3.jsx
 * SubscriptionsScreen.
 *
 * Wired to the existing /api/billing/subscription endpoint (current plan) and
 * POST /api/billing/checkout (Stripe Checkout). Tier the user is currently on
 * gets the "Current plan" CTA; Enterprise opens a mailto.
 */
export default function SubscriptionsPage() {
	const { data: profile } = useUserProfile();
	const { data: subscription } = useQuery<SubscriptionResponse>({
		queryKey: qk.billing.subscription(),
		staleTime: 60_000,
	});

	const currentTier = (subscription?.plan ?? profile?.user_type ?? 'free').toLowerCase();
	const [busyTier, setBusyTier] = useState<string | null>(null);

	const checkout = useMutation({
		mutationFn: async (plan: string) => {
			const res = await apiRequest('POST', '/api/billing/checkout', { plan });
			return (await res.json()) as { url?: string };
		},
		onSuccess: ({ url }) => {
			if (url) window.location.href = url;
		},
		onError: (e: Error) => toast.error(e.message ?? 'Could not start checkout'),
		onSettled: () => setBusyTier(null),
	});

	const handleCta = (tier: Tier) => {
		if (tier.tierKey === 'enterprise') {
			window.location.href = 'mailto:sales@sportstechx.com?subject=Enterprise%20plan%20inquiry';
			return;
		}
		if (tier.tierKey === currentTier) return;
		setBusyTier(tier.tierKey);
		checkout.mutate(tier.tierKey);
	};

	const trustedBy = useMemo(() => ['adidas', 'NBA', 'PUMA', 'Sky', 'Sportradar', 'WHOOP'], []);

	return (
		<Page>
			<div style={{ marginBottom: 'var(--space-5)' }}>
				<div
					style={{
						fontFamily: 'var(--font-mono)',
						fontSize: 11,
						color: 'var(--fg-muted)',
						textTransform: 'uppercase',
						letterSpacing: '0.1em',
						marginBottom: 6,
					}}
				>
					Plans
				</div>
				<h1
					style={{
						fontFamily: 'var(--font-display)',
						fontSize: 38,
						fontWeight: 800,
						letterSpacing: '-0.02em',
						lineHeight: 1,
						margin: '0 0 6px',
					}}
				>
					Subscriptions
				</h1>
				<p style={{ fontSize: 14, color: 'var(--fg-2)', maxWidth: 640, margin: 0 }}>
					Pick the plan that matches the depth of intelligence you need.
				</p>
			</div>

			<div className="grid-3" style={{ marginBottom: 'var(--space-5)' }}>
				{TIERS.map((t) => {
					const isCurrent = currentTier === t.tierKey;
					const isBusy = busyTier === t.tierKey;
					const ctaLabel = isCurrent ? 'Current plan' : t.cta;
					return (
						<div
							key={t.tierKey}
							className={`card sub-card ${t.popular ? 'popular' : ''}`}
							style={{ padding: 'var(--space-5)', position: 'relative' }}
						>
							{t.popular && <div className="sub-badge">Most popular</div>}
							<div
								style={{
									fontFamily: 'var(--font-mono)',
									fontSize: 11,
									color: t.accent,
									fontWeight: 700,
									letterSpacing: '0.12em',
									marginBottom: 8,
									textTransform: 'uppercase',
								}}
							>
								{t.name}
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
									{t.priceLabel}
								</span>
								<span style={{ color: 'var(--fg-muted)', fontSize: 13 }}>/{t.periodLabel}</span>
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
								{t.desc}
							</p>
							<button
								className={`btn ${t.popular && !isCurrent ? '' : 'ghost'}`}
								style={{ width: '100%', justifyContent: 'center' }}
								disabled={isCurrent || isBusy}
								onClick={() => handleCta(t)}
							>
								{isBusy ? <><Loader2 size={12} className="animate-spin" /> Loading…</> : ctaLabel}
							</button>
							<div style={{ height: 1, background: 'var(--border)', margin: '20px 0' }} />
							<div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
								{t.features.map((f) => (
									<div key={f} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13 }}>
										<span style={{ color: t.accent, marginTop: 1, flexShrink: 0 }}>
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
