'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, ExternalLink } from 'lucide-react';
import { apiRequest } from '@/lib/query-client';
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
// The retired labels stay in the lookup only so a historical `stripe_subscriptions`
// row still renders a name instead of a raw enum value. They are not offered.
const PLAN: Record<string, { label: string; price: string }> = {
	explore: { label: 'Explore', price: '€0' },
	raise: { label: 'Raise', price: '€600 / 6 months' },
	scout: { label: 'Scout', price: '€2,500 / year' },
	free: { label: 'Explore (legacy)', price: '—' },
	general: { label: 'General (retired)', price: '—' },
	growth: { label: 'Growth (retired)', price: '—' },
	pro: { label: 'Pro (retired)', price: '—' },
};

interface Invoice { id: string; number: string | null; status: string | null; amount_paid: number; currency: string; created: number; hosted_invoice_url: string | null; invoice_pdf: string | null }
interface Sub { subscription_status?: string | null; is_trial?: boolean | null; subscription_current_period_end?: string | null }
interface SubRow { stripe_subscription_id: string; subscription_status: string; is_active: boolean; is_trial: boolean; plan_name: string | null; user_type: string; subscription_current_period_end: string | null; subscription_cancel_at: string | null; updated_at: string }

const fmtMoney = (cents: number, ccy: string) => new Intl.NumberFormat(undefined, { style: 'currency', currency: (ccy || 'eur').toUpperCase() }).format((cents ?? 0) / 100);
const fmtDate = (unixSec: number) => new Date(unixSec * 1000).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
const fmtISO = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
const subLabel = (s: SubRow) => s.plan_name ?? PLAN[s.user_type]?.label ?? s.user_type;

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
	const p = PLAN[plan] ?? { label: plan, price: '' };
	const sub = useSWR<Sub | null>(['/api/billing/subscription']);
	const allSubs = useSWR<SubRow[]>(['/api/billing/subscriptions']);
	const invoices = useSWR<Invoice[]>(['/api/billing/invoices']);
	const { balance: bal } = useCreditBalance();
	const [busy, setBusy] = useState<string | null>(null);

	// A live subscription exists → plan changes must go through the portal so we
	// don't stack a second subscription. Only users without one start via Checkout.
	const hasActiveSub = !!sub.data?.subscription_status;

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
		<Screen width={900}>
			<PageHead title="Subscription" />
			<AccountTabs />

			<Card focus glow="blue" style={{ marginBottom: 24, padding: '24px 26px' }}>
				<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
					<div>
						<div className="atlas-eyebrow">Current plan</div>
						<div style={{ ...CARD_TITLE, fontSize: 18, marginTop: 12 }}>{p.label}</div>
						<div style={{ ...PRICE, marginTop: 10 }}>{p.price}</div>
						{sub.data?.subscription_status && (
							<div style={{ marginTop: 14 }}><Badge tone={sub.data.subscription_status === 'active' ? 'ok' : 'neutral'}>{sub.data.is_trial ? 'Trial' : sub.data.subscription_status}</Badge></div>
						)}
					</div>
					{hasActiveSub && (
						<Button variant="outline" size="sm" disabled={busy !== null} onClick={() => void manage()}>{busy === 'portal' ? <Loader2 className="animate-spin" size={13} /> : 'Manage billing'}</Button>
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
