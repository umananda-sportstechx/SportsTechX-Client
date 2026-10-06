'use client';

import { useState } from 'react';
import useSWR from 'swr';
import useSWRInfinite from 'swr/infinite';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, ExternalLink } from 'lucide-react';
import { apiRequest } from '@/lib/query-client';
import { qk } from '@/lib/query-keys';
import { useUserProfile, getUserType } from '@/hooks/use-user-profile';
import { useCreditBalance } from '@/hooks/use-credit-balance';
import { Brand } from '@/components/ui/brand';
import { Card, Button, Badge, Loading, PageHead, Action } from '@/components/atlas';

/**
 * Plan & billing — reachable by every plan (not gated to raise). Shows the
 * current plan + status, past subscriptions, and invoices. Plan changes route
 * correctly: an existing subscriber changes/cancels in the Stripe portal (a new
 * Checkout would create a SECOND subscription and double-bill), while a user
 * with no active plan starts one via Checkout.
 */
// The retired labels stay in the lookup only so a historical `stripe_subscriptions`
// row still renders a name instead of a raw enum value. They are not offered.
const PLAN: Record<string, { label: string; price: string }> = {
	explore: { label: 'Explore', price: '€0' },
	raise: { label: 'Raise', price: '€600 / year' },
	scout: { label: 'Scout', price: '€2,500 / year' },
	free: { label: 'Explore (legacy)', price: '—' },
	general: { label: 'General (retired)', price: '—' },
	growth: { label: 'Growth (retired)', price: '—' },
	pro: { label: 'Pro (retired)', price: '—' },
};
/** Plans a user can actually move onto. */
const PLANS: [string, string][] = [['raise', 'Raise'], ['scout', 'Scout']];

interface Invoice { id: string; number: string | null; status: string | null; amount_paid: number; currency: string; created: number; hosted_invoice_url: string | null; invoice_pdf: string | null }
interface Sub { subscription_status?: string | null; is_trial?: boolean | null; subscription_current_period_end?: string | null }
interface SubRow { stripe_subscription_id: string; subscription_status: string; is_active: boolean; is_trial: boolean; plan_name: string | null; user_type: string; subscription_current_period_end: string | null; subscription_cancel_at: string | null; updated_at: string }
interface Pack { id: string; name: string; credit_amount: number; price_amount: number; currency_code: string }
interface LedgerRow { id: string; transaction_type: string; amount: number; description: string | null; display_name: string | null; occurred_at: string }

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
	const packs = useSWR<{ data: Pack[] }>(['/api/billing/credit-packs']);
	const ledger = useSWRInfinite<{ data: LedgerRow[]; nextCursor: string | null }>(
		(index, prev) => (prev && !prev.nextCursor) ? null : qk.credits.ledger('all', index === 0 ? undefined : (prev?.nextCursor ?? undefined), 25),
	);
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
	const startPlan = async (target: string) => {
		setBusy(target);
		try {
			const res = await apiRequest('POST', '/api/billing/checkout', { plan: target });
			const body = (await res.json()) as { url?: string };
			if (body.url) { window.location.assign(body.url); return; }
			throw new Error('no url');
		} catch {
			toast.error("Couldn't start checkout. Please try again.");
			setBusy(null);
		}
	};

	const buyPack = async (packId: string) => {
		setBusy(packId);
		try {
			const res = await apiRequest('POST', '/api/billing/credit-packs/checkout', { pack_id: packId });
			const body = (await res.json()) as { url?: string };
			if (body.url) { window.location.assign(body.url); return; }
			throw new Error('no url');
		} catch {
			toast.error("Couldn't start checkout. Please try again.");
			setBusy(null);
		}
	};

	const rows = invoices.data ?? [];
	const pastSubs = (allSubs.data ?? []).filter((s) => !s.is_active);
	const packList = packs.data?.data ?? [];
	const ledgerRows = ledger.data?.flatMap((p) => p.data) ?? [];
	const ledgerHasMore = !!ledger.data?.[ledger.data.length - 1]?.nextCursor;

	return (
		<div className="atlas" style={{ maxWidth: 820, margin: '0 auto', padding: '40px 20px 64px', background: 'var(--a-page)', color: 'var(--a-ink)' }}>
			<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 36 }}>
				<Action icon={<ArrowLeft />} onClick={() => router.push(plan === 'raise' ? '/raise' : '/coming-soon')}>Back</Action>
				<Brand variant="horizontal" height={30} />
			</div>
			<PageHead title={'Plan & billing'} />

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
						<p style={{ ...BODY, margin: '0 0 18px' }}>Choose a plan to get started.</p>
						<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
							{PLANS.filter(([k]) => k !== plan).map(([k, label]) => (
								<Card key={k} glow={k === 'raise' ? 'blue' : undefined} focus={k === 'raise'} style={{ display: 'flex', flexDirection: 'column', gap: 14, background: k === 'raise' ? undefined : 'var(--a-field)' }}>
									<div className="atlas-eyebrow">{label}</div>
									<div style={PRICE}>{PLAN[k].price}</div>
									<div style={{ marginTop: 'auto' }}>
										<Button size="sm" variant={k === 'raise' ? 'primary' : 'outline'} disabled={busy !== null} onClick={() => void startPlan(k)}>
											{busy === k ? <Loader2 className="animate-spin" size={13} /> : `Get ${label} — ${PLAN[k].price}`}
										</Button>
									</div>
								</Card>
							))}
						</div>
					</>
				)}
			</Card>

			<Card style={{ marginBottom: 8 }}>
				<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
					<div style={CARD_TITLE}>AI credits</div>
					{bal && <div style={{ fontFamily: 'var(--a-mono)', fontSize: 11, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--a-muted)' }}>{bal.total_available.toLocaleString()} available{bal.monthly_grant ? ` · ${bal.monthly_balance.toLocaleString()}/${bal.monthly_grant.toLocaleString()} monthly` : ''}{bal.topup_balance ? ` · ${bal.topup_balance.toLocaleString()} top-up` : ''}</div>}
				</div>
				<p style={{ ...BODY, margin: '8px 0 16px' }}>Credits power the AI co-pilot. Monthly credits renew each month; top-ups never expire.</p>
				{packList.length === 0 ? <div style={{ fontSize: 12, color: 'var(--a-faint)' }}>No credit packs available right now.</div> : (
					<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
						{packList.map((pk) => (
							<Button key={pk.id} size="sm" variant="outline" disabled={busy !== null} onClick={() => void buyPack(pk.id)}>
								{busy === pk.id ? <Loader2 className="animate-spin" size={13} /> : `${pk.credit_amount.toLocaleString()} credits — ${fmtMoney(pk.price_amount, pk.currency_code)}`}
							</Button>
						))}
					</div>
				)}
			</Card>

			<div className="atlas-eyebrow" style={SECTION}>AI credit history</div>
			{ledger.isLoading ? <Loading />
				: ledger.error ? <Card><div style={{ fontSize: 13, color: 'var(--a-faint)' }}>Couldn&apos;t load credit history.</div></Card>
					: ledgerRows.length === 0 ? <Card><div style={{ fontSize: 13, color: 'var(--a-faint)' }}>No AI credit activity yet.</div></Card>
						: (
							<Card style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>
								{ledgerRows.map((r, i) => (
									<div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 23px', borderTop: i ? '1px solid var(--a-border)' : 'none' }}>
										<div>
											<div style={ROW_TITLE}>{r.display_name ?? r.description ?? r.transaction_type.replace(/_/g, ' ')}</div>
											<div style={META}>{fmtISO(r.occurred_at)}</div>
										</div>
										<div style={{ fontFamily: 'var(--a-mono)', fontSize: 12, color: r.amount >= 0 ? 'var(--a-ok)' : 'var(--a-muted)' }}>{r.amount >= 0 ? '+' : ''}{r.amount.toLocaleString()}</div>
									</div>
								))}
								{ledgerHasMore && (
									<div style={{ padding: '14px 23px', borderTop: '1px solid var(--a-border)', textAlign: 'center' }}>
										<Button variant="outline" size="sm" disabled={ledger.isValidating} onClick={() => void ledger.setSize(ledger.size + 1)}>
											{ledger.isValidating ? <Loader2 className="animate-spin" size={13} /> : 'Load more'}
										</Button>
									</div>
								)}
							</Card>
						)}

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
		</div>
	);
}
