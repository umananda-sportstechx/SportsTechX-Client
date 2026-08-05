'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, ExternalLink } from 'lucide-react';
import { apiRequest } from '@/lib/query-client';
import { qk } from '@/lib/query-keys';
import { useUserProfile, getUserType } from '@/hooks/use-user-profile';
import { useCreditBalance } from '@/hooks/use-credit-balance';
import { Brand } from '@/components/ui/brand';
import { Card, Button, Badge, Loading } from '@/components/atlas/kit';

/**
 * Plan & billing — reachable by every plan (not gated to raise). Shows the
 * current plan + status, past subscriptions, and invoices. Plan changes route
 * correctly: an existing subscriber changes/cancels in the Stripe portal (a new
 * Checkout would create a SECOND subscription and double-bill), while a user
 * with no active plan starts one via Checkout.
 */
const PLAN: Record<string, { label: string; price: string }> = {
	free: { label: 'Free', price: '€0' },
	general: { label: 'General', price: '€500 / year' },
	raise: { label: 'Raise', price: '€600 / year' },
	scout: { label: 'Scout', price: '€2,500 / year' },
	growth: { label: 'General (legacy)', price: '—' },
	pro: { label: 'Raise (legacy)', price: '—' },
};
const PLANS: [string, string][] = [['general', 'General'], ['raise', 'Raise'], ['scout', 'Scout']];

interface Invoice { id: string; number: string | null; status: string | null; amount_paid: number; currency: string; created: number; hosted_invoice_url: string | null; invoice_pdf: string | null }
interface Sub { subscription_status?: string | null; is_trial?: boolean | null; subscription_current_period_end?: string | null }
interface SubRow { stripe_subscription_id: string; subscription_status: string; is_active: boolean; is_trial: boolean; plan_name: string | null; user_type: string; subscription_current_period_end: string | null; subscription_cancel_at: string | null; updated_at: string }
interface Pack { id: string; name: string; credit_amount: number; price_amount: number; currency_code: string }
interface LedgerRow { id: string; transaction_type: string; amount: number; description: string | null; display_name: string | null; occurred_at: string }

const fmtMoney = (cents: number, ccy: string) => new Intl.NumberFormat(undefined, { style: 'currency', currency: (ccy || 'eur').toUpperCase() }).format((cents ?? 0) / 100);
const fmtDate = (unixSec: number) => new Date(unixSec * 1000).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
const fmtISO = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
const subLabel = (s: SubRow) => s.plan_name ?? PLAN[s.user_type]?.label ?? s.user_type;

export default function BillingPage() {
	const router = useRouter();
	const { data: profile } = useUserProfile();
	const plan = getUserType(profile);
	const p = PLAN[plan] ?? { label: plan, price: '' };
	const sub = useSWR<Sub | null>(['/api/billing/subscription']);
	const allSubs = useSWR<SubRow[]>(['/api/billing/subscriptions']);
	const invoices = useSWR<Invoice[]>(['/api/billing/invoices']);
	const packs = useSWR<{ data: Pack[] }>(['/api/billing/credit-packs']);
	const ledger = useSWR<{ data: LedgerRow[] }>(qk.credits.ledger('ai', undefined, 25));
	const { balance: bal } = useCreditBalance('ai');
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
	const ledgerRows = ledger.data?.data ?? [];

	return (
		<div className="atlas" style={{ maxWidth: 760, margin: '0 auto', padding: '32px 20px 56px' }}>
			<button onClick={() => router.push(plan === 'raise' ? '/raise' : '/coming-soon')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--a-muted)', fontSize: 13, padding: 0, display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 20 }}><ArrowLeft size={14} /> Back</button>
			<Brand variant="horizontal" height={30} />
			<h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--a-ink)', margin: '18px 0 20px', letterSpacing: '-0.02em' }}>Plan &amp; billing</h1>

			<Card focus style={{ marginBottom: 20 }}>
				<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
					<div>
						<div style={{ fontSize: 12, color: 'var(--a-muted)' }}>Current plan</div>
						<div style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>{p.label}</div>
						<div style={{ fontSize: 13, color: 'var(--a-muted)', marginTop: 2 }}>{p.price}</div>
						{sub.data?.subscription_status && (
							<div style={{ marginTop: 8 }}><Badge tone={sub.data.subscription_status === 'active' ? 'ok' : 'neutral'}>{sub.data.is_trial ? 'Trial' : sub.data.subscription_status}</Badge></div>
						)}
					</div>
					{hasActiveSub && (
						<Button variant="outline" size="sm" disabled={busy !== null} onClick={() => void manage()}>{busy === 'portal' ? <Loader2 className="spin" size={13} /> : 'Manage billing'}</Button>
					)}
				</div>
			</Card>

			<Card style={{ marginBottom: 20 }}>
				<div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Change plan</div>
				{hasActiveSub ? (
					<>
						<p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--a-muted)' }}>Switch to a different plan or cancel in the billing portal — changes are prorated by Stripe.</p>
						<Button size="sm" disabled={busy !== null} onClick={() => void manage()}>{busy === 'portal' ? <Loader2 className="spin" size={13} /> : 'Open billing portal'}</Button>
					</>
				) : (
					<>
						<p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--a-muted)' }}>Choose a plan to get started.</p>
						<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
							{PLANS.filter(([k]) => k !== plan).map(([k, label]) => (
								<Button key={k} size="sm" variant={k === 'raise' ? 'primary' : 'outline'} disabled={busy !== null} onClick={() => void startPlan(k)}>
									{busy === k ? <Loader2 className="spin" size={13} /> : `Get ${label} — ${PLAN[k].price}`}
								</Button>
							))}
						</div>
					</>
				)}
			</Card>

			<Card style={{ marginBottom: 20 }}>
				<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
					<div style={{ fontSize: 14, fontWeight: 600 }}>AI credits</div>
					{bal && <div style={{ fontSize: 13, color: 'var(--a-muted)' }}>{bal.total_available.toLocaleString()} available{bal.monthly_grant ? ` · ${bal.monthly_balance.toLocaleString()}/${bal.monthly_grant.toLocaleString()} monthly` : ''}{bal.topup_balance ? ` · ${bal.topup_balance.toLocaleString()} top-up` : ''}</div>}
				</div>
				<p style={{ margin: '6px 0 12px', fontSize: 13, color: 'var(--a-muted)' }}>Credits power the AI co-pilot. Monthly credits renew each month; top-ups never expire.</p>
				{packList.length === 0 ? <div style={{ fontSize: 13, color: 'var(--a-faint)' }}>No credit packs available right now.</div> : (
					<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
						{packList.map((pk) => (
							<Button key={pk.id} size="sm" variant="outline" disabled={busy !== null} onClick={() => void buyPack(pk.id)}>
								{busy === pk.id ? <Loader2 className="spin" size={13} /> : `${pk.credit_amount.toLocaleString()} credits — ${fmtMoney(pk.price_amount, pk.currency_code)}`}
							</Button>
						))}
					</div>
				)}
			</Card>

			<div style={{ fontSize: 14, fontWeight: 600, margin: '4px 0 10px' }}>AI credit history</div>
			{ledger.isLoading ? <Loading />
				: ledger.error ? <Card><div style={{ fontSize: 13, color: 'var(--a-faint)' }}>Couldn&apos;t load credit history.</div></Card>
					: ledgerRows.length === 0 ? <Card><div style={{ fontSize: 13, color: 'var(--a-faint)' }}>No AI credit activity yet.</div></Card>
						: (
							<Card style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>
								{ledgerRows.map((r, i) => (
									<div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 16px', borderTop: i ? '1px solid var(--a-border)' : 'none' }}>
										<div>
											<div style={{ fontSize: 13, fontWeight: 500 }}>{r.display_name ?? r.description ?? r.transaction_type.replace(/_/g, ' ')}</div>
											<div style={{ fontSize: 12, color: 'var(--a-faint)' }}>{fmtISO(r.occurred_at)}</div>
										</div>
										<div style={{ fontSize: 13, fontWeight: 600, color: r.amount >= 0 ? '#3B6D11' : 'var(--a-muted)' }}>{r.amount >= 0 ? '+' : ''}{r.amount.toLocaleString()}</div>
									</div>
								))}
							</Card>
						)}

			{pastSubs.length > 0 && (
				<>
					<div style={{ fontSize: 14, fontWeight: 600, margin: '4px 0 10px' }}>Past subscriptions</div>
					<Card style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>
						{pastSubs.map((s, i) => (
							<div key={s.stripe_subscription_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 16px', borderTop: i ? '1px solid var(--a-border)' : 'none' }}>
								<div>
									<div style={{ fontSize: 13, fontWeight: 500 }}>{subLabel(s)} <span style={{ color: 'var(--a-faint)', fontWeight: 400 }}>· {s.subscription_status}</span></div>
									<div style={{ fontSize: 12, color: 'var(--a-faint)' }}>Ended {fmtISO(s.subscription_cancel_at ?? s.subscription_current_period_end)}</div>
								</div>
							</div>
						))}
					</Card>
				</>
			)}

			<div style={{ fontSize: 14, fontWeight: 600, margin: '4px 0 10px' }}>Billing history</div>
			{invoices.isLoading ? <Loading />
				: invoices.error ? <Card><div style={{ fontSize: 13, color: 'var(--a-faint)' }}>Couldn&apos;t load billing history. Please try again.</div></Card>
					: rows.length === 0 ? <Card><div style={{ fontSize: 13, color: 'var(--a-faint)' }}>No invoices yet.</div></Card>
						: (
							<Card style={{ padding: 0, overflow: 'hidden' }}>
								{rows.map((inv, i) => (
									<div key={inv.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 16px', borderTop: i ? '1px solid var(--a-border)' : 'none' }}>
										<div>
											<div style={{ fontSize: 13, fontWeight: 500 }}>{fmtMoney(inv.amount_paid, inv.currency)} <span style={{ color: 'var(--a-faint)', fontWeight: 400 }}>· {inv.status ?? '—'}</span></div>
											<div style={{ fontSize: 12, color: 'var(--a-faint)' }}>{fmtDate(inv.created)}{inv.number ? ` · ${inv.number}` : ''}</div>
										</div>
										{inv.hosted_invoice_url && <a href={inv.hosted_invoice_url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--a-navy)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>View <ExternalLink size={12} /></a>}
									</div>
								))}
							</Card>
						)}
		</div>
	);
}
