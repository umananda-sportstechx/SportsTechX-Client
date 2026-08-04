'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { useRouter } from 'next/navigation';
import { Loader2, ArrowLeft, ExternalLink } from 'lucide-react';
import { apiRequest } from '@/lib/query-client';
import { useUserProfile, getUserType } from '@/hooks/use-user-profile';
import { Brand } from '@/components/ui/brand';
import { Card, Button, Badge, Loading } from '@/components/atlas/kit';

/**
 * Plan & billing — reachable by every plan (not gated to raise). Shows the
 * current plan, lets the user manage/cancel via the Stripe customer portal,
 * upgrade to another plan (real Checkout), and view past invoices.
 */
const PLAN: Record<string, { label: string; price: string }> = {
	free: { label: 'Free', price: '€0' },
	general: { label: 'General', price: '€500 / year' },
	raise: { label: 'Raise', price: '€600 / year' },
	scout: { label: 'Scout', price: '€2,500 / year' },
	growth: { label: 'General (legacy)', price: '—' },
	pro: { label: 'Raise (legacy)', price: '—' },
};
const UPGRADES: [string, string][] = [['general', 'General'], ['raise', 'Raise'], ['scout', 'Scout']];
interface Invoice { id: string; number: string | null; status: string | null; amount_paid: number; currency: string; created: number; hosted_invoice_url: string | null; invoice_pdf: string | null }
interface Sub { subscription_status?: string | null; is_trial?: boolean | null; current_period_end?: string | number | null }

const fmtMoney = (cents: number, ccy: string) => new Intl.NumberFormat(undefined, { style: 'currency', currency: (ccy || 'eur').toUpperCase() }).format((cents ?? 0) / 100);
const fmtDate = (unixSec: number) => new Date(unixSec * 1000).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

export default function BillingPage() {
	const router = useRouter();
	const { data: profile } = useUserProfile();
	const plan = getUserType(profile);
	const p = PLAN[plan] ?? { label: plan, price: '' };
	const sub = useSWR<Sub | null>(['/api/billing/subscription']);
	const invoices = useSWR<Invoice[]>(['/api/billing/invoices']);
	const [busy, setBusy] = useState<string | null>(null);

	const manage = async () => {
		setBusy('portal');
		try {
			const res = await apiRequest('POST', '/api/billing/portal', { return_url: window.location.href });
			if (res.ok) { const body = (await res.json()) as { url?: string }; if (body.url) { window.location.assign(body.url); return; } }
		} catch { /* fall through */ }
		setBusy(null);
	};
	const upgrade = async (target: string) => {
		setBusy(target);
		try {
			const res = await apiRequest('POST', '/api/billing/checkout', { plan: target });
			if (res.ok) { const body = (await res.json()) as { url?: string }; if (body.url) { window.location.assign(body.url); return; } }
		} catch { /* fall through */ }
		setBusy(null);
	};

	const rows = invoices.data ?? [];

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
					<Button variant="outline" size="sm" disabled={busy !== null} onClick={() => void manage()}>{busy === 'portal' ? <Loader2 className="spin" size={13} /> : 'Manage billing'}</Button>
				</div>
			</Card>

			{plan !== 'raise' && (
				<Card style={{ marginBottom: 20 }}>
					<div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Change plan</div>
					<p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--a-muted)' }}>Upgrade to unlock more of SportsTechX.</p>
					<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
						{UPGRADES.filter(([k]) => k !== plan).map(([k, label]) => (
							<Button key={k} size="sm" variant={k === 'raise' ? 'primary' : 'outline'} disabled={busy !== null} onClick={() => void upgrade(k)}>
								{busy === k ? <Loader2 className="spin" size={13} /> : `${label} — ${PLAN[k].price}`}
							</Button>
						))}
					</div>
				</Card>
			)}

			<div style={{ fontSize: 14, fontWeight: 600, margin: '4px 0 10px' }}>Billing history</div>
			{invoices.isLoading ? <Loading />
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
