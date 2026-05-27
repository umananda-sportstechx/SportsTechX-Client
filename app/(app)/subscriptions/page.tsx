'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { AlertTriangle, ArrowRight, Check, Crown, ExternalLink, Loader2, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';
import { qk } from '@/lib/query-keys';
import { apiRequest } from '@/lib/query-client';
import { useUserProfile } from '@/hooks/use-user-profile';
import { Page, SectionHead, PageTitle, Tag } from '@/components/ui/atoms';

interface SubscriptionResponse {
	stripe_subscription_id?: string | null;
	subscription_status?: string | null;
	subscription_current_period_end?: string | null;
	subscription_cancel_at?: string | null;
	is_trial?: boolean | null;
	plan_name?: string | null;
	user_type?: string | null;
	user_type_detail?: string | null;
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

interface PlansResponse { data: PlanRow[] }

const ACCENT_BY_TIER: Record<string, string> = {
	free: 'oklch(62% 0.10 240)',
	growth: 'var(--accent)',
	pro: 'oklch(62% 0.18 290)',
};

const TIER_RANK: Record<string, number> = { free: 0, growth: 1, pro: 2 };

/**
 * Subscriptions page.
 *
 * Reads `GET /api/billing/plans` (catalog) and `GET /api/billing/subscription`
 * (the user's active row). The free plan has `stripe_price_id = null`; paid
 * plans always have one — clicking the CTA triggers Stripe checkout.
 *
 * The page is structured as: status banner → plan cards → feature comparison
 * → FAQ → trusted-by strip.
 */
export default function SubscriptionsPage() {
	const { data: profile } = useUserProfile();
	const { data: plansResp, isLoading: plansLoading } = useSWR<PlansResponse>(
		qk.billing.plans(),
		{ dedupingInterval: 30 * 60_000 },
	);
	const { data: subscription } = useSWR<SubscriptionResponse | null>(
		qk.billing.subscription(),
		{ dedupingInterval: 60_000 },
	);

	const currentTier = ((subscription?.user_type ?? profile?.user_type ?? 'free') as string).toLowerCase();
	const [busySlug, setBusySlug] = useState<string | null>(null);
	const [portalBusy, setPortalBusy] = useState(false);

	const handleCta = async (plan: PlanRow) => {
		if (plan.tier === 'free') return;
		if (plan.tier === currentTier) return;
		setBusySlug(plan.slug);
		try {
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

	const handlePortal = async () => {
		setPortalBusy(true);
		try {
			const origin = window.location.origin;
			const res = await apiRequest('POST', '/api/billing/portal', {
				return_url: `${origin}/subscriptions`,
			});
			const { url } = (await res.json()) as { url?: string };
			if (url) window.location.href = url;
		} catch (e) {
			toast.error((e as Error).message ?? 'Could not open the billing portal');
		} finally {
			setPortalBusy(false);
		}
	};

	const plans = plansResp?.data ?? [];
	const currentRank = TIER_RANK[currentTier] ?? 0;

	const cancelDate = parseDate(subscription?.subscription_cancel_at);
	const renewDate = parseDate(subscription?.subscription_current_period_end);
	const isCanceling = !!subscription && !!cancelDate;
	const isActive = !!subscription?.stripe_subscription_id && currentTier !== 'free';

	return (
		<Page>
			<PageTitle
				kicker="Plans"
				title="Subscriptions"
				sub="Pick the plan that matches the depth of intelligence you need."
			/>

			{isActive && (
				<SubscriptionBanner
					currentTier={currentTier}
					planName={subscription?.plan_name ?? null}
					isTrial={!!subscription?.is_trial}
					status={subscription?.subscription_status ?? null}
					renewDate={renewDate}
					cancelDate={cancelDate}
					onManage={handlePortal}
					portalBusy={portalBusy}
				/>
			)}

			{plansLoading && plans.length === 0 ? (
				<div className="grid-3" style={{ marginBottom: 'var(--space-5)' }}>
					{[0, 1, 2].map((i) => (
						<div key={i} className="card sub-card sub-skeleton" style={{ padding: 'var(--space-5)' }}>
							<div className="sub-skel-bar" style={{ width: '40%', height: 12 }} />
							<div className="sub-skel-bar" style={{ width: '60%', height: 36, marginTop: 16 }} />
							<div className="sub-skel-bar" style={{ width: '90%', height: 12, marginTop: 18 }} />
							<div className="sub-skel-bar" style={{ width: '70%', height: 12, marginTop: 6 }} />
							<div className="sub-skel-bar" style={{ width: '100%', height: 36, marginTop: 22 }} />
							{[0, 1, 2, 3].map((j) => (
								<div key={j} className="sub-skel-bar" style={{ width: '85%', height: 10, marginTop: 12 }} />
							))}
						</div>
					))}
				</div>
			) : (
				<div className="grid-3" style={{ marginBottom: 'var(--space-6)' }}>
					{plans.map((p) => (
						<PlanCard
							key={p.slug}
							plan={p}
							isCurrent={p.tier === currentTier}
							currentRank={currentRank}
							isBusy={busySlug === p.slug}
							onCta={() => void handleCta(p)}
						/>
					))}
				</div>
			)}

			{plans.length > 0 && (
				<div className="card" style={{ padding: 0, marginBottom: 'var(--space-5)' }}>
					<div style={{ padding: 'var(--space-4) var(--space-5)' }}>
						<SectionHead title="What's included" />
					</div>
					<ComparisonTable plans={plans} currentTier={currentTier} />
				</div>
			)}

			<div className="card" style={{ padding: 'var(--space-5)', marginBottom: 'var(--space-5)' }}>
				<SectionHead title="Frequently asked" />
				<div className="sub-faq">
					{FAQS.map((f) => (
						<details key={f.q} className="sub-faq-item">
							<summary>
								<span>{f.q}</span>
								<ArrowRight size={14} className="sub-faq-chev" />
							</summary>
							<p>{f.a}</p>
						</details>
					))}
				</div>
			</div>
		</Page>
	);
}

// ─── Status banner ────────────────────────────────────────────────────────

function SubscriptionBanner({
	currentTier, planName, isTrial, status, renewDate, cancelDate, onManage, portalBusy,
}: {
	currentTier: string;
	planName: string | null;
	isTrial: boolean;
	status: string | null;
	renewDate: Date | null;
	cancelDate: Date | null;
	onManage: () => void;
	portalBusy: boolean;
}) {
	const accent = ACCENT_BY_TIER[currentTier] ?? 'var(--accent)';
	const canceling = !!cancelDate;
	const variant = canceling ? 'warn' : isTrial ? 'trial' : 'active';
	return (
		<div className={`sub-banner sub-banner-${variant}`} style={{ '--sub-accent': accent } as React.CSSProperties}>
			<div className="sub-banner-icon">
				{canceling ? <AlertTriangle size={18} /> : isTrial ? <Sparkles size={18} /> : <Crown size={18} />}
			</div>
			<div className="sub-banner-text">
				<div className="sub-banner-h">
					{canceling
						? <>Your subscription will end on <b>{formatDate(cancelDate!)}</b></>
						: isTrial
							? <>You're on a free trial of <b>{planName ?? capitalize(currentTier)}</b></>
							: <>You're subscribed to <b>{planName ?? capitalize(currentTier)}</b></>}
					{status && <Tag variant={canceling ? 'warn' : 'pos'}>{capitalize(status)}</Tag>}
				</div>
				<div className="sub-banner-sub">
					{canceling
						? 'Access continues until then. Reactivate any time in the billing portal.'
						: renewDate
							? <>Renews on <b>{formatDate(renewDate)}</b></>
							: 'Active'}
				</div>
			</div>
			<button className="btn" onClick={onManage} disabled={portalBusy}>
				{portalBusy
					? <><Loader2 size={12} className="animate-spin" /> Opening…</>
					: <>Manage subscription <ExternalLink size={12} /></>}
			</button>
		</div>
	);
}

// ─── Plan card ────────────────────────────────────────────────────────────

function PlanCard({
	plan, isCurrent, currentRank, isBusy, onCta,
}: {
	plan: PlanRow;
	isCurrent: boolean;
	currentRank: number;
	isBusy: boolean;
	onCta: () => void;
}) {
	const accent = ACCENT_BY_TIER[plan.tier] ?? 'var(--accent)';
	const isFree = plan.tier === 'free';
	const popular = plan.tier === 'growth';
	const tierRank = TIER_RANK[plan.tier] ?? 0;
	const isDowngrade = tierRank < currentRank;
	const ctaLabel = isCurrent
		? 'Current plan'
		: isFree
			? 'Downgrade in portal'
			: isDowngrade
				? `Downgrade to ${plan.name}`
				: `Upgrade to ${plan.name}`;
	const ctaDisabled = isCurrent || isBusy || isFree;
	const ctaVariant = popular && !isCurrent ? '' : 'ghost';

	const { primary, secondary } = formatPriceDisplay(plan);

	return (
		<div
			className={`card sub-card ${popular ? 'popular' : ''} ${isCurrent ? 'sub-card-current' : ''}`}
			style={{
				padding: 'var(--space-5)',
				position: 'relative',
				'--sub-accent': accent,
			} as React.CSSProperties}
		>
			<div className="sub-card-accent" />
			{popular && !isCurrent && <div className="sub-badge">Most popular</div>}
			{isCurrent && <div className="sub-badge sub-badge-current">Your plan</div>}

			<div className="sub-card-tier">{plan.name}</div>

			<div className="sub-card-price">
				<span className="sub-card-price-v">{primary.value}</span>
				{primary.suffix && <span className="sub-card-price-suffix">{primary.suffix}</span>}
			</div>
			{secondary && <div className="sub-card-price-sub">{secondary}</div>}

			<p className="sub-card-tagline">{plan.tagline ?? ' '}</p>

			{plan.trial_days > 0 && (
				<div className="sub-trial-pill">
					<Sparkles size={11} />
					<span>{plan.trial_days}-day free trial</span>
				</div>
			)}

			<button
				className={`btn ${ctaVariant}`}
				style={{ width: '100%', justifyContent: 'center' }}
				disabled={ctaDisabled}
				onClick={onCta}
			>
				{isBusy ? <><Loader2 size={12} className="animate-spin" /> Loading…</> : ctaLabel}
			</button>

			<div className="sub-card-divider" />

			<div className="sub-card-features">
				{plan.feature_highlights.map((f) => (
					<div key={f} className="sub-feature">
						<Check size={14} style={{ color: accent }} />
						<span>{f}</span>
					</div>
				))}
			</div>
		</div>
	);
}

// ─── Comparison table ─────────────────────────────────────────────────────

interface CompRow { label: string; values: Record<string, boolean | string> }

function ComparisonTable({ plans, currentTier }: { plans: PlanRow[]; currentTier: string }) {
	// Build the union of all feature highlights across tiers. For each feature,
	// a tier "has" it if either (a) the feature is in its own highlights or
	// (b) a lower-ranked tier already lists it (Pro inherits everything in
	// Growth, etc).
	const rows = useMemo<CompRow[]>(() => {
		const all = new Set<string>();
		for (const p of plans) for (const f of p.feature_highlights) all.add(f);
		const sortedPlans = [...plans].sort((a, b) => (TIER_RANK[a.tier] ?? 0) - (TIER_RANK[b.tier] ?? 0));
		// Tier has the feature if any tier ≤ its rank includes it.
		const featuresByRank: Array<Set<string>> = [];
		sortedPlans.forEach((p, i) => {
			const prev = i > 0 ? featuresByRank[i - 1]! : new Set<string>();
			const merged = new Set(prev);
			p.feature_highlights.forEach((f) => merged.add(f));
			featuresByRank.push(merged);
		});
		return [...all].map((label) => ({
			label,
			values: Object.fromEntries(sortedPlans.map((p, i) => [p.tier, featuresByRank[i]!.has(label)])),
		}));
	}, [plans]);

	const sortedPlans = useMemo(
		() => [...plans].sort((a, b) => (TIER_RANK[a.tier] ?? 0) - (TIER_RANK[b.tier] ?? 0)),
		[plans],
	);

	return (
		<div style={{ overflowX: 'auto' }}>
			<table className="sub-compare">
				<thead>
					<tr>
						<th />
						{sortedPlans.map((p) => (
							<th key={p.slug} className={p.tier === currentTier ? 'sub-compare-current' : ''}>
								<div className="sub-compare-tier" style={{ color: ACCENT_BY_TIER[p.tier] ?? 'var(--accent)' }}>
									{p.name}
								</div>
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{rows.map((r) => (
						<tr key={r.label}>
							<td className="sub-compare-label">{r.label}</td>
							{sortedPlans.map((p) => {
								const v = r.values[p.tier];
								return (
									<td key={p.slug} className={p.tier === currentTier ? 'sub-compare-current' : ''}>
										{v === true
											? <Check size={14} style={{ color: ACCENT_BY_TIER[p.tier] ?? 'var(--accent)' }} />
											: v === false
												? <X size={13} style={{ color: 'var(--fg-muted)', opacity: 0.4 }} />
												: <span>{v as string}</span>}
									</td>
								);
							})}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

// ─── FAQ data ─────────────────────────────────────────────────────────────

const FAQS = [
	{
		q: 'Can I cancel anytime?',
		a: "Yes. Open the Manage subscription portal — your access continues until the end of the current billing period and we don't take a renewal charge.",
	},
	{
		q: 'How do upgrades and downgrades work?',
		a: 'Upgrades take effect immediately and we prorate the unused portion of your current plan. Downgrades take effect at the end of the current period.',
	},
	{
		q: 'Do you offer team or enterprise pricing?',
		a: 'Yes. Email hello@sportstechx.com — we tailor seat counts, the data depth, and the API allowance for your team.',
	},
	{
		q: 'Which currencies do you accept?',
		a: 'Stripe handles checkout, so we accept any card it does. Prices on this page are in EUR but the charge converts at the bank rate.',
	},
];

// ─── Helpers ──────────────────────────────────────────────────────────────

function formatPriceDisplay(plan: PlanRow): {
	primary: { value: string; suffix: string | null };
	secondary: string | null;
} {
	if (plan.price_amount === 0) {
		return { primary: { value: 'Free', suffix: null }, secondary: 'forever' };
	}
	const major = plan.price_amount / 100;
	const symbol = currencySymbol(plan.currency_code);
	if (plan.billing_interval === 'yearly') {
		// Yearly plans display as a per-month equivalent + "billed annually" sub —
		// far more useful for comparison than the raw "/yr" number.
		const perMonth = major / 12;
		return {
			primary: { value: `${symbol}${formatNumber(perMonth)}`, suffix: '/mo' },
			secondary: `${symbol}${formatNumber(major)} billed annually`,
		};
	}
	if (plan.billing_interval === 'monthly') {
		return {
			primary: { value: `${symbol}${formatNumber(major)}`, suffix: '/mo' },
			secondary: null,
		};
	}
	return { primary: { value: `${symbol}${formatNumber(major)}`, suffix: null }, secondary: null };
}

function formatNumber(n: number): string {
	if (n >= 100) return n.toFixed(0);
	if (n % 1 === 0) return n.toFixed(0);
	return n.toFixed(2).replace(/\.?0+$/, '');
}

function currencySymbol(code: string): string {
	const up = code.toUpperCase();
	if (up === 'EUR') return '€';
	if (up === 'USD') return '$';
	if (up === 'GBP') return '£';
	return `${up} `;
}

function parseDate(iso: string | null | undefined): Date | null {
	if (!iso) return null;
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return null;
	return d;
}

function formatDate(d: Date): string {
	return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
}

function capitalize(s: string): string {
	if (!s) return '';
	return s[0]!.toUpperCase() + s.slice(1);
}
