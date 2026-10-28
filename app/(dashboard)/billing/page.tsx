'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, ExternalLink } from 'lucide-react';
import { apiRequest } from '@/lib/query-client';
import { noteCancellation } from '@/lib/invalidate';
import { hrefOf, PLANS_PATH } from '@/lib/routes';
import { useUserProfile, getUserType } from '@/hooks/use-user-profile';
import { useCreditBalance } from '@/hooks/use-credit-balance';
import { AccountTabs } from '@/components/features/account/account-tabs';
import { Screen, PageHead, Card, Button, Badge, Loading, Action } from '@/components/atlas';

/**
 * Plan & billing — reachable by every plan (not gated to raise). Shows the
 * current plan + status, past subscriptions, and invoices. Plan changes route
 * correctly: an existing subscriber changes/cancels in the Stripe portal (a new
 * Checkout would create a SECOND subscription and double-bill), while a user
 * with no active plan starts one via Checkout.
 *
 * This lives in the `(dashboard)` group so it renders inside the app shell — the
 * sidebar, navbar and account tab strip — same as the Account and Thesis tabs
 * it sits beside. The chrome-less `/billing/success` and `/billing/cancel`
 * screens stay under `app/billing/`, because those are the surfaces Stripe
 * redirects *into* and must stay focused.
 */
const TIER_LABEL: Record<string, string> = {
	explore: 'Explore', raise: 'Raise', scout: 'Scout',
	free: 'Explore (legacy)', general: 'General (retired)',
	growth: 'Growth (retired)', pro: 'Pro (retired)',
};
interface PlanRow { slug: string; name: string; tier: string; billing_interval: string | null; price_amount: number; currency_code: string }
const fmtPrice = (p: PlanRow) => {
	const amt = new Intl.NumberFormat(undefined, { style: 'currency', currency: (p.currency_code || 'eur').toUpperCase(), maximumFractionDigits: 0 }).format(p.price_amount / 100);
	const interval = p.billing_interval === 'yearly' ? 'per year' : p.billing_interval === 'semiannual' ? 'per 6 months' : p.billing_interval === 'monthly' ? 'per month' : '';
	return `${amt} ${interval}`.trim();
};

interface Invoice { id: string; number: string | null; status: string | null; amount_paid: number; currency: string; created: number; hosted_invoice_url: string | null; invoice_pdf: string | null }
interface Sub { subscription_status?: string | null; is_trial?: boolean | null; subscription_current_period_end?: string | null; subscription_cancel_at?: string | null }
interface SubRow { stripe_subscription_id: string; subscription_status: string; is_active: boolean; is_trial: boolean; plan_name: string | null; user_type: string; subscription_current_period_end: string | null; subscription_cancel_at: string | null; updated_at: string }

const fmtMoney = (cents: number, ccy: string) => new Intl.NumberFormat(undefined, { style: 'currency', currency: (ccy || 'eur').toUpperCase() }).format((cents ?? 0) / 100);
const fmtDate = (unixSec: number) => new Date(unixSec * 1000).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
const fmtISO = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
const subLabel = (s: SubRow) => s.plan_name ?? TIER_LABEL[s.user_type] ?? s.user_type;

// Presentation-only styles (Atlas kit tokens).
const CARD_TITLE: React.CSSProperties = { fontSize: 17, fontFamily: 'var(--a-font)', fontWeight: 700, color: 'var(--a-ink)' };
const BODY: React.CSSProperties = { fontSize: 12, color: 'var(--a-muted)', lineHeight: 1.55 };
const PRICE: React.CSSProperties = { fontFamily: 'var(--a-font)', fontSize: 36, fontWeight: 500, lineHeight: 1.05, color: 'var(--a-ink)' };
const META: React.CSSProperties = { fontFamily: 'var(--a-mono)', fontSize: 10, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--a-faint)', marginTop: 4 };
const ROW_TITLE: React.CSSProperties = { fontSize: 13, fontWeight: 500, color: 'var(--a-ink)' };
const SECTION: React.CSSProperties = { margin: '32px 0 12px' };

export default function BillingPage() {
	const router = useRouter();
	const { data: profile } = useUserProfile();
	const plan = getUserType(profile);
	const plans = useSWR<{ data: PlanRow[] }>(['/api/billing/plans']);
	const matchedPlan = (plans.data?.data ?? []).find((r) => r.tier === plan);
	const p = { label: matchedPlan?.name ?? TIER_LABEL[plan] ?? plan, price: matchedPlan ? fmtPrice(matchedPlan) : (plan === 'explore' ? '€0' : '') };
	const sub = useSWR<Sub | null>(['/api/billing/subscription']);
	const allSubs = useSWR<SubRow[]>(['/api/billing/subscriptions']);
	const invoices = useSWR<Invoice[]>(['/api/billing/invoices']);
	const { balance: bal } = useCreditBalance();
	const [busy, setBusy] = useState<string | null>(null);

	// A live subscription exists → plan changes must go through the portal so we
	// don't stack a second subscription. Only users without one start via Checkout.
	const hasActiveSub = !!sub.data?.subscription_status;
	const cancelling = !!sub.data?.subscription_cancel_at;

	const cancelPlan = async () => {
		if (!confirm('Cancel your subscription? You will keep access until the current period ends.')) return;
		setBusy('cancel');
		try {
			const res = await apiRequest('POST', '/api/billing/cancel');
			const body = (await res.json().catch(() => ({}))) as { access_until?: string | null };
			toast.success('Subscription will cancel at the end of the billing period.');
			void noteCancellation(body.access_until ?? null);
		} catch {
			toast.error("Couldn't cancel. Please try again or use the billing portal.");
		}
		setBusy(null);
	};

	const manage = async () => {
		setBusy('portal');
		try {
			const res = await apiRequest('POST', '/api/billing/portal', { return_url: window.location.href });
			const body = (await res.json()) as { url?: string };
			if (body.url) { window.location.assign(body.url); return; }
			throw new Error('no url');
		} catch {
			toast.error("Couldn't open the billing portal. If you don't have an active plan yet, start one first.");
			setBusy(null);
		}
	};

	const rows = invoices.data ?? [];
	const pastSubs = (allSubs.data ?? []).filter((s) => !s.is_active);

	return (
		<Screen>
			<PageHead title="Subscription" />
			<AccountTabs />

			<Card focus glow="blue" style={{ marginBottom: 24, padding: '24px 26px' }}>
				<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
					<div>
						<div className="atlas-eyebrow">Current plan</div>
						<div style={{ ...CARD_TITLE, fontSize: 18, marginTop: 12 }}>{p.label}</div>
						<div style={{ ...PRICE, marginTop: 10 }}>{p.price}</div>
						{sub.data?.subscription_status && (
							<div style={{ marginTop: 14 }}><Badge tone={cancelling ? 'neutral' : sub.data.subscription_status === 'active' ? 'ok' : 'neutral'}>{cancelling ? 'Cancels' : sub.data.is_trial ? 'Trial' : sub.data.subscription_status}</Badge></div>
						)}
						{cancelling && (
							<p style={{ ...BODY, marginTop: 10 }}>Your plan access ends on {fmtISO(sub.data?.subscription_cancel_at ?? sub.data?.subscription_current_period_end ?? null)}. You keep full access until then.</p>
						)}
					</div>
					{hasActiveSub && (
						<div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
							<Button variant="outline" size="sm" disabled={busy !== null} onClick={() => void manage()}>{busy === 'portal' ? <Loader2 className="animate-spin" size={13} /> : 'Manage billing'}</Button>
							{!cancelling && (
								<button type="button" disabled={busy !== null} onClick={() => void cancelPlan()}
									style={{ fontSize: 11, color: 'var(--a-faint)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>
									{busy === 'cancel' ? 'Cancelling…' : 'Cancel subscription'}
								</button>
							)}
						</div>
					)}
				</div>
			</Card>

			<Card style={{ marginBottom: 24 }}>
				<div style={{ ...CARD_TITLE, marginBottom: 6 }}>Change plan</div>
				{hasActiveSub ? (
					<>
						<p style={{ ...BODY, margin: '0 0 16px' }}>Switch to a different plan or cancel in the billing portal — changes are prorated by Stripe.</p>
						<Button size="sm" disabled={busy !== null} onClick={() => void manage()}>{busy === 'portal' ? <Loader2 className="animate-spin" size={13} /> : 'Open billing portal'}</Button>
					</>
				) : (
					<>
						<p style={{ ...BODY, margin: '0 0 18px' }}>Compare what each plan includes and pick one.</p>
					{/* One plan picker, not two. These cards duplicated the tier list with
						    hardcoded prices, so a price change in the admin left them lying.
						    The plans page reads `subscription_plans` and the live matrix. */}
					<Button size="sm" onClick={() => router.push(PLANS_PATH)}>See plans</Button>
					</>
				)}
			</Card>

			<Card style={{ marginBottom: 8 }}>
				<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
					<div>
						<div style={CARD_TITLE}>STX credits</div>
						<p style={{ ...BODY, margin: '6px 0 0' }}>{bal ? `${bal.total_available.toLocaleString()} available` : 'AI features and exports'} — buy credits and see your history on the Credits page.</p>
					</div>
					<Button variant="outline" size="sm" onClick={() => router.push(hrefOf('credits'))}>Manage credits</Button>
				</div>
			</Card>

			{pastSubs.length > 0 && (
				<>
					<div className="atlas-eyebrow" style={SECTION}>Past subscriptions</div>
					<Card style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>
						{pastSubs.map((s, i) => (
							<div key={s.stripe_subscription_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 23px', borderTop: i ? '1px solid var(--a-border)' : 'none' }}>
								<div>
									<div style={ROW_TITLE}>{subLabel(s)} <span style={{ color: 'var(--a-faint)', fontWeight: 400 }}>· {s.subscription_status}</span></div>
									<div style={META}>Ended {fmtISO(s.subscription_cancel_at ?? s.subscription_current_period_end)}</div>
								</div>
							</div>
						))}
					</Card>
				</>
			)}

			<div className="atlas-eyebrow" style={SECTION}>Billing history</div>
			{invoices.isLoading ? <Loading />
				: invoices.error ? <Card><div style={{ fontSize: 13, color: 'var(--a-faint)' }}>Couldn&apos;t load billing history. Please try again.</div></Card>
					: rows.length === 0 ? <Card><div style={{ fontSize: 13, color: 'var(--a-faint)' }}>No invoices yet.</div></Card>
						: (
							<Card style={{ padding: 0, overflow: 'hidden' }}>
								{rows.map((inv, i) => (
									<div key={inv.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 23px', borderTop: i ? '1px solid var(--a-border)' : 'none' }}>
										<div>
											<div style={ROW_TITLE}><span style={{ fontFamily: 'var(--a-mono)', fontSize: 12 }}>{fmtMoney(inv.amount_paid, inv.currency)}</span> <span style={{ color: 'var(--a-faint)', fontWeight: 400 }}>· {inv.status ?? '—'}</span></div>
											<div style={META}>{fmtDate(inv.created)}{inv.number ? ` · ${inv.number}` : ''}</div>
										</div>
										{inv.hosted_invoice_url && <Action icon={<ExternalLink />} href={inv.hosted_invoice_url} external>View</Action>}
									</div>
								))}
							</Card>
						)}
		</Screen>
	);
}
